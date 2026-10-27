import { useAuthStore } from '@/lib/store/useAuthStore';

export interface ApiFetchOptions extends RequestInit {
  retryOn401?: boolean;
}

let refreshPromise: Promise<{
  accessToken: string;
  refreshToken: string;
  user: any;
} | null> | null = null;

async function refreshTokens(currentRefreshToken: string) {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      try {
        const res = await fetch('/api/v1/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefreshToken }),
        });
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      } finally {
        refreshPromise = null;
      }
    })();
  }
  return refreshPromise;
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<Response> {
  const { retryOn401 = true, ...fetchOptions } = options;
  const { accessToken, refreshToken, setAuth, logout } = useAuthStore.getState();

  const headers = new Headers(fetchOptions.headers || {});

  if (accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, {
    ...fetchOptions,
    headers,
  });

  // If 401 Unauthorized, attempt auto-refresh once
  if (
    response.status === 401 &&
    retryOn401 &&
    refreshToken &&
    !url.includes('/auth/refresh') &&
    !url.includes('/auth/login')
  ) {
    const refreshData = await refreshTokens(refreshToken);

    if (refreshData) {
      setAuth(refreshData.user, refreshData.accessToken, refreshData.refreshToken);

      // Retry original request with new Access Token
      const retryHeaders = new Headers(fetchOptions.headers || {});
      retryHeaders.set('Authorization', `Bearer ${refreshData.accessToken}`);
      if (!retryHeaders.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
        retryHeaders.set('Content-Type', 'application/json');
      }

      response = await fetch(url, {
        ...fetchOptions,
        headers: retryHeaders,
        retryOn401: false,
      } as ApiFetchOptions);
    } else {
      logout();
      if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
  }

  return response;
}
