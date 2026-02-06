/**
 * Design Tokens for MOTO Bitcoin Wallet
 * Extracted from Figma designs
 */

export const designTokens = {
  // Colors
  colors: {
    // Background
    background: '#000000',
    backgroundSecondary: 'rgba(255, 255, 255, 0.1)',
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: 'rgba(255, 255, 255, 0.8)', // 80% opacity
    textTertiary: 'rgba(255, 255, 255, 0.6)', // 60% opacity
    
    // Borders
    borderPrimary: 'rgba(255, 255, 255, 0.8)', // 80% opacity
    borderSecondary: 'rgba(255, 255, 255, 0.4)', // 40% opacity
    
    // Dividers
    divider: 'rgba(255, 255, 255, 0.5)', // 50% opacity
    
    // Bitcoin accent (from index.css)
    bitcoin: '#CC8800',
    
    // Note: Status bar colors are for design mockup only, not implemented in app
  },

  // Typography
  typography: {
    // Font Families
    fonts: {
      primary: "'Public Sans', sans-serif",
      mono: "'IBM Plex Mono', monospace",
    },
    
    // Font Sizes
    sizes: {
      xs: '12px',
      sm: '14px',
      base: '16px',
      lg: '20px',
      xl: '24px',
      '2xl': '32px',
    },
    
    // Font Weights
    weights: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    
    // Line Heights
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
    
    // Letter Spacing
    letterSpacing: {
      tight: '-0.22px',
      normal: '0.15px',
      wide: '0.32px',
      wider: '0.8px',
      widest: '1.28px',
    },
  },

  // Spacing
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '40px',
    '3xl': '48px',
    '4xl': '64px',
  },

  // Component Sizes
  sizes: {
    // Buttons
    buttonHeight: '64px',
    buttonHeightSmall: '56px',
    
    // Icons
    iconSmall: '16px',
    iconMedium: '24px',
    iconLarge: '32px',
    iconXLarge: '40px',
    
    // Logo
    logoMark: '80px',
    logoMarkSmall: '40px',
    logoType: '221.096px', // Width
    logoTypeHeight: '40px',
    
    // QR Code
    qrCode: '370px',
    
    // Status Bar
    statusBarHeight: '40px',
  },

  // Border Radius
  borderRadius: {
    none: '0',
    sm: '4px',
    md: '8px',
    lg: '16px',
    full: '100px',
  },

  // Borders
  borders: {
    thin: '1px',
    medium: '2px',
    thick: '4px',
  },

  // Shadows
  shadows: {
    none: 'none',
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  },

  // Transitions
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '600ms',
    slower: '1200ms',
    slowest: '2250ms', // 50% slower animation
  },

  // Z-index
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Type-safe access to design tokens
export type DesignTokens = typeof designTokens;

