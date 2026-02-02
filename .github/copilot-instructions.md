# Instalog - Copilot Instructions

## Project Overview
Instalog is a React Native iOS app focused on **momentum preservation** - instantly logging accomplishments without stopping your day.

## Core Principles
- **Zero-decision capture**: Logging must require no decisions at capture time
- **Buckets are optional**: Never required when logging
- **No analytics/streaks/tracking**: Keep it calm and lightweight
- **Fast and simple**: Every interaction should feel instant

## Tech Stack
- React Native (TypeScript)
- iOS only
- AsyncStorage for local-first storage (can upgrade to MMKV later)
- Zustand for state management
- React Navigation for routing

## Data Models
```typescript
interface LogEntry {
  id: string;
  timestamp: Date;
  text?: string | null;
  bucketId?: string | null;
  dateKey: string; // YYYY-MM-DD
}

interface Bucket {
  id: string;
  name: string;
}
```

## App Structure
- **Instalog Screen**: Single primary button to capture a log
- **Today Screen**: Simple list of today's logs
- **Wrap Up Screen**: Swipe logs into optional buckets

## Key Functions
- `instalog()`: Core function to create and save a log entry
  - Must be callable from native modules (iOS Widget, Siri Shortcut)
  - Located in `src/utils/instalog.ts`

## Code Guidelines
- Keep components minimal and focused
- No extra features beyond the 3 screens
- Prefer simplicity over abstraction
- All date handling uses YYYY-MM-DD dateKey format
