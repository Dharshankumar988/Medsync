"""Supabase security policies

Revision ID: a7f3c2d8e9b1
Revises: 4563cc017e22
Create Date: 2026-07-08 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "a7f3c2d8e9b1"
down_revision: Union[str, Sequence[str], None] = "4563cc017e22"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _execute_statements(statements: list[str]) -> None:
    for statement in statements:
        op.execute(statement)


def upgrade() -> None:
    statements = [
        """
        create or replace function public.current_supabase_user_id()
        returns uuid
        language sql
        stable
        as $$
          select auth.uid();
        $$;
        """,
        """
        create or replace function public.current_supabase_role()
        returns text
        language sql
        stable
        as $$
          select coalesce(
            nullif(lower(auth.jwt() -> 'app_metadata' ->> 'role'), ''),
            nullif(lower(auth.jwt() -> 'user_metadata' ->> 'role'), ''),
            nullif(lower(auth.role()), '')
          );
        $$;
        """,
        """
        create or replace function public.is_medsync_admin()
        returns boolean
        language sql
        stable
        as $$
          select public.current_supabase_role() = 'admin';
        $$;
        """,
        """
        create or replace function public.can_access_medical_record(record_uuid uuid)
        returns boolean
        language sql
        stable
        security definer
        set search_path = public
        as $$
          select
            public.is_medsync_admin()
            or exists (
              select 1
              from public.medical_records medical_records
              where medical_records.id = record_uuid
                and (
                  medical_records.patient_id = public.current_supabase_user_id()
                  or medical_records.uploaded_by = public.current_supabase_user_id()
                  or exists (
                    select 1
                    from public.record_permissions record_permissions
                    where record_permissions.record_id = record_uuid
                      and record_permissions.granted_to = public.current_supabase_user_id()
                      and record_permissions.is_revoked = false
                      and (record_permissions.expires_at is null or record_permissions.expires_at > now())
                  )
                )
            );
        $$;
        """,
        """
        create or replace function public.storage_object_owner(object_name text)
        returns boolean
        language sql
        stable
        as $$
          select
            public.is_medsync_admin()
            or (
              object_name like 'patients/%/records/%'
              and split_part(object_name, '/', 2) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
              and split_part(object_name, '/', 2)::uuid = public.current_supabase_user_id()
            );
        $$;
        """,
        "alter table public.medical_records enable row level security;",
        "alter table public.medical_record_versions enable row level security;",
        "alter table public.file_metadata enable row level security;",
        "alter table public.record_permissions enable row level security;",
        "alter table public.doctor_notes enable row level security;",
        "alter table storage.objects enable row level security;",
        "drop policy if exists medical_records_select_own on public.medical_records;",
        "drop policy if exists medical_records_insert_own on public.medical_records;",
        "drop policy if exists medical_records_update_own on public.medical_records;",
        "drop policy if exists medical_records_delete_own on public.medical_records;",
        "create policy medical_records_select_own on public.medical_records for select using (public.can_access_medical_record(id));",
        "create policy medical_records_insert_own on public.medical_records for insert with check (public.is_medsync_admin() or patient_id = public.current_supabase_user_id() or uploaded_by = public.current_supabase_user_id());",
        "create policy medical_records_update_own on public.medical_records for update using (public.can_access_medical_record(id)) with check (public.can_access_medical_record(id));",
        "create policy medical_records_delete_own on public.medical_records for delete using (public.is_medsync_admin() or uploaded_by = public.current_supabase_user_id() or patient_id = public.current_supabase_user_id());",
        "drop policy if exists medical_record_versions_select_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_insert_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_update_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_delete_own on public.medical_record_versions;",
        "create policy medical_record_versions_select_own on public.medical_record_versions for select using (public.can_access_medical_record(record_id));",
        "create policy medical_record_versions_insert_own on public.medical_record_versions for insert with check (public.can_access_medical_record(record_id));",
        "create policy medical_record_versions_update_own on public.medical_record_versions for update using (public.can_access_medical_record(record_id)) with check (public.can_access_medical_record(record_id));",
        "create policy medical_record_versions_delete_own on public.medical_record_versions for delete using (public.can_access_medical_record(record_id));",
        "drop policy if exists file_metadata_select_own on public.file_metadata;",
        "drop policy if exists file_metadata_insert_own on public.file_metadata;",
        "drop policy if exists file_metadata_update_own on public.file_metadata;",
        "drop policy if exists file_metadata_delete_own on public.file_metadata;",
        "create policy file_metadata_select_own on public.file_metadata for select using (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = file_metadata.version_id and public.can_access_medical_record(medical_record_versions.record_id)));",
        "create policy file_metadata_insert_own on public.file_metadata for insert with check (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = file_metadata.version_id and public.can_access_medical_record(medical_record_versions.record_id)));",
        "create policy file_metadata_update_own on public.file_metadata for update using (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = file_metadata.version_id and public.can_access_medical_record(medical_record_versions.record_id))) with check (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = file_metadata.version_id and public.can_access_medical_record(medical_record_versions.record_id)));",
        "create policy file_metadata_delete_own on public.file_metadata for delete using (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = file_metadata.version_id and public.can_access_medical_record(medical_record_versions.record_id)));",
        "drop policy if exists record_permissions_select_own on public.record_permissions;",
        "drop policy if exists record_permissions_insert_own on public.record_permissions;",
        "drop policy if exists record_permissions_update_own on public.record_permissions;",
        "drop policy if exists record_permissions_delete_own on public.record_permissions;",
        "create policy record_permissions_select_own on public.record_permissions for select using (public.can_access_medical_record(record_id) or granted_to = public.current_supabase_user_id() or granted_by = public.current_supabase_user_id());",
        "create policy record_permissions_insert_own on public.record_permissions for insert with check (public.is_medsync_admin() or granted_by = public.current_supabase_user_id() or exists (select 1 from public.medical_records medical_records where medical_records.id = record_permissions.record_id and (medical_records.patient_id = public.current_supabase_user_id() or medical_records.uploaded_by = public.current_supabase_user_id())));",
        "create policy record_permissions_update_own on public.record_permissions for update using (public.is_medsync_admin() or granted_by = public.current_supabase_user_id() or exists (select 1 from public.medical_records medical_records where medical_records.id = record_permissions.record_id and (medical_records.patient_id = public.current_supabase_user_id() or medical_records.uploaded_by = public.current_supabase_user_id()))) with check (public.is_medsync_admin() or granted_by = public.current_supabase_user_id() or exists (select 1 from public.medical_records medical_records where medical_records.id = record_permissions.record_id and (medical_records.patient_id = public.current_supabase_user_id() or medical_records.uploaded_by = public.current_supabase_user_id())));",
        "create policy record_permissions_delete_own on public.record_permissions for delete using (public.is_medsync_admin() or granted_by = public.current_supabase_user_id() or exists (select 1 from public.medical_records medical_records where medical_records.id = record_permissions.record_id and (medical_records.patient_id = public.current_supabase_user_id() or medical_records.uploaded_by = public.current_supabase_user_id())));",
        "drop policy if exists doctor_notes_select_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_insert_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_update_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_delete_own on public.doctor_notes;",
        "create policy doctor_notes_select_own on public.doctor_notes for select using (exists (select 1 from public.medical_record_versions medical_record_versions where medical_record_versions.id = doctor_notes.version_id and public.can_access_medical_record(medical_record_versions.record_id)));",
        "create policy doctor_notes_insert_own on public.doctor_notes for insert with check ((doctor_id = public.current_supabase_user_id() and public.current_supabase_role() = 'doctor') or public.is_medsync_admin());",
        "create policy doctor_notes_update_own on public.doctor_notes for update using ((doctor_id = public.current_supabase_user_id()) or public.is_medsync_admin()) with check ((doctor_id = public.current_supabase_user_id()) or public.is_medsync_admin());",
        "create policy doctor_notes_delete_own on public.doctor_notes for delete using ((doctor_id = public.current_supabase_user_id()) or public.is_medsync_admin());",
        "drop policy if exists storage_objects_select_own on storage.objects;",
        "drop policy if exists storage_objects_insert_own on storage.objects;",
        "drop policy if exists storage_objects_update_own on storage.objects;",
        "drop policy if exists storage_objects_delete_own on storage.objects;",
        "create policy storage_objects_select_own on storage.objects for select using (bucket_id = 'medical-records' and public.storage_object_owner(name));",
        "create policy storage_objects_insert_own on storage.objects for insert with check (bucket_id = 'medical-records' and public.storage_object_owner(name));",
        "create policy storage_objects_update_own on storage.objects for update using (bucket_id = 'medical-records' and public.storage_object_owner(name)) with check (bucket_id = 'medical-records' and public.storage_object_owner(name));",
        "create policy storage_objects_delete_own on storage.objects for delete using (bucket_id = 'medical-records' and public.storage_object_owner(name));",
    ]

    _execute_statements(statements)


def downgrade() -> None:
    statements = [
        "drop policy if exists storage_objects_delete_own on storage.objects;",
        "drop policy if exists storage_objects_update_own on storage.objects;",
        "drop policy if exists storage_objects_insert_own on storage.objects;",
        "drop policy if exists storage_objects_select_own on storage.objects;",
        "alter table storage.objects disable row level security;",
        "drop policy if exists doctor_notes_delete_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_update_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_insert_own on public.doctor_notes;",
        "drop policy if exists doctor_notes_select_own on public.doctor_notes;",
        "alter table public.doctor_notes disable row level security;",
        "drop policy if exists record_permissions_delete_own on public.record_permissions;",
        "drop policy if exists record_permissions_update_own on public.record_permissions;",
        "drop policy if exists record_permissions_insert_own on public.record_permissions;",
        "drop policy if exists record_permissions_select_own on public.record_permissions;",
        "alter table public.record_permissions disable row level security;",
        "drop policy if exists file_metadata_delete_own on public.file_metadata;",
        "drop policy if exists file_metadata_update_own on public.file_metadata;",
        "drop policy if exists file_metadata_insert_own on public.file_metadata;",
        "drop policy if exists file_metadata_select_own on public.file_metadata;",
        "alter table public.file_metadata disable row level security;",
        "drop policy if exists medical_record_versions_delete_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_update_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_insert_own on public.medical_record_versions;",
        "drop policy if exists medical_record_versions_select_own on public.medical_record_versions;",
        "alter table public.medical_record_versions disable row level security;",
        "drop policy if exists medical_records_delete_own on public.medical_records;",
        "drop policy if exists medical_records_update_own on public.medical_records;",
        "drop policy if exists medical_records_insert_own on public.medical_records;",
        "drop policy if exists medical_records_select_own on public.medical_records;",
        "alter table public.medical_records disable row level security;",
        "drop function if exists public.storage_object_owner(text);",
        "drop function if exists public.can_access_medical_record(uuid);",
        "drop function if exists public.is_medsync_admin();",
        "drop function if exists public.current_supabase_role();",
        "drop function if exists public.current_supabase_user_id();",
    ]

    _execute_statements(statements)