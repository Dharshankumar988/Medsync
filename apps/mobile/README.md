# MedSync Mobile (React Native / Expo)

The MedSync mobile app brings decentralized healthcare directly to patients' and doctors' pockets. Built with Expo and Expo Router, it provides a native-feeling experience across both iOS and Android.

## 🏗️ Technology Stack

- **Framework**: React Native + Expo
- **Navigation**: Expo Router (File-based routing)
- **State/Fetching**: TanStack React Query & Axios
- **Security**: Expo Secure Store
- **UI/Animations**: React Native Reanimated & Gesture Handler

## 📂 Folder Structure

```
apps/mobile/
├── app/                  # Expo Router navigation tree
│   ├── (auth)/           # Login screens
│   ├── (tabs)/           # Bottom tab navigators for roles
│   └── _layout.tsx       # Root stack and Auth provider
├── components/           # Reusable native UI components (Cards, Buttons)
├── providers/            # React Query Provider
├── services/             # Axios API wrappers
└── utils/                # API client with SecureStore interceptors
```

## 🔒 Security (Expo Secure Store)

Unlike the web application which uses `localStorage`, the mobile application leverages `expo-secure-store`. This ensures that JWT authentication tokens are encrypted and stored in the device's native Keychain (iOS) or Keystore (Android).

## 🧭 Role-Based Navigation

The application uses dynamic tab rendering. If a Patient logs in, they are routed to `(tabs)/patient` containing their Appointments and AI Chat. If a Doctor logs in, they are routed to `(tabs)/doctor` containing their queue and analysis tools.

## 🚀 Running Locally

```bash
cd apps/mobile
npm install
npx expo start
```
Scan the QR code with **Expo Go** on your physical device, or press `i` to boot the iOS Simulator.
