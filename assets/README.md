# Instalog Logo Usage Guide

## Logo Specifications

### Primary Logo
- **Filename**: `logo.png` (with @2x and @3x variants)
- **Size**: 120x120pt base (240x240px @2x, 360x360px @3x)
- **Format**: PNG with transparency
- **Colors**: Design for dark background (#0B0D10)

### Logo Mark (Icon Only)
- **Filename**: `logo-mark.png`
- **Size**: 80x80pt base
- **Usage**: Small headers, compact spaces

### Wordmark (Text Only)
- **Filename**: `logo-wordmark.png`
- **Size**: Width flexible, height 40pt
- **Usage**: Navigation headers

## Placement Guidelines

### ✅ Use Logo In:
1. **Settings Screen** - Large logo in header/about section
2. **Empty States** - When no content exists
3. **Onboarding** - First launch experience (future)

### ⚠️ Use Logo Mark In:
1. **Instalog Screen** - Small mark in top corner (non-intrusive)

### ❌ Don't Use Logo In:
- Inbox screen (focus on content)
- Wrap Up screen (focus on task)
- Review screen (focus on data)
- Widget (uses SF Symbols)
- Loading states (prefer system spinners)

## iOS Design Principles Applied

### Minimal Branding
> "The best interfaces are invisible" - Don't interrupt the user's flow

### Strategic Placement
- **Top-safe area**: Small logo mark (24-32pt)
- **Center focus**: Large logo for about/settings (80-120pt)
- **Bottom-safe area**: Avoid (reserved for navigation)

### Accessibility
- Logos are decorative, not functional
- Use `accessibilityLabel="Instalog logo"`
- Don't require logos to convey information

### Performance
- Optimize PNGs (use ImageOptim or similar)
- Load asynchronously if large
- Cache properly with React Native Image

## Implementation Examples

### Small Header Logo (Instalog Screen)
```typescript
<Image
  source={require('../assets/logo-mark.png')}
  style={{width: 28, height: 28, opacity: 0.6}}
  accessibilityLabel="Instalog"
/>
```

### Large About Logo (Settings Screen)
```typescript
<Image
  source={require('../assets/logo.png')}
  style={{width: 80, height: 80, marginBottom: 16}}
  resizeMode="contain"
  accessibilityLabel="Instalog logo"
/>
```

### Empty State Logo
```typescript
<Image
  source={require('../assets/logo.png')}
  style={{width: 120, height: 120, opacity: 0.3}}
  resizeMode="contain"
  accessibilityLabel="No logs yet"
/>
```
