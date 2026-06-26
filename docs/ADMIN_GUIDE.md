# Admin & Security Guide

## Administrator Responsibilities
Admins are responsible for maintaining the integrity of the MedSync ecosystem.
1. **Verification**: Doctors and Pharmacies cannot utilize the system until an Admin verifies their real-world medical licenses and institution credentials.
2. **Audit Logs**: Monitor system access logs. If a malicious actor attempts to access unauthorized medical records, it is flagged here.
3. **Blockchain Health**: Ensure the Backend server wallet has sufficient MATIC to pay for gas fees when hashing medical records.

## Security Posture
- **Passwords**: Hashed via `bcrypt`.
- **JWT**: Stateless authentication with short expiration times. Mobile apps use `expo-secure-store` to prevent token theft.
- **RBAC**: Strict Role-Based Access Control enforced at the FastAPI Router level.
- **Decentralization**: Medical files are never stored directly on the blockchain, only their hashes. This prevents PII (Personally Identifiable Information) from being public, maintaining HIPAA compliance while preserving mathematical immutability.
