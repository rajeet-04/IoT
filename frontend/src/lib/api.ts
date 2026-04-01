/**
 * API Client - Backend Communication
 * 
 * Provides typed fetch wrapper with Bearer token authentication.
 * Token is stored in localStorage for cross-origin compatibility.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

// Token management
export const tokenStore = {
    get: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('accessToken');
    },
    set: (token: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('accessToken', token);
    },
    clear: () => {
        if (typeof window === 'undefined') return;
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
    },
    setRefresh: (token: string) => {
        if (typeof window === 'undefined') return;
        localStorage.setItem('refreshToken', token);
    },
    getRefresh: (): string | null => {
        if (typeof window === 'undefined') return null;
        return localStorage.getItem('refreshToken');
    },
};

/**
 * Fetch wrapper with error handling and Bearer token support
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${BACKEND_URL}${path}`;
    const token = tokenStore.get();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options.headers as Record<string, string>),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
        ...options,
        headers,
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || response.statusText);
    }

    return response;
}

export async function apiGet(path: string): Promise<Response> {
    return apiFetch(path, { method: 'GET' });
}

export async function apiPost(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

export async function apiPut(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

export async function apiDelete(path: string): Promise<Response> {
    return apiFetch(path, { method: 'DELETE' });
}

export const getBackendUrl = () => BACKEND_URL;
export const getWebSocketUrl = () => {
    return BACKEND_URL.replace(/^http/, 'ws');
};
