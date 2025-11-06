# Market Town Bitcoin Wallet - Design System

## Overview
This document contains all design specifications extracted from Figma designs for the Market Town Bitcoin Wallet application.

## Typography

### Font Families
- **Public Sans** - Primary UI font (Regular, Medium, Bold)
  - Used for: UI text, labels, buttons, navigation
  - Weights: 400 (Regular), 500 (Medium), 700 (Bold)
  
- **IBM Plex Mono** - Monospace font for numbers and code
  - Used for: Amounts, currency codes, Bitcoin addresses, dates, transaction IDs
  - Weights: 400 (Regular), 500 (Medium), 700 (Bold)

- **Public Sans** - Primary UI font
  - Used for: All UI text, buttons, labels, navigation, headers
  - Weights: 400 (Regular), 500 (Medium), 700 (Bold)
  
**Note**: The status bar (with time, battery, etc.) shown in Figma designs is for mockup purposes only and should NOT be implemented in the final app.

### Font Sizes
- **12px** (xs) - Small labels, keyboard hints
- **14px** (sm) - Small text
- **16px** (base) - Button text, address display, labels
- **20px** (lg) - Headers, menu items, transaction amounts
- **24px** (xl) - Balance display (home screen)
- **32px** (2xl) - Large amount displays (send/receive screens)

### Letter Spacing
- **-0.22px** (tight) - Headers, welcome text
- **0.15px** (normal) - Button text
- **0.32px** (wide) - Address display
- **0.8px** (wider) - Transaction amounts, dates
- **1.28px** (widest) - Large amount displays

### Line Heights
- **1.5** (normal) - Standard text, buttons
- **1.2** (tight) - Headers
- **24px** - Button text line height

## Colors

### Background
- **Primary**: `#000000` (Black)
- **Secondary**: `rgba(255, 255, 255, 0.1)` (10% white overlay)

### Text
- **Primary**: `#FFFFFF` (White)
- **Secondary**: `rgba(255, 255, 255, 0.8)` (80% white - most UI text)
- **Tertiary**: `rgba(255, 255, 255, 0.6)` (60% white - hints, disabled)

### Borders
- **Primary**: `rgba(255, 255, 255, 0.8)` (80% white - main buttons)
- **Secondary**: `rgba(255, 255, 255, 0.4)` (40% white - secondary buttons)

### Dividers
- **Divider**: `rgba(255, 255, 255, 0.5)` (50% white - 1px height)

### Accent
- **Bitcoin**: `#CC8800` (Orange - wallet address display)

### Status Bar
**Note**: The status bar shown in Figma designs is for mockup purposes only and should NOT be implemented in the final application.

## Spacing

### Standard Spacing Scale
- **4px** (xs) - Tight spacing
- **8px** (sm) - Small gaps
- **16px** (md) - Standard gaps
- **24px** (lg) - Large gaps (between transactions)
- **32px** (xl) - Section gaps
- **40px** (2xl) - Large section gaps
- **48px** (3xl) - Extra large gaps
- **64px** (4xl) - Button height

## Important Notes

### Status Bar
The status bar (showing time "6:15", battery, Wi-Fi, etc.) shown at the top of all Figma screens is included for design mockup purposes only. This should NOT be implemented in the final application - it's just for visual reference in the designs.

## Component Specifications

### Buttons
- **Height**: 64px
- **Border**: 2px solid `rgba(255, 255, 255, 0.8)`
- **Border Radius**: 0 (no rounded corners)
- **Text**: Public Sans Bold, 16px
- **Letter Spacing**: 0.15px
- **Line Height**: 24px
- **Text Color**: `rgba(255, 255, 255, 0.8)`
- **Background**: Transparent (black)
- **Hover**: Optional white background with black text

### Secondary Buttons
- **Border**: `rgba(255, 255, 255, 0.4)` (40% opacity)
- Same other specs as primary buttons

### Input Fields
- **Wallet Address Display**: 
  - Background: `rgba(255, 255, 255, 0.1)`
  - Text: IBM Plex Mono Bold, 16px
  - Color: `rgba(255, 255, 255, 0.8)`
  - Letter Spacing: 0.32px
  - Padding: 16px gap
  - Tappable to copy

### Amount Display
- **Large Amount** (Send/Receive screens):
  - Font: IBM Plex Mono Bold
  - Size: 32px
  - Color: White
  - Letter Spacing: 1.28px
  - Line Height: 1.5

- **Balance Display** (Home screen):
  - Font: IBM Plex Mono Bold
  - Size: 24px
  - Color: White
  - Letter Spacing: 0.96px

### Transaction Items
- **Height**: 32px
- **Amount**: IBM Plex Mono Medium, 20px, `rgba(255, 255, 255, 0.8)`, tracking 0.8px
- **Date**: IBM Plex Mono Medium, 20px, `rgba(255, 255, 255, 0.8)`, tracking 0.8px
- **Format**: `YYYYMMDD·HH:MM` (e.g., `20250330·09:12`)
- **Gap between items**: 24px

### Headers
- **Height**: 40px
- **Title**: Public Sans Medium, 20px, white, tracking -0.22px
- **Close button**: 32px × 32px (left side)
- **Currency cycle button**: 32px × 32px (right side, when applicable)

### Dividers
- **Height**: 1px
- **Color**: `rgba(255, 255, 255, 0.5)`
- **Width**: Full width

### Logo
- **mt mark**: 80px × 80px (splash), 40px × 40px (header)
- **mt type**: 221.096px × 40px
- **Gap between mark and type**: 40px (gap-10)

