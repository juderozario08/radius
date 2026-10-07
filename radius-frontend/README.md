# Radius mobile app

Radius is an Expo SDK 54 app for retail inventory, order fulfillment, receiving, and store operations. Transaction history is read-only for staff; checkout is not part of the mobile app.

## Local setup

Use Node.js 22 or newer. From `radius-frontend`, install dependencies with `npm ci`, copy `.env.example` to `.env`, and set `EXPO_PUBLIC_API_URL` to a backend URL reachable from your device or emulator. A physical phone cannot reach a backend running on your computer through `localhost`; use the computer's LAN address and keep the phone on the same network.

Start the app with `npx expo start`. Use `npm run android` or `npm run ios` for a local native build. The backend and its PostgreSQL database must be running for authenticated screens to work.

## Checks and release builds

Run `npx tsc --noEmit`, `npm run lint`, `npm test`, and `npx expo-doctor` before building. CocoaPods is required for local iOS native builds on macOS.

Use `eas build --profile preview --platform android` for an internal APK. The production profile creates an Android App Bundle and uses remote app-version increments. Before submitting a store build, set permanent iOS and Android application identifiers in `app.json`, configure EAS credentials, and complete the store listings. Store submission is currently manual; `eas.json` has no store-account submit credentials.
