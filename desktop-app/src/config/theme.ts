/**
 * Theme Configuration
 * Central place for all colors, spacing, and design tokens
 */

export const theme = {
  // ============================================
  // COLORS
  // ============================================
  colors: {
    // Primary color (Purple - for sidebar, main buttons)
    primary: {
      50: '#faf5ff',
      100: '#f3e8ff',
      200: '#e9d5ff',
      300: '#d8b4fe',
      400: '#c084fc',
      500: '#a855f7',  // Main purple
      600: '#9333ea',
      700: '#7e22ce',
      800: '#6b21a8',
      900: '#581c87',
    },

    // Success color (Green - for attendance, success states)
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',  // Main green
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d',
    },

    // Warning color (Yellow - for pending payments, warnings)
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',  // Main yellow
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },

    // Danger color (Red - for errors, delete actions)
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',  // Main red
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d',
    },

    // Info color (Blue - for information, links)
    info: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',  // Main blue
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },

    // Stat card colors (based on your reference design)
    stats: {
      students: '#3b82f6',    // Blue
      attendance: '#22c55e',  // Green
      revenue: '#a855f7',     // Purple
      occupancy: '#f59e0b',   // Yellow
      pending: '#ef4444',     // Red
      active: '#22c55e',      // Green
    },
  },

  // ============================================
  // GRADIENTS
  // ============================================
  gradients: {
    // Sidebar gradient
    sidebar: 'linear-gradient(180deg, #7e22ce 0%, #9333ea 100%)',
    
    // Login page background
    loginBg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    
    // Button gradients
    primaryButton: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    successButton: 'linear-gradient(135deg, #84fab0 0%, #8fd3f4 100%)',
  },

  // ============================================
  // SIDEBAR
  // ============================================
  sidebar: {
    width: '260px',
    backgroundColor: '#1e293b',
    textColor: '#e2e8f0',
    activeColor: '#a855f7',
    hoverColor: '#334155',
  },

  // ============================================
  // SPACING
  // ============================================
  spacing: {
    pageTopPadding: '2rem',
    cardPadding: '1.5rem',
    sectionGap: '2rem',
  },

  // ============================================
  // BORDER RADIUS
  // ============================================
  borderRadius: {
    card: '12px',
    button: '8px',
    input: '8px',
    modal: '16px',
  },

  // ============================================
  // SHADOWS
  // ============================================
  shadows: {
    card: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
    cardHover: '0 10px 25px -5px rgb(0 0 0 / 0.1)',
    modal: '0 25px 50px -12px rgb(0 0 0 / 0.25)',
    button: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  },

  // ============================================
  // TRANSITIONS
  // ============================================
  transitions: {
    fast: '150ms',
    normal: '300ms',
    slow: '500ms',
  },
} as const;

// Export individual parts for easier imports
export const colors = theme.colors;
export const gradients = theme.gradients;
export const sidebar = theme.sidebar;