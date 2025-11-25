# AppTax Visual Identity System
## Quick Reference Guide

---

## Brand Overview

**AppTax** is an AI-powered accounting CRM platform for the Polish market, combining traditional accounting reliability with innovative AI capabilities.

### Brand Personality
- **Intelligent** — Powered by advanced AI
- **Trustworthy** — Professional and reliable
- **Progressive** — Forward-thinking innovation
- **Approachable** — Complex made simple

---

## Logo System

### The Smart Calculator Concept
Our logo combines familiar calculator iconography with an AI indicator (teal glow), creating instant industry recognition while signaling technological innovation.

### Logo Versions
| Version | Use Case | File |
|---------|----------|------|
| Primary Horizontal | Main applications, website header | `apptax-logo-primary.svg` |
| Stacked | Square formats, limited horizontal space | `apptax-logo-stacked.svg` |
| Logomark | App icons, favicons, small applications | `apptax-logomark.svg` |
| White/Reversed | Dark backgrounds | `apptax-logo-white.svg` |
| Monochrome | Single-color printing | `apptax-logo-mono.svg` |

### Clear Space
Maintain minimum clear space equal to the height of the "A" in AppTax around all sides.

### Minimum Sizes
- Horizontal Logo: 120px width
- Logomark: 24px height

---

## Color Palette

### Primary Colors

| Color | HEX | RGB | CMYK | Pantone | Usage |
|-------|-----|-----|------|---------|-------|
| **AppTax Blue** | `#0A66C2` | 10, 102, 194 | 95, 47, 0, 24 | 2935 C | Primary brand color, CTAs |
| **Professional Navy** | `#1E3A5F` | 30, 58, 95 | 68, 39, 0, 63 | 289 C | Text, backgrounds |
| **Innovation Teal** | `#00BFA6` | 0, 191, 166 | 100, 0, 13, 25 | 3268 C | AI indicators, accents |

### Secondary Colors

| Color | HEX | RGB | Usage |
|-------|-----|-----|-------|
| **Light Blue** | `#4A90D9` | 74, 144, 217 | UI elements, links |
| **Soft Teal** | `#E0F7F4` | 224, 247, 244 | Backgrounds, highlights |
| **Warm Gray** | `#F5F5F5` | 245, 245, 245 | Page backgrounds |

### Color Usage Ratios
- Professional Navy: 60%
- AppTax Blue: 30%
- Innovation Teal: 10%

---

## Typography

### Primary Typeface: Inter

Inter is selected for:
- Exceptional screen legibility
- Complete Polish character support (ą ć ę ł ń ó ś ź ż)
- Modern professional aesthetic
- Free and open-source

### Type Scale

| Style | Font | Size | Weight | Line Height |
|-------|------|------|--------|-------------|
| Display 1 | Inter | 56px | 800 (ExtraBold) | 1.1 |
| Display 2 | Inter | 40px | 700 (Bold) | 1.2 |
| Heading 1 | Inter | 32px | 700 (Bold) | 1.3 |
| Heading 2 | Inter | 24px | 600 (SemiBold) | 1.4 |
| Heading 3 | Inter | 20px | 600 (SemiBold) | 1.4 |
| Body | Inter | 16px | 400 (Regular) | 1.7 |
| Small | Inter | 14px | 400 (Regular) | 1.6 |
| Caption | Inter | 12px | 400 (Regular) | 1.5 |

### Available Weights
- Light (300)
- Regular (400)
- Medium (500)
- SemiBold (600)
- Bold (700)
- ExtraBold (800)

---

## Visual Elements

### Border Radius
- Small: 4px (inputs, small buttons)
- Medium: 8px (buttons, cards)
- Large: 12px (larger cards)
- XL: 16px (modals, hero sections)

### Shadows
```css
/* Small */
box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);

/* Medium */
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);

/* Large */
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
```

### Gradients
```css
/* Primary gradient */
background: linear-gradient(135deg, #0A66C2 0%, #1E3A5F 100%);

/* Dark gradient */
background: linear-gradient(135deg, #1E3A5F 0%, #0d2137 100%);

/* AI accent gradient */
background: linear-gradient(135deg, #00BFA6 0%, #0A66C2 100%);
```

### AI Indicator
The teal glow effect represents AI intelligence throughout the interface:
```css
.ai-indicator {
  width: 12px;
  height: 12px;
  background: #00BFA6;
  border-radius: 50%;
  box-shadow: 0 0 8px rgba(0, 191, 166, 0.5);
}
```

---

## Implementation Code

### CSS Variables
```css
:root {
  /* Primary */
  --apptax-blue: #0A66C2;
  --professional-navy: #1E3A5F;
  --innovation-teal: #00BFA6;
  
  /* Secondary */
  --light-blue: #4A90D9;
  --soft-teal: #E0F7F4;
  --warm-gray: #F5F5F5;
  
  /* Neutrals */
  --dark-text: #1A1A2E;
  --medium-gray: #6B7280;
  --light-gray: #E5E7EB;
  
  /* Typography */
  --font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}
```

### Tailwind Configuration
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        apptax: {
          blue: '#0A66C2',
          navy: '#1E3A5F',
          teal: '#00BFA6',
          'light-blue': '#4A90D9',
          'soft-teal': '#E0F7F4',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        'apptax': '8px',
      }
    }
  }
}
```

### Swift (iOS)
```swift
extension UIColor {
    static let apptaxBlue = UIColor(red: 10/255, green: 102/255, blue: 194/255, alpha: 1)
    static let professionalNavy = UIColor(red: 30/255, green: 58/255, blue: 95/255, alpha: 1)
    static let innovationTeal = UIColor(red: 0/255, green: 191/255, blue: 166/255, alpha: 1)
    static let lightBlue = UIColor(red: 74/255, green: 144/255, blue: 217/255, alpha: 1)
}
```

### Android (Kotlin)
```kotlin
object AppTaxColors {
    val ApptaxBlue = Color(0xFF0A66C2)
    val ProfessionalNavy = Color(0xFF1E3A5F)
    val InnovationTeal = Color(0xFF00BFA6)
    val LightBlue = Color(0xFF4A90D9)
    val SoftTeal = Color(0xFFE0F7F4)
}
```

---

## Usage Guidelines

### ✓ Do
- Use the logo with adequate clear space
- Maintain color consistency across applications
- Use Inter typeface for all communications
- Apply the AI indicator (teal glow) for smart features
- Ensure sufficient contrast for accessibility
- Scale the logo proportionally
- Use approved color combinations

### ✗ Don't
- Distort or stretch the logo
- Use unapproved colors
- Add effects like drop shadows to the logo
- Place the logo on busy backgrounds
- Modify the logo's proportions
- Use the logo smaller than minimum size
- Rotate or flip the logo
- Use low contrast color combinations

---

## File Inventory

### Logos
```
/logos/
├── apptax-logo-primary.svg      # Main horizontal logo
├── apptax-logo-stacked.svg      # Vertical/stacked version
├── apptax-logo-white.svg        # White version for dark backgrounds
├── apptax-logo-mono.svg         # Monochrome version
├── apptax-logomark.svg          # Icon only
└── apptax-favicon.svg           # Favicon
```

### Guidelines
```
/guidelines/
└── AppTax-Brand-Guidelines.html  # Complete interactive brand book
```

---

## Contact

For brand-related questions or asset requests:
- Email: brand@apptax.pl
- Website: www.apptax.pl

---

*Visual Identity Guidelines v1.0 — 2025*
*AppTax — AI-Powered Accounting Intelligence*
