export const Fluent2 = {
  colors: {
    light: {
      background: {
        primary: '#FFFFFF',
        secondary: '#FAFAFA',
        tertiary: '#F5F5F5',
        elevated: '#FFFFFF',
      },
      foreground: {
        primary: '#242424',
        secondary: '#616161',
        tertiary: '#9E9E9E',
        disabled: '#BDBDBD',
        onAccent: '#FFFFFF',
      },
      brand: {
        primary: '#0078D4',
        secondary: '#106EBE',
        tertiary: '#004578',
        background: '#EBF3FC',
        foreground: '#0078D4',
      },
      stroke: {
        primary: '#E0E0E0',
        secondary: '#EEEEEE',
        focus: '#0078D4',
        disabled: '#F5F5F5',
      },
      status: {
        success: '#107C10',
        warning: '#FFB900',
        error: '#D13438',
        info: '#0078D4',
        successBackground: '#DFF6DD',
        warningBackground: '#FFF4CE',
        errorBackground: '#FDE7E9',
        infoBackground: '#EBF3FC',
      },
      surface: {
        card: '#FFFFFF',
        cardHover: '#F5F5F5',
        cardPressed: '#EEEEEE',
        overlay: 'rgba(0, 0, 0, 0.4)',
      },
    },
    dark: {
      background: {
        primary: '#1F1F1F',
        secondary: '#2D2D2D',
        tertiary: '#383838',
        elevated: '#2D2D2D',
      },
      foreground: {
        primary: '#FFFFFF',
        secondary: '#D6D6D6',
        tertiary: '#A0A0A0',
        disabled: '#5C5C5C',
        onAccent: '#FFFFFF',
      },
      brand: {
        primary: '#4CC2FF',
        secondary: '#62CDFF',
        tertiary: '#99DCFF',
        background: '#0D3A58',
        foreground: '#4CC2FF',
      },
      stroke: {
        primary: '#3D3D3D',
        secondary: '#2D2D2D',
        focus: '#4CC2FF',
        disabled: '#2D2D2D',
      },
      status: {
        success: '#6CCB5F',
        warning: '#FCE100',
        error: '#FF6B6B',
        info: '#4CC2FF',
        successBackground: '#0D2D0D',
        warningBackground: '#3D3000',
        errorBackground: '#3D1010',
        infoBackground: '#0D3A58',
      },
      surface: {
        card: '#2D2D2D',
        cardHover: '#383838',
        cardPressed: '#424242',
        overlay: 'rgba(0, 0, 0, 0.6)',
      },
    },
  },

  typography: {
    fontFamily: {
      primary: 'System',
      mono: 'monospace',
    },
    fontSize: {
      caption2: 10,
      caption1: 12,
      body2: 14,
      body1: 16,
      subtitle2: 18,
      subtitle1: 20,
      title3: 24,
      title2: 28,
      title1: 34,
      largeTitle: 40,
      display: 48,
    },
    fontWeight: {
      regular: '400' as const,
      medium: '500' as const,
      semibold: '600' as const,
      bold: '700' as const,
    },
    lineHeight: {
      tight: 1.2,
      normal: 1.4,
      relaxed: 1.6,
    },
  },

  spacing: {
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
    xxxxl: 40,
    xxxxxl: 48,
  },

  radius: {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },

  elevation: {
    none: {
      shadowColor: 'transparent',
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
    level1: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
      elevation: 1,
    },
    level2: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 4,
      elevation: 2,
    },
    level3: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 4,
    },
    level4: {
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.16,
      shadowRadius: 16,
      elevation: 8,
    },
  },

  duration: {
    instant: 0,
    fast: 100,
    normal: 200,
    slow: 300,
    slower: 500,
  },

  iconSize: {
    xs: 12,
    sm: 16,
    md: 20,
    lg: 24,
    xl: 28,
    xxl: 32,
    xxxl: 48,
  },
} as const;

export type FluentColorScheme = 'light' | 'dark';

export const getFluentColors = (scheme: FluentColorScheme) => 
  Fluent2.colors[scheme];
