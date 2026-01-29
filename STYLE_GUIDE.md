# Portfolio Style Guide

## Overview
This portfolio follows a minimal, terminal-inspired design aesthetic with a monochromatic color scheme and clean typography. The design emphasizes simplicity, readability, and a developer-focused experience.

---

## Design Philosophy

### Core Principles
- **Minimalism**: Clean, uncluttered interfaces with purposeful elements
- **Terminal Aesthetic**: Developer-focused design inspired by command-line interfaces
- **Monochromatic**: Grayscale color palette with subtle accents
- **Responsive**: Mobile-first approach with seamless adaptation across devices
- **Smooth Interactions**: Subtle transitions and hover effects for enhanced UX

---

## Color Palette

### Dark Theme (Default)
```css
--bg: #0a0a0a           /* Primary background - near black */
--text: #e5e5e5         /* Primary text - light gray */
--text-secondary: #a0a0a0   /* Secondary text - medium gray */
--accent: #666666       /* Accent elements - medium-dark gray */
--border: #333333       /* Borders and dividers - dark gray */
```

### Light Theme
```css
--bg: #ffffff           /* Primary background - white */
--text: #1a1a1a         /* Primary text - near black */
--text-secondary: #666666   /* Secondary text - medium gray */
--accent: #999999       /* Accent elements - light gray */
--border: #e5e5e5       /* Borders and dividers - very light gray */
```

### Usage Guidelines
- Use `var(--bg)` for all backgrounds
- Use `var(--text)` for primary content
- Use `var(--text-secondary)` for metadata, labels, and less important text
- Use `var(--accent)` for hover states and highlights
- Use `var(--border)` for dividers, card borders, and input borders

---

## Typography

### Font Family
```css
font-family: var(--font-geist-mono), monospace;
```
- **Primary Font**: Geist Mono (monospace)
- **Fallback**: System monospace fonts

### Font Sizes
```css
Base: 16px
h1: 2.5rem (40px)    /* Main page headings */
h2: 2rem (32px)      /* Section headings */
h3: 1.5rem (24px)    /* Subsection headings */
h4-h6: 1rem (16px)   /* Small headings */

Body text: 1rem (16px)
Small text: 0.95rem (15.2px)
Extra small: 0.85rem (13.6px)
Tiny text: 0.7rem (11.2px)
```

### Line Heights
```css
Body: 1.6
Headings: 1.4
Code/ASCII: 1 (monospace content)
```

### Font Weights
```css
Regular: 400 (default)
Medium: 500 (active nav links)
Semibold: 600 (headings)
```

### Mobile Typography
```css
h1: 2rem (32px)
h2: 1.5rem (24px)
h3: 1.25rem (20px)
```

---

## Spacing System

### Layout Spacing
```css
Max content width: 800px
Main padding: 2rem (32px)
Mobile padding: 1.5rem (24px)
Top padding: 100px (accounts for fixed nav)
Bottom padding: 4rem (64px)
```

### Component Spacing
```css
Section margin: 4rem (64px)
Element margin: 1rem (16px)
Small gap: 0.5rem (8px)
Medium gap: 1rem (16px)
Large gap: 1.5rem (24px)
Extra large gap: 2rem (32px)
```

### Border Radius
```css
Default: 4px (buttons, inputs, cards)
Circular: 50% (indicators, avatars)
```

---

## Components

### Buttons
```css
Style: Transparent background with border
Border: 1px solid var(--border)
Padding: 0.5rem 1rem (8px 16px)
Border-radius: 4px
Font-size: 0.95rem
Transition: all 0.2s

Hover state:
- border-color: var(--text)
- background-color: var(--accent)

Active state:
- transform: scale(0.98)
```

**Example Usage:**
```jsx
<button className={styles.button}>Click Me</button>
```

### Input Fields
```css
Background: var(--bg)
Border: 1px solid var(--border)
Padding: 0.5rem (8px)
Border-radius: 4px
Font-family: inherit (monospace)
Transition: border-color 0.2s

Focus state:
- outline: none
- border-color: var(--accent)
```

### Cards/Projects
```css
Padding: 1.5rem (24px)
Border: 1px solid var(--border)
Border-radius: 4px
Margin-bottom: 2.5rem
Transition: border-color 0.2s

Hover state:
- border-color: var(--accent)
- cursor: pointer
```

### Navigation
```css
Position: fixed top
Height: 60px
Background: var(--bg)
Border-bottom: 1px solid var(--border)
Z-index: 1000

Logo:
- font-size: 1.25rem
- font-weight: 600

Nav links:
- color: var(--text-secondary)
- font-size: 0.95rem
- gap: 1.5rem

Active link:
- color: var(--text)
- font-weight: 500

Hover:
- color: var(--text)
```

### Links
```css
Default: Underlined, same color as text
Color: var(--text)
Text-decoration: underline
Transition: color 0.2s

Hover:
- color: var(--text-secondary)
```

---

## Animations & Transitions

### Standard Transitions
```css
Duration: 0.2s
Easing: ease (default)
Properties: color, background-color, border-color, transform
```

### Fade In Animation
```css
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(-5px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
Duration: 0.3s
Easing: ease-out
```

### Pulse Animation (Status Indicator)
```css
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.85);
  }
}
Duration: 2s
Easing: ease-in-out
Loop: infinite
```

