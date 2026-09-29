import axios, { AxiosError } from 'axios';
import { tokenStorage } from '../auth/tokenStorage';
import type { ApiErrorBody } from './types';

/** Normalised API error: HTTP status plus the backend's message(s) as a list. */
export class ApiError extends Error {
  readonly status: number;
  readonly messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages[0] ?? 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.messages = messages;
  }
}

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15_000,
});

let unauthorizedHandler: (() => void) | undefined;

/** Called when an authenticated request is rejected (e.g. expired token). */
export function setUnauthorizedHandler(handler: (() => void) | undefined): void {
  unauthorizedHandler = handler;
}

apiClient.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = toApiError(error);
    const isLogin = error instanceof AxiosError && error.config?.url?.endsWith('/auth/login');
    if (apiError.status === 401 && !isLogin) {
      tokenStorage.clear();
      unauthorizedHandler?.();
    }
    return Promise.reject(apiError);
  },
);

export function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (error instanceof AxiosError) {
    const body = error.response?.data as Partial<ApiErrorBody> | undefined;
    if (error.response && body?.message) {
      const messages = Array.isArray(body.message) ? body.message : [body.message];
      return new ApiError(error.response.status, messages);
    }
    if (error.response) {
      return new ApiError(error.response.status, [`Request failed (${error.response.status})`]);
    }
    return new ApiError(0, ['Unable to reach the server. Check your connection and try again.']);
  }
  return new ApiError(0, ['Something went wrong. Please try again.']);
}
