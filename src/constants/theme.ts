/**
 * Design System: Serene Focus
 */

export const theme = {
  colors: {
    // Brand & Primary
    primary: '#4441cc',
    onPrimary: '#ffffff',
    primaryContainer: '#5e5ce6',
    onPrimaryContainer: '#f4f1ff',

    // Surface & Background
    background: '#f9f9f9',
    onBackground: '#1a1c1c',
    surface: '#ffffff',
    onSurface: '#1a1c1c',
    onSurfaceVariant: '#464554',

    // Secondary & Containers
    surfaceContainerLowest: '#ffffff',
    surfaceContainerLow: '#f3f3f4',
    surfaceContainer: '#eeeeee',
    surfaceContainerHigh: '#e8e8e8',
    surfaceContainerHighest: '#e2e2e2',

    // Semantic
    error: '#ba1a1a',
    onError: '#ffffff',
    success: '#10B981', // Añadido para consistencia

    // Outline & Separators
    outline: '#777586',
    outlineVariant: '#c7c4d7',
    separator: '#E5E5EA',
    softWash: '#F2F2F7',
  },

  typography: {
    display: {
      fontSize: 34,
      fontWeight: '700' as const,
      lineHeight: 41,
      letterSpacing: -0.4,
    },
    h1: {
      fontSize: 28,
      fontWeight: '700' as const,
      lineHeight: 34,
      letterSpacing: -0.4,
    },
    h2: {
      fontSize: 22,
      fontWeight: '600' as const,
      lineHeight: 28,
      letterSpacing: -0.4,
    },
    h3: {
      fontSize: 20,
      fontWeight: '600' as const,
      lineHeight: 25,
      letterSpacing: -0.4,
    },
    bodyLg: {
      fontSize: 17,
      fontWeight: '400' as const,
      lineHeight: 24,
      letterSpacing: -0.2,
    },
    bodySm: {
      fontSize: 15,
      fontWeight: '400' as const,
      lineHeight: 20,
      letterSpacing: 0,
    },
    labelCaps: {
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
      letterSpacing: 0.5,
      textTransform: 'uppercase' as const,
    },
    callout: {
      fontSize: 13,
      fontWeight: '400' as const,
      lineHeight: 18,
      letterSpacing: 0,
    },
  },

  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    containerPadding: 20,
    gutter: 16,
  },

  borderRadius: {
    xs: 4,
    sm: 6,
    md: 12, // Botones, inputs
    lg: 16, // Tarjetas estándar
    xl: 24,
    full: 9999,
  },

  shadows: {
    level1: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 2,
    },
    level2: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.08,
      shadowRadius: 30,
      elevation: 5,
    },
  },
};
