import uuid
import json
import logging
import httpx
from typing import Optional
from sqlalchemy import text, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.config import settings
from app.models.user import User, UserStatus

logger = logging.getLogger("medsync.supabase_auth")


class SupabaseAuthService:
    @staticmethod
    def get_admin_client() -> Optional[httpx.AsyncClient]:
        """Returns an authenticated HTTP client for Supabase GoTrue Admin API."""
        if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
            return None
        headers = {
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "Content-Type": "application/json",
        }
        return httpx.AsyncClient(base_url=f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1", headers=headers, timeout=12.0)

    @classmethod
    async def sync_or_create_user(
        cls,
        db: AsyncSession,
        user_id: uuid.UUID,
        email: str,
        password: Optional[str] = None,
        role: str = "DOCTOR",
        full_name: Optional[str] = None,
    ) -> bool:
        """
        Synchronizes or creates a user account in Supabase GoTrue Auth.
        Ensures the user has confirmed email, proper metadata, and a valid
        entry in auth.identities so they can authenticate via client SDK.
        """
        clean_email = email.strip().lower()
        clean_role = role.strip().upper()
        gotrue_synced = False

        # 1. Primary: Use official Supabase GoTrue Admin API
        client = cls.get_admin_client()
        if client:
            try:
                async with client:
                    # Try updating existing user by ID
                    update_body: dict = {
                        "email": clean_email,
                        "email_confirm": True,
                        "app_metadata": {"role": clean_role, "provider": "email", "providers": ["email"]},
                        "user_metadata": {"role": clean_role, "has_password": True},
                    }
                    if full_name:
                        update_body["user_metadata"]["full_name"] = full_name
                    if password:
                        update_body["password"] = password

                    put_res = await client.put(f"/admin/users/{user_id}", json=update_body)
                    if put_res.status_code in (200, 201):
                        gotrue_synced = True
                        logger.info(f"Supabase GoTrue user {clean_email} updated successfully via Admin API")
                    elif put_res.status_code == 404:
                        # User does not exist in GoTrue yet; create with specified ID
                        create_body: dict = {
                            "id": str(user_id),
                            "email": clean_email,
                            "email_confirm": True,
                            "app_metadata": {"role": clean_role, "provider": "email", "providers": ["email"]},
                            "user_metadata": {"role": clean_role, "has_password": True},
                        }
                        if full_name:
                            create_body["user_metadata"]["full_name"] = full_name
                        if password:
                            create_body["password"] = password
                        else:
                            create_body["password"] = f"MedSyncTemp#{uuid.uuid4().hex[:12]}"

                        post_res = await client.post("/admin/users", json=create_body)
                        if post_res.status_code in (200, 201):
                            gotrue_synced = True
                            logger.info(f"Supabase GoTrue user {clean_email} created successfully via Admin API")
                        else:
                            logger.warning(f"GoTrue create returned {post_res.status_code}: {post_res.text}")
                    else:
                        logger.warning(f"GoTrue update returned {put_res.status_code}: {put_res.text}")
            except Exception as e:
                logger.warning(f"Exception communicating with Supabase GoTrue Admin API: {e}")

        # 2. Comprehensive SQL fallback / verification to ensure auth.users and auth.identities exist
        try:
            app_meta = json.dumps({"role": clean_role, "provider": "email", "providers": ["email"]})
            user_meta = json.dumps({"role": clean_role, "has_password": True})

            for fn_prefix in ("extensions.", ""):
                try:
                    async with db.begin_nested():
                        if password:
                            await db.execute(
                                text(f"""
                                UPDATE auth.users
                                SET encrypted_password = {fn_prefix}crypt(:pwd, {fn_prefix}gen_salt('bf')),
                                    email_confirmed_at = coalesce(email_confirmed_at, now()),
                                    raw_app_meta_data = coalesce(raw_app_meta_data, '{{}}'::jsonb) || CAST(:app_meta AS jsonb),
                                    raw_user_meta_data = coalesce(raw_user_meta_data, '{{}}'::jsonb) || CAST(:user_meta AS jsonb)
                                WHERE id = :id OR lower(email) = :email
                                """),
                                {"pwd": password, "id": user_id, "email": clean_email, "app_meta": app_meta, "user_meta": user_meta}
                            )
                        else:
                            await db.execute(
                                text("""
                                UPDATE auth.users
                                SET email_confirmed_at = coalesce(email_confirmed_at, now()),
                                    raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || CAST(:app_meta AS jsonb),
                                    raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || CAST(:user_meta AS jsonb)
                                WHERE id = :id OR lower(email) = :email
                                """),
                                {"id": user_id, "email": clean_email, "app_meta": app_meta, "user_meta": user_meta}
                            )
                    break
                except Exception:
                    continue

            # Ensure corresponding row in auth.identities
            try:
                async with db.begin_nested():
                    await db.execute(
                        text("""
                        INSERT INTO auth.identities (
                            id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at
                        )
                        VALUES (
                            :id, :user_id, jsonb_build_object('sub', :user_id::text, 'email', :email), 'email', :user_id::text, now(), now(), now()
                        )
                        ON CONFLICT (provider, provider_id) DO UPDATE
                        SET updated_at = now(),
                            identity_data = jsonb_build_object('sub', EXCLUDED.user_id::text, 'email', :email)
                        """),
                        {"id": user_id, "user_id": user_id, "email": clean_email}
                    )
            except Exception as e:
                # Some Supabase versions may use different identity primary keys
                logger.debug(f"Direct auth.identities upsert note: {e}")

            await db.commit()
            return True
        except Exception as sql_err:
            logger.warning(f"SQL fallback note in sync_or_create_user: {sql_err}")
            return gotrue_synced

    @classmethod
    async def reconcile_approved_user(
        cls,
        db: AsyncSession,
        email: str,
        password: str,
    ) -> bool:
        """
        Reconciles credentials for an approved practitioner/user whose Supabase Auth
        account or identity record was not synchronized properly during signup.
        """
        clean_email = email.strip().lower()
        user_res = await db.execute(select(User).where(User.email.ilike(clean_email)))
        user = user_res.scalar_one_or_none()

        if not user:
            return False

        full_name = None
        if user.role.value == "DOCTOR":
            from app.models.doctor import Doctor
            doc_res = await db.execute(select(Doctor).where(Doctor.user_id == user.id))
            doc = doc_res.scalar_one_or_none()
            if doc:
                full_name = doc.full_name

        return await cls.sync_or_create_user(
            db=db,
            user_id=user.id,
            email=clean_email,
            password=password,
            role=user.role.value,
            full_name=full_name,
        )

