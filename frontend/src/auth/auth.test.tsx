import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { TEST_PASSWORD, TEST_USER } from '../test/fixtures';
import { renderApp } from '../test/render';
import { API, server } from '../test/server';
import { tokenStorage } from './tokenStorage';

async function fillLogin(
  user: ReturnType<typeof renderApp>['user'],
  email: string,
  password: string,
) {
  await user.type(screen.getByLabelText(/email address/i), email);
  await user.type(screen.getByLabelText(/password/i), password);
  await user.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('authentication', () => {
  it('redirects signed-out users to the login screen', async () => {
    const { location } = renderApp('/invoices/new', { signedIn: false });
    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(location()).toBe('/login');
  });

  it('validates the form before calling the API', async () => {
    const { user } = renderApp('/login', { signedIn: false });
    await user.click(await screen.findByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
    expect(screen.getByText('Password is required')).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument();
  });

  it('shows an error for wrong credentials and stays on the login page', async () => {
    const { user, location } = renderApp('/login', { signedIn: false });
    await fillLogin(user, TEST_USER.email, 'wrong-password');
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password.');
    expect(location()).toBe('/login');
    expect(tokenStorage.get()).toBeNull();
  });

  it('signs in, stores the token and returns to the page the user wanted', async () => {
    const { user, location } = renderApp('/invoices/new', { signedIn: false });
    await fillLogin(user, TEST_USER.email, TEST_PASSWORD);

    expect(await screen.findByRole('heading', { name: 'New invoice' })).toBeInTheDocument();
    expect(location()).toBe('/invoices/new');
    expect(tokenStorage.get()).toBe('test-token');
    expect(await screen.findByText(TEST_USER.fullname)).toBeInTheDocument();
  });

  it('logs out and clears the session', async () => {
    const { user, location } = renderApp('/');
    await screen.findByText(TEST_USER.fullname);
    await user.click(screen.getByRole('button', { name: /^log out$/i }));

    expect(await screen.findByRole('heading', { name: /sign in/i })).toBeInTheDocument();
    expect(location()).toBe('/login');
    expect(tokenStorage.get()).toBeNull();
  });

  it('sends the user to login when the API rejects the token (e.g. expired)', async () => {
    server.use(
      http.get(`${API}/invoices`, () =>
        HttpResponse.json(
          { statusCode: 401, message: 'Unauthorized', error: 'Unauthorized' },
          { status: 401 },
        ),
      ),
    );
    const { location } = renderApp('/');
    await waitFor(() => expect(location()).toBe('/login'));
    expect(tokenStorage.get()).toBeNull();
  });

  it('ignores an expired stored token', () => {
    tokenStorage.set('old-token', 60, Date.now() - 120_000);
    expect(tokenStorage.get()).toBeNull();
  });
});