### QR Code
- **Size**: 370px × 369px (receive screen)
- **Background**: White (with Bitcoin logo in center)

## Screen Specifications

### Launch/Splash Screen
- **Background**: Black
- **Content**: Centered vertically and horizontally
- **Logo**: mt mark (80px) + mt type (40px) stacked, gap 40px
- **Animation**: 
  - 3s delay before animation starts
  - mt type fades out over 1200ms
  - mt mark slides up from center to top over 2250ms (50% slower)
  - Login content fades in after 900ms delay

### Welcome/Sign-in Screen
- **Background**: Black
- **Logo at top**: mt mark (80px), positioned at top
- **Welcome text**: 
  - Public Sans Medium, 20px
  - Color: `rgba(255, 255, 255, 0.8)`
  - Letter Spacing: -0.22px
  - Line Height: 1.5
  - Gap between logo and text: 80px
  - Gap between text blocks: Double line breaks (`&nbsp;`)
- **Sign In button**: 
  - Height: 64px
  - Width: Full width
  - Border: 2px solid `rgba(255, 255, 255, 0.8)`
  - Gap above button: 32px

### Home/Dashboard Screen
- **Header**:
  - Logo (40px) on left
  - Balance (IBM Plex Mono Bold, 24px) on right
  - Add funds button (32px) on right
- **Transactions**:
  - Divider (1px, `rgba(255, 255, 255, 0.5)`)
  - Each transaction: 32px height
  - Gap: 24px between transactions
- **Bottom buttons**: Send and Receive side-by-side, 64px height

### Settings Menu
- **Full logo** at top (mt mark + mt type)
- **Menu items**: 
  - Icon (24px) + Text (Public Sans Medium, 20px)
  - Height: 32px
  - Gap: 16px between icon and text
- **Dividers** between sections
- **Close button** at bottom (full width, 64px)

### Currency/Language Settings
- **Header**: Close button, Title, spacer
- **List items**: 
  - Text: Public Sans Medium, 20px
  - Height: 24px
  - Gap: 32px between items
- **Selection indicator**: Checkmark icon (24px) on right

### Transaction Details
- **Large icon**: 64px × 48px
- **Amount**: IBM Plex Mono Bold, 32px
- **Details section**:
  - Labels: Public Sans Medium, 16px, `rgba(255, 255, 255, 0.8)`, tracking -0.176px
  - Values: IBM Plex Mono Medium, 16px, white, tracking 0.32px, right-aligned
  - Gap: 16px between items

### Send Bitcoin - Address Screen
- **QR Scanner**: Full screen camera view
- **Paste Address button**: Full width, 64px height

### Send Bitcoin - Amount Screen
- **Amount display**: Large (32px, IBM Plex Mono Bold)
- **Max balance button**: 
  - Background: `rgba(255, 255, 255, 0.1)`
  - Text: IBM Plex Mono Bold, 12px, `rgba(255, 255, 255, 0.6)`
  - Tappable to auto-populate
- **Custom numeric keyboard**: 0-9, backspace
- **Next button**: Disabled until amount entered

### Confirm Send Screen
- **Transaction icon**: 64px × 48px
- **Amount**: Large display (32px)
- **Breakdown**: Same as Transaction Details
- **Estimated time**: "< 5 seconds"
- **Buttons**: Cancel (80px) + Confirm (full width)

### Receive Bitcoin - Main Screen
- **QR Code**: 370px × 369px
- **Address**: Tappable, copyable
- **Set Amount button**: Border `rgba(255, 255, 255, 0.4)`
- **Copy Address button**: Border `rgba(255, 255, 255, 0.4)`
- **Share button**: Border `rgba(255, 255, 255, 0.8)`

### Receive Bitcoin - With Amount
- **Amount display**: 24px, IBM Plex Mono Bold
- **Edit button**: Next to amount, 64px height, border `rgba(255, 255, 255, 0.4)`

## Animation Timings

### Splash Screen Transition
- **Initial delay**: 3000ms (3 seconds)
- **mt type fade out**: 1200ms
- **mt mark slide up**: 2250ms (50% slower than standard)
- **Login content fade in**: 1200ms delay, 900ms after animation starts

### Standard Transitions
- **Fast**: 150ms
- **Normal**: 300ms
- **Slow**: 600ms
- **Slower**: 1200ms
- **Slowest**: 2250ms

## Date/Time Formats

### Transaction Dates
- **Format**: `YYYYMMDD·HH:MM`
- **Example**: `20250330·09:12`
- **Font**: IBM Plex Mono Medium
- **Size**: 20px

### Transaction Details Time
- **Format**: `YYYY.MM.DD·HH:MM`
- **Example**: `2025.03.30·09:12`

## Currency Display

### Currency Cycle
- **Options**: BTC, SATs, Local Currency (default USD)
- **Button**: 32px × 32px icon in header
- **Cycles**: BTC → SATs → USD → BTC

### Amount Formatting
- **BTC**: Display with 8 decimal places (e.g., `0.005135`)
- **SATs**: Display with comma separators (e.g., `513,500`)
- **Local Currency**: Display with currency equivalent (e.g., `~$10.00`)

## Responsive Breakpoints

Not specified in mobile designs - all screens appear to be mobile-first (412px width).

## Accessibility

- All text maintains sufficient contrast (white on black)
- Touch targets minimum 32px × 32px
- Buttons are 64px height for easy tapping
- Clear visual hierarchy with font sizes and weights

