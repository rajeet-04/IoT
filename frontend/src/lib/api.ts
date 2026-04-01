/**
 * API Client - Backend Communication
 * 
 * Provides typed fetch wrapper with cookie-based authentication.
 * All requests automatically include httpOnly cookies.
 */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';

/**
 * Fetch wrapper with error handling and cookie support
 * @param {string} path - API endpoint path
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
    const url = `${BACKEND_URL}${path}`;
    
    const response = await fetch(url, {
        ...options,
        credentials: 'include', // Include httpOnly cookies
        headers: {
            'Content-Type': 'application/json',
            ...options.headers,
        },
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || response.statusText);
    }

    return response;
}

/**
 * GET request helper
 */
export async function apiGet(path: string): Promise<Response> {
    return apiFetch(path, { method: 'GET' });
}

/**
 * POST request helper
 */
export async function apiPost(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
        method: 'POST',
        body: JSON.stringify(body),
    });
}

/**
 * PUT request helper
 */
export async function apiPut(path: string, body: unknown): Promise<Response> {
    return apiFetch(path, {
        method: 'PUT',
        body: JSON.stringify(body),
    });
}

/**
 * DELETE request helper
 */
export async function apiDelete(path: string): Promise<Response> {
    return apiFetch(path, { method: 'DELETE' });
}

// Export backend URL for WebSocket connection
export const getBackendUrl = () => BACKEND_URL;
export const getWebSocketUrl = () => {
    // Convert http:// to ws:// or https:// to wss://
    return BACKEND_URL.replace(/^http/, 'ws');
};