### Blink Animation (Cursor)
```css
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}
Duration: 1s
Easing: step-end
Loop: infinite
```

### Hover Transforms
```css
Small lift: translateY(-2px)
Button press: scale(0.98)
```

---

## Scrollbars

### Custom Scrollbar Styling
```css
Width: 8px
Height: 8px
Border-radius: 4px

Track: var(--bg)
Thumb: var(--border)
Thumb hover: var(--accent)

Firefox:
scrollbar-width: thin
scrollbar-color: var(--border) var(--bg)
```

---

## Responsive Design

### Breakpoints
```css
Mobile: max-width 768px
Desktop: min-width 769px
```

### Mobile Adjustments
- Reduced padding (1.5rem instead of 2rem)
- Smaller font sizes for headings
- Adjusted navigation spacing (1rem gap instead of 1.5rem)
- Hidden desktop ASCII art, show mobile version
- Adjusted component padding (1rem instead of 1.5rem)

---

## Interactive Elements

### Icon Styling
```css
Size: 20px × 20px
Color: var(--text-secondary)
Transition: color 0.2s, transform 0.2s

Hover:
- color: var(--text)
- transform: translateY(-2px)
```

### Status Indicators
```css
Size: 8px × 8px
Border-radius: 50%
Animation: pulse 2s ease-in-out infinite
```

---

## Accessibility

### Focus States
- Remove default outline
- Add custom border color change: `border-color: var(--accent)`
- Maintain keyboard navigation support

### Color Contrast
- Dark theme: Light text (#e5e5e5) on dark background (#0a0a0a)
- Light theme: Dark text (#1a1a1a) on light background (#ffffff)
- All combinations meet WCAG AA standards

### Text Legibility
- Line height: 1.6 for body text
- Maximum content width: 800px
- Adequate spacing between elements

---

## Special Features

### ASCII Art
- Font size: min(0.5vw, 4px) for desktop
- Font size: 2.5px for mobile
- Line height: 1
- Font-family: monospace
- White-space: pre
- Letter-spacing: 0px

### Terminal Chat Interface
- Monospace font throughout
- Command-line style prompts
- Blinking cursor effect
- Message history with timestamps

### Theme Toggle
- Smooth transition between themes (0.2s)
- Persistent theme preference
- Icon-based toggle button

---

## Design Patterns

### Content Hierarchy
1. **Primary Content**: Main headings, body text - `var(--text)`
2. **Secondary Content**: Metadata, labels - `var(--text-secondary)`
3. **Tertiary Content**: Borders, dividers - `var(--border)`
4. **Interactive Elements**: Hover states - `var(--accent)`

### Layout Structure
```
Fixed Navigation (60px height)
↓
Main Content Area (max-width: 800px, centered)
  ↓ Sections (margin-bottom: 4rem)
    ↓ Elements (margin-bottom: 1-2.5rem)
↓
Footer (border-top, centered)
```

### Hover Interactions
1. Color transition (0.2s)
2. Optional transform (translateY or scale)
3. Cursor change when appropriate

---

## Code Examples

### Button Component
```css
.button {
  background-color: transparent;
  border: 1px solid var(--border);
  color: var(--text);
  padding: 0.5rem 1rem;
  cursor: pointer;
  font-family: var(--font-geist-mono), monospace;
  border-radius: 4px;
  transition: all 0.2s;
  font-size: 0.95rem;
}

.button:hover {
  border-color: var(--text);
  background-color: var(--accent);
}

.button:active {
  transform: scale(0.98);
}
```

### Card Component
```css
.card {
  margin-bottom: 2.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 4px;
  transition: border-color 0.2s;
}

.card:hover {
  border-color: var(--accent);
  cursor: pointer;
}
```

### Link Component
```css
.link {
  color: var(--text);
  text-decoration: underline;
  transition: color 0.2s;
}

.link:hover {
  color: var(--text-secondary);
}
```

---

## Best Practices

### Do's
✓ Use CSS variables for all colors
✓ Maintain consistent spacing with rem units
✓ Add smooth transitions to interactive elements
✓ Test in both light and dark themes
✓ Ensure mobile responsiveness
✓ Keep animations subtle and purposeful
✓ Use monospace font for all text
✓ Maintain minimalist aesthetic

### Don'ts
✗ Use hardcoded color values
✗ Mix font families
✗ Add excessive animations
✗ Create cluttered layouts
✗ Use overly bright or saturated colors
✗ Forget hover states on interactive elements
✗ Ignore mobile breakpoints
✗ Add unnecessary visual complexity

---

## File Structure

```
app/
├── globals.css              # Global styles, variables, base components
├── page.module.css          # Page-specific styles
├── components/
    ├── Navigation.module.css    # Navigation component styles
    ├── ThemeToggle.module.css   # Theme toggle styles
    └── [Component].module.css   # Other component styles
```

---

## Tech Stack Reference

- **Framework**: Next.js 14+ (App Router)
- **Styling**: CSS Modules + Tailwind CSS
- **Font**: Geist Mono (monospace)
- **Theme System**: CSS variables with data attributes
- **Responsive**: Mobile-first approach

---

## Version History

- **v1.0** - Initial style guide based on current portfolio implementation
- Features: Dark/light themes, terminal aesthetic, minimal design
