import { createTheme, MantineColorsTuple } from '@mantine/core';

const primary: MantineColorsTuple = [
  '#e6f4ff',
  '#cce0ff',
  '#99c2ff',
  '#6699ff',
  '#3366ff',
  '#1a4dcc',
  '#003399',
  '#002266',
  '#001433',
  '#000000',
];

const success: MantineColorsTuple = [
  '#e6f9f0',
  '#ccefd8',
  '#99dfb1',
  '#66cf8a',
  '#33bf63',
  '#199947',
  '#0d6629',
  '#004d1a',
  '#00330d',
  '#001a00',
];

const warning: MantineColorsTuple = [
  '#fff8e6',
  '#ffefc9',
  '#ffdf93',
  '#ffcf5c',
  '#ffbf26',
  '#e6a800',
  '#cc9300',
  '#b37d00',
  '#996600',
  '#804d00',
];

const error: MantineColorsTuple = [
  '#ffebeb',
  '#ffd4d4',
  '#ffa8a8',
  '#ff7c7c',
  '#ff5050',
  '#e62e2e',
  '#cc1a1a',
  '#b30000',
  '#990000',
  '#800000',
];

export const theme = createTheme({
  primaryColor: 'primary',
  colors: {
    primary,
    success,
    warning,
    error,
  },
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
  },
  radius: {
    xs: '4px',
    sm: '6px',
    md: '8px',
    lg: '12px',
    xl: '16px',
  },
  spacing: {
    xs: '8px',
    sm: '12px',
    md: '16px',
    lg: '24px',
    xl: '32px',
  },
  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        radius: 'md',
      },
    },
    Card: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    Paper: {
      defaultProps: {
        radius: 'md',
        shadow: 'sm',
      },
    },
    TextInput: {
      defaultProps: {
        radius: 'md',
      },
    },
    Select: {
      defaultProps: {
        radius: 'md',
      },
    },
    Modal: {
      defaultProps: {
        radius: 'lg',
      },
    },
    Notifications: {
      defaultProps: {
        radius: 'md',
      },
    },
  },
});