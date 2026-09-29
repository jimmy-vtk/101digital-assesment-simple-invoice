import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { AppProviders } from '../AppProviders';
import { createQueryClient } from '../queryClient';
import { AppRoutes } from '../AppRoutes';
import { tokenStorage } from '../auth/tokenStorage';

/** Exposes the current URL so tests can assert navigation. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>;
}

/**
 * Renders the whole app (real routes, providers and API client) at `route`,
 * with the network served by the MSW fake backend.
 */
export function renderApp(route = '/', { signedIn = true } = {}) {
  if (signedIn) tokenStorage.set('test-token', 3600);
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({
    queries: { ...queryClient.getDefaultOptions().queries, retry: false },
  });

  const user = userEvent.setup();
  const result = render(
    <AppProviders queryClient={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        <AppRoutes />
        <LocationProbe />
      </MemoryRouter>
    </AppProviders>,
  );
  return { ...result, user, location: () => screen.getByTestId('location').textContent };
}
