# MedSync Patient Mobile App

A high-performance, patient-first native mobile application built with React Native (0.74), Expo (SDK 51), and Expo Router v3. Designed with a sleek **MedSync Royal Blue Glassmorphic UI**, hardware-backed biometric security (Face ID / Fingerprint), and a Payment-App style Universal QR Scanner.

---

## 🌟 Key Features

1. **Patient-Exclusive Vault**:
   - Strictly focused on the Patient experience. Non-patient roles (Doctors, Pharmacies, Hospitals, Admins) are directed to the desktop provider web portal.
2. **MedSync Blue Glassmorphism**:
   - Modern frosted glass card surfaces, vibrant Royal Blue (`#2563EB`) branding, status badges, and ambient glow.
3. **Payment-App Style Universal QR Scanner**:
   - Continuous auto-focus camera view.
   - Reticle with 4 glowing corner brackets and animated vertical laser beam.
   - Torch / Flashlight toggle and gallery screenshot picker.
   - Auto-detection:
     - **Pharmacy QR**: Instant pharmacy details card with one-tap medicine ordering.
     - **Polygon Blockchain QR**: Live cryptographic ledger proof verification.
     - **Prescription QR**: Decodes diagnosis, medicines, and issue timestamp.
   - **My Health QR**: Patient's personal verified health passport QR code for counter scanning.
4. **Persistent Session & Biometrics**:
   - `expo-secure-store` hardware encryption (Keychain / Keystore).
   - Silent token refresh interceptor on 401.
   - Phone's native Face ID / Fingerprint biometrics via `expo-local-authentication`.
5. **Complete Web Parity**:
   - **Home**: Dynamic time-of-day greeting, live vitals strip, Emergency SOS broadcast, next appointment countdown, quick action grid.
   - **Records**: Searchable EHR files with 6-digit PIN download, encrypted file upload, doctor permissions management.
   - **Prescriptions & Orders**: Complete diagnosis, medication dosage schedules, Prescription QR pass, and live medicine order delivery tracking.
   - **Visits**: Hospital/doctor filtering, instant appointment slot booking with PIN confirmation, appointment cancellation.
   - **Pulse AI**: Streaming LLM chat, symptom triage, pre-set prompt chips, and medical vision scan analysis (`/ai/analyze-image`).
   - **Profile**: Demographics, allergies, emergency contact tap-to-call, 6-digit PIN enrollment/reset with password.

---

## 🚀 Development with Expo Go

Start the development server:

```bash
cd apps/mobile
pnpm start
# or
npx expo start
```

- Open the **Expo Go** app on your physical Android or iOS device.
- Scan the terminal QR code to load the app with live hot reloading.

---

## 📦 Building Standalone Android APK (No Expo Go Required)

To build a standalone `.apk` that can be directly installed on any Android device:

```bash
cd apps/mobile

# 1. Install EAS CLI globally if not already installed
npm install -g eas-cli

# 2. Log in to your Expo account
eas login

# 3. Build standalone APK for internal distribution
eas build --platform android --profile preview
```

When the build completes, EAS provides a direct download URL for the `.apk` file that you can install directly on any Android smartphone.

To build a Google Play production App Bundle (`.aab`):
```bash
eas build --platform android --profile production
```

---

## ⚡ Automatic Production Updates (EAS Update)

EAS Update allows deploying JavaScript, UI, and asset updates over-the-air (OTA) directly to installed apps without requiring users to reinstall the APK.

### Manual OTA Update Publish:
```bash
cd apps/mobile
eas update --channel production --message "Update patient dashboard and vitals"
```

### Automated CI/CD via GitHub Actions:
The repository includes `.github/workflows/mobile-eas-update.yml` which automatically publishes updates when code is pushed to `main` with changes under `apps/mobile/**`.

### What can be updated Over-The-Air vs. New APK Build:

| Update Type | Can Update via EAS Update (OTA)? | Requires Rebuilding APK? |
|---|---|---|
| UI Layout, colors, React Native screens, styles | ✅ **Yes (Instant OTA)** | ❌ No |
| Bug fixes, logic, API calls, schemas | ✅ **Yes (Instant OTA)** | ❌ No |
| Static images, icons, bundled assets | ✅ **Yes (Instant OTA)** | ❌ No |
| New native modules with C++/Java code | ❌ No | ✅ **Yes (New APK Build)** |
| Expo SDK version upgrade | ❌ No | ✅ **Yes (New APK Build)** |
| Android permissions (`AndroidManifest.xml`) | ❌ No | ✅ **Yes (New APK Build)** |
| App Launcher Icon or package identifier | ❌ No | ✅ **Yes (New APK Build)** |
