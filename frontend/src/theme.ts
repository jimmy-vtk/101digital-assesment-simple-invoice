import { createTheme } from '@mui/material/styles';

/** Light and dark schemes; the app follows the operating system preference. */
export const theme = createTheme({
  cssVariables: { colorSchemeSelector: 'class' },
  colorSchemes: {
    light: {
      palette: {
        primary: { main: '#1f5fbf' },
        background: { default: '#f5f7fb' },
      },
    },
    dark: {
      palette: {
        primary: { main: '#7aa7ff' },
      },
    },
  },
  shape: { borderRadius: 10 },
  typography: {
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h1: { fontSize: '1.75rem', fontWeight: 600 },
    h2: { fontSize: '1.25rem', fontWeight: 600 },
  },
  components: {
    MuiPaper: {
      defaultProps: { elevation: 0 },
      styleOverrides: { root: { backgroundImage: 'none' } },
    },
    MuiButton: { defaultProps: { disableElevation: true } },
  },
});
