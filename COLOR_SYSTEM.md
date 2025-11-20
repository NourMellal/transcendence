# 🎨 Transcendence Color System

## 🚀 Quick Start

### Change the Entire App Theme in 3 Steps:

1. **Edit CSS Variables** (in `/src/styles/main.css`):
   ```css
   :root {
     --color-brand-primary: #7c5dff;    /* Change this */
     --color-brand-secondary: #4be1ec;  /* And this */
     --color-brand-accent: #ec4899;     /* And this */
     --color-brand-neon: #7cf2c8;       /* And this */
     --color-brand-dark: #050712;       /* And this */
   }
   ```

2. **OR Use JavaScript** (for dynamic themes):
   ```typescript
   import { applyColorTheme } from './styles/colors';
   
   // Apply a pre-made theme
   applyColorTheme('ocean');      // Blue theme
   applyColorTheme('sunset');     // Orange theme  
   applyColorTheme('cyberpunk');  // Pink/cyan theme
   applyColorTheme('gaming');     // Default theme
   ```

3. **OR Edit the Config** (in `/src/styles/colors.ts`):
   ```typescript
   export const TRANSCENDENCE_COLORS = {
     brand: {
       primary: '#your-color-here',     // Changes everywhere!
       secondary: '#your-color-here',
       // ...
     }
   }
   ```

## 🎯 Usage in Components

### Tailwind Classes (Recommended)
```typescript
// These automatically use your CSS variables
className="bg-brand-primary text-white"
className="border-brand-secondary"
className="text-brand-accent"
```

### CSS Variables (For custom styles)
```css
.custom-button {
  background: var(--color-brand-primary);
  border: 1px solid var(--color-brand-secondary);
  color: var(--color-text-primary);
}
```

### Pre-built Component Classes
```typescript
className="glass-panel"          // Auto-themed glass effect
className="glass-input"          // Auto-themed form inputs
className="btn-primary"          // Auto-themed primary button
className="text-brand-gradient"  // Auto-themed gradient text
```

## 🎨 Available Colors

### Brand Colors
- `brand-primary` - Main purple (#7c5dff)
- `brand-secondary` - Cyan accent (#4be1ec) 
- `brand-accent` - Pink highlights (#ec4899)
- `brand-neon` - Green glow (#7cf2c8)
- `brand-dark` - Main background (#050712)

### Semantic Colors  
- `success` - Success states
- `warning` - Warning states
- `error` - Error states
- `info` - Information states

### UI Colors
- `panel-bg` - Glass panel backgrounds
- `panel-border` - Glass panel borders
- `input-bg` - Form input backgrounds
- `input-border` - Form input borders
- `text-primary` - Main text
- `text-secondary` - Secondary text
- `text-muted` - Muted/placeholder text

## 🔄 Theme Switching

### Add Theme Switching to Your App
```typescript
// In your component
import { applyColorTheme } from '../styles/colors';

function ThemeSelector() {
  const switchTheme = (theme: string) => {
    applyColorTheme(theme as any);
  };

  return (
    <select onChange={(e) => switchTheme(e.target.value)}>
      <option value="gaming">Gaming (Default)</option>
      <option value="ocean">Ocean Blue</option>
      <option value="sunset">Sunset Orange</option>
      <option value="cyberpunk">Cyberpunk Pink</option>
    </select>
  );
}
```

## 🔧 Extending the System

### Add New Colors
1. Add to CSS variables in `main.css`
2. Add to Tailwind config in `tailwind.config.js`
3. Add to TypeScript config in `colors.ts`

### Create New Themes
```typescript
// In colors.ts
export const COLOR_THEMES = {
  // Add your custom theme
  myTheme: {
    ...TRANSCENDENCE_COLORS,
    brand: {
      primary: '#ff6b6b',
      secondary: '#4ecdc4', 
      accent: '#45b7d1',
      neon: '#96ceb4',
      dark: '#2c3e50',
    }
  }
};
```

## 📍 Current Implementation

All pages now use the same color system:
- ✅ HomePage 
- ✅ LoginPage
- ✅ SignupPage  
- ✅ All components

**One change in CSS variables = entire app updates! 🎉**