# Backend Type Safety and Model Schema Guardrails

## 1. No Untyped Response Models (`APIResponse[dict]`)
- **NEVER** declare an endpoint with `response_model=APIResponse[dict]` or `response_model=APIResponse[list[dict]]`.
- Always define explicit Pydantic schemas in `app/schemas/` (e.g., `app/schemas/admin.py`, `app/schemas/profile.py`, etc.).
- Configure Pydantic schemas with `model_config = ConfigDict(use_enum_values=True)` so that Enums are serialized automatically to JSON-compatible strings.
- Pass validated Pydantic model instances to `APIResponse(data=...)` to catch schema mismatches before sending responses.

## 2. Model Attribute Consistency and Aliases
Healthcare profile models in MedSync have varying attribute names for contacts and types:
- **Patient**: primary column `phone_number` (aliased to `contact_number`)
- **Doctor**: primary column `clinic_phone` (aliased to `phone_number` and `contact_number`)
- **Pharmacy**: primary column `contact_number` (aliased to `phone_number`)
- **Hospital**: primary column `phone_number` (aliased to `contact_number`), primary column `type` (aliased to `hospital_type`)

**Rule:**
- When adding new models or modifying existing ones, always check `app/models/` for exact column declarations.
- Maintain the defensive `@property` aliases on models to prevent cross-entity attribute mismatches.

## 3. Safe Enum Serialization and Comparisons
- All Enums in models and schemas MUST inherit from `(str, enum.Enum)`.
- Never compare SQLAlchemy Enum columns to raw string literals unless verified against the enum class (e.g., use `User.role == UserRole.ADMIN`, not arbitrary strings).
- When serializing Enums manually into dictionaries, always extract `.value` or let Pydantic handle it via `use_enum_values=True`.

## 4. Defensive / Scoped Imports for Optional & Platform-Specific Dependencies
- Native C-extension libraries (such as `web3`, `eth-account`, `cryptography`) may not compile or be installed in all environments (e.g. Windows ARM64 local dev with `venv_dev`).
- **NEVER** import `web3`, `blockchain_client`, or `blockchain_gateway` at the top level of API route files.
- Always use scoped imports inside the specific handler function or guard them with try/except fallback to mock mode.

## 5. Mandatory Verification
Before finalizing any backend modifications:
- Run the schema integrity test suite:
  ```bash
  pytest tests/test_model_schema_integrity.py tests/api/test_admin_graph.py
  ```
