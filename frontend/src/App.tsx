import { BrowserRouter } from 'react-router';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './AppRoutes';

export default function App() {
  return (
    <AppProviders>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AppProviders>
  );
}
