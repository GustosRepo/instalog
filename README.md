# Instalog

**Momentum preservation through instant logging.**

Instalog is a React Native iOS app that lets you instantly log accomplishments without stopping your day. No decisions at capture time, no required organization, just fast and calm momentum tracking.

## Features

- **Instalog Screen**: One-tap logging with optional text
- **Today Screen**: View all logs from today
- **Wrap Up Screen**: End-of-day bucket assignment (swipe to sort)

## Tech Stack

- React Native (TypeScript)
- iOS only
- AsyncStorage for local-first persistence
- Zustand for state management
- React Navigation with bottom tabs

## Project Structure

```
src/
├── models/          # TypeScript types (LogEntry, Bucket)
├── storage/         # AsyncStorage persistence layer
├── stores/          # Zustand state management
├── screens/         # React components for each screen
├── navigation/      # React Navigation setup
└── utils/           # Core functions including instalog()
```

## Getting Started

### Prerequisites

- Node.js 18+
- Xcode 15+
- CocoaPods

### Installation

```sh
# Install dependencies
npm install

# Install iOS pods
cd ios && pod install && cd ..
```

### Running the App

```sh
# Start Metro bundler
npm start

# Run on iOS (in a new terminal)
npm run ios
```

## Core Concept

The `instalog()` function is the heart of the app - designed for zero-decision capture:

```typescript
import { instalog } from './src/utils/instalog';

// Quick log - no text needed
instalog();

// Log with optional text
instalog({ text: 'Finished the report' });
```

This function is structured to be callable from iOS native modules (Widget, Siri Shortcut) in the future.

## Data Model

```typescript
interface LogEntry {
  id: string;
  timestamp: string;    // ISO date string
  text?: string | null;
  bucketId?: string | null;
  dateKey: string;      // YYYY-MM-DD
}

interface Bucket {
  id: string;
  name: string;
}
```

## Product Principles

- **Zero-decision capture**: Logging requires no decisions
- **Buckets are optional**: Never required at log time
- **No analytics**: No streaks, no habit tracking
- **Fast and calm**: Every interaction feels instant

For more information, please visit [CocoaPods Getting Started guide](https://guides.cocoapods.org/using/getting-started.html).

```sh
# Using npm
npm run ios

# OR using Yarn
yarn ios
```

If everything is set up correctly, you should see your new app running in the Android Emulator, iOS Simulator, or your connected device.

This is one way to run your app — you can also build it directly from Android Studio or Xcode.

## Step 3: Modify your app

Now that you have successfully run the app, let's make changes!

Open `App.tsx` in your text editor of choice and make some changes. When you save, your app will automatically update and reflect these changes — this is powered by [Fast Refresh](https://reactnative.dev/docs/fast-refresh).

When you want to forcefully reload, for example to reset the state of your app, you can perform a full reload:

- **Android**: Press the <kbd>R</kbd> key twice or select **"Reload"** from the **Dev Menu**, accessed via <kbd>Ctrl</kbd> + <kbd>M</kbd> (Windows/Linux) or <kbd>Cmd ⌘</kbd> + <kbd>M</kbd> (macOS).
- **iOS**: Press <kbd>R</kbd> in iOS Simulator.

## Congratulations! :tada:

You've successfully run and modified your React Native App. :partying_face:

### Now what?

- If you want to add this new React Native code to an existing application, check out the [Integration guide](https://reactnative.dev/docs/integration-with-existing-apps).
- If you're curious to learn more about React Native, check out the [docs](https://reactnative.dev/docs/getting-started).

# Troubleshooting

If you're having issues getting the above steps to work, see the [Troubleshooting](https://reactnative.dev/docs/troubleshooting) page.

# Learn More

To learn more about React Native, take a look at the following resources:

- [React Native Website](https://reactnative.dev) - learn more about React Native.
- [Getting Started](https://reactnative.dev/docs/environment-setup) - an **overview** of React Native and how setup your environment.
- [Learn the Basics](https://reactnative.dev/docs/getting-started) - a **guided tour** of the React Native **basics**.
- [Blog](https://reactnative.dev/blog) - read the latest official React Native **Blog** posts.
- [`@facebook/react-native`](https://github.com/facebook/react-native) - the Open Source; GitHub **repository** for React Native.
