# MedSync Frontend (Next.js 15)

The frontend web application provides a stunning, premium user interface for Patients, Doctors, Pharmacies, and Admins to interact with the MedSync ecosystem.

## 🏗️ Technology Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS & Framer Motion
- **Components**: shadcn/ui & Radix UI
- **State/Fetching**: TanStack React Query (v5) & Axios
- **Forms**: React Hook Form + Zod

## 📂 Folder Structure

```
apps/web/
├── app/                  # Next.js App Router pages and layouts
│   ├── (auth)/           # Login and Registration flows
│   ├── (dashboard)/      # Role-protected dashboards (patient, doctor, etc.)
│   └── globals.css       # Tailwind base styles
├── components/           # Reusable UI components
│   ├── layout/           # Sidebars, Navbars
│   └── ui/               # shadcn/ui base components
├── lib/                  # Utilities (Tailwind cn merge, generic helpers)
├── providers/            # React Query and Theme Context Providers
└── services/             # Axios API wrappers (auth.service, patient.service)
```

## 🎨 Theming & UX

The app utilizes `next-themes` to support full system-level Light/Dark mode toggling. The design prioritizes "glassmorphism", subtle micro-animations via `framer-motion`, and a cohesive primary color palette tailored for modern healthcare.

## 🔒 Secure API Layer

All external API calls go through `lib/api.ts`. This custom Axios instance automatically retrieves the JWT from `localStorage` and injects it as a `Bearer` token. It globally intercepts `401 Unauthorized` responses and forcibly logs the user out.

## 🚀 Running Locally

```bash
cd apps/web
npm install
npm run dev
```
Access the application at `http://localhost:3000`.
