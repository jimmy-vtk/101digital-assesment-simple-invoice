import LogoutIcon from '@mui/icons-material/Logout';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import Link from '@mui/material/Link';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { Suspense } from 'react';
import { Outlet, Link as RouterLink } from 'react-router';
import { useAuth } from '../auth/authContext';
import { ScrollToTop } from './ScrollToTop';

export function AppLayout() {
  const { user, logout } = useAuth();
  const isWide = useMediaQuery(useTheme().breakpoints.up('sm'));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ScrollToTop />
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          <Link
            component={RouterLink}
            to="/"
            underline="none"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1, minWidth: 0 }}
          >
            <ReceiptLongIcon color="primary" />
            <Typography variant="h6" component="span" noWrap sx={{ fontWeight: 700 }}>
              SimpleInvoice
            </Typography>
          </Link>
          {user && isWide && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {user.fullname}
            </Typography>
          )}
          {isWide ? (
            <Button color="inherit" startIcon={<LogoutIcon />} onClick={logout}>
              Log out
            </Button>
          ) : (
            <Tooltip title="Log out">
              <IconButton color="inherit" onClick={logout} aria-label="Log out">
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          )}
        </Toolbar>
      </AppBar>
      <Container
        component="main"
        maxWidth="lg"
        sx={{ py: { xs: 2, sm: 4 }, px: { xs: 2, sm: 3 }, flexGrow: 1 }}
      >
        <Suspense fallback={<LinearProgress aria-label="Loading page" />}>
          <Outlet />
        </Suspense>
      </Container>
    </Box>
  );
}
