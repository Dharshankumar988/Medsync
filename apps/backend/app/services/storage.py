import re
import uuid
import hashlib

import httpx
from fastapi import UploadFile

from app.core.config import settings


class StorageServiceError(Exception):
    pass

class StorageService:
    @staticmethod
    def _ensure_configured() -> None:
        missing = [
            name
            for name, value in (
                ("SUPABASE_URL", settings.SUPABASE_URL),
                ("SUPABASE_SERVICE_ROLE_KEY", settings.SUPABASE_SERVICE_ROLE_KEY),
            )
            if not value
        ]
        if missing:
            raise StorageServiceError(f"Supabase Storage is not configured: {', '.join(missing)}")

    @staticmethod
    def _safe_name(filename: str | None) -> str:
        cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", filename or "record.bin").strip(".-_")
        return cleaned or "record.bin"

    @staticmethod
    def _validate_upload(file: UploadFile, file_bytes: bytes) -> None:
        max_bytes = settings.SUPABASE_STORAGE_MAX_UPLOAD_MB * 1024 * 1024
        if len(file_bytes) > max_bytes:
            raise StorageServiceError(f"File exceeds maximum size of {settings.SUPABASE_STORAGE_MAX_UPLOAD_MB} MB")

        content_type = (file.content_type or "").lower()
        allowed_types = {
            "application/pdf",
            "image/png",
            "image/jpeg",
            "image/jpg",
            "application/dicom",
            "application/octet-stream",
        }
        if content_type and content_type not in allowed_types:
            raise StorageServiceError(f"Unsupported content type: {file.content_type}")

    @staticmethod
    def _object_path(patient_id: str, record_id: str, version_number: int, filename: str | None) -> str:
        safe_filename = StorageService._safe_name(filename)
        return f"patients/{patient_id}/records/{record_id}/v{version_number}/{uuid.uuid4().hex}-{safe_filename}"

    @staticmethod
    async def upload_record_file(
        file: UploadFile,
        *,
        patient_id: str,
        record_id: str,
        version_number: int,
    ) -> tuple[str, str, int, str]:
        StorageService._ensure_configured()

        file_bytes = await file.read()
        await file.seek(0)
        StorageService._validate_upload(file, file_bytes)
        file_hash = hashlib.sha256(file_bytes).hexdigest()

        object_path = StorageService._object_path(patient_id, record_id, version_number, file.filename)
        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"

        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "x-upsert": "false",
        }
        content_type = file.content_type or "application/octet-stream"

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                url,
                headers=headers,
                content=file_bytes,
            )

        if response.status_code not in (200, 201):
            raise StorageServiceError(f"Supabase upload failed: {response.status_code} {response.text}")

        return object_path, content_type, len(file_bytes), file_hash

    @staticmethod
    async def create_signed_download_url(object_path: str, expires_in: int = 300) -> str:
        StorageService._ensure_configured()

        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/sign/{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            "Content-Type": "application/json",
        }
        payload = {"expiresIn": expires_in}

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(url, headers=headers, json=payload)

        if response.status_code not in (200, 201):
            raise StorageServiceError(f"Supabase signed URL generation failed: {response.status_code} {response.text}")

        data = response.json()
        signed_url = data.get("signedURL") or data.get("signedUrl")
        if not signed_url:
            raise StorageServiceError("Supabase did not return a signed download URL")
        return signed_url

    @staticmethod
    async def download_record_file(object_path: str) -> bytes:
        StorageService._ensure_configured()

        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        }

        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.get(url, headers=headers)

        if response.status_code != 200:
            raise StorageServiceError(f"Supabase download failed: {response.status_code} {response.text}")

        return response.content

    @staticmethod
    async def delete_record_file(object_path: str) -> None:
        StorageService._ensure_configured()

        url = f"{settings.SUPABASE_URL.rstrip('/')}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{object_path}"
        headers = {
            "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        }

        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(url, headers=headers)

        if response.status_code not in (200, 204, 404):
            raise StorageServiceError(f"Supabase delete failed: {response.status_code} {response.text}")
