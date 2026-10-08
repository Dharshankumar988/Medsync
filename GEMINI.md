# MedSync AI Agent Guidelines & Architecture Rules

## Backend Development Standards (`apps/backend`)

### 1. Type Safety & Response Schemas
- Never declare FastAPI endpoints with `response_model=APIResponse[dict]` or `APIResponse[list[dict]]`.
- Always define typed Pydantic models in `app/schemas/` with `model_config = ConfigDict(use_enum_values=True)`.
- Construct and return validated Pydantic models to guarantee contract correctness and catch attribute typos.

### 2. SQLAlchemy Model Column Contracts & Defensive Aliases
- Entity contact columns differ across models:
  - `Patient`: `phone_number` (aliased to `contact_number`)
  - `Doctor`: `clinic_phone` (aliased to `phone_number`, `contact_number`)
  - `Pharmacy`: `contact_number` (aliased to `phone_number`)
  - `Hospital`: `phone_number` (aliased to `contact_number`), `type` (aliased to `hospital_type`)
- Never guess model attributes; verify against `app/models/`.
- Preserve the defensive property aliases on models.

### 3. Enum Safety
- All Enums must inherit from `(str, enum.Enum)`.
- Use enum members (e.g. `UserRole.ADMIN`) for SQLAlchemy queries.
- Ensure enums are serialized via Pydantic or `.value` extraction.

### 4. Optional Native Dependencies & Safe Imports
- Do not import `web3` or blockchain singletons at the module top-level of route modules.
- Use scoped imports inside endpoint functions to allow running in environments without native C-extensions.

### 5. Verification Command
- Run integrity tests on backend changes:
  ```powershell
  cd apps/backend
  venv_dev\Scripts\pytest.exe tests/test_model_schema_integrity.py tests/api/test_admin_graph.py
  ```
