# Coding Standards

## 1. Python (FastAPI)
- Formatting: Use `black` (line length 88) and `isort`.
- Typing: Strict type hinting is required for all functions and Pydantic models.
- Naming: `snake_case` for variables/functions, `PascalCase` for Classes.
- Docstrings: Use Google-style docstrings for complex business logic (e.g., AI inference pipelines).

## 2. TypeScript (Next.js & Expo)
- Formatting: Use `prettier` and `eslint`.
- Typing: Avoid `any`. Use `Interfaces` for object shapes and `Types` for unions/intersections.
- Components: Use Functional Components with React Hooks.
- Naming: `PascalCase` for files exporting React Components (e.g., `Button.tsx`). `kebab-case` or `camelCase` for utilities (e.g., `auth.service.ts`).

## 3. Solidity
- Naming: Follow the official Solidity style guide (`PascalCase` for contracts, `camelCase` for functions/variables).
- Security: Always inherit from OpenZeppelin when applicable (e.g., `AccessControl`). Avoid custom cryptography.
