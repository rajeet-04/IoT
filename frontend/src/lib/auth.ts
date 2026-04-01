/**
 * Authentication Utilities
 */

import { apiPost, apiGet, tokenStore } from './api';

export interface User {
    id: string;
    email: string;
    createdAt?: string;
}

/**
 * Login with email and password - stores token in localStorage
 */
export async function login(email: string, password: string): Promise<{ user: User }> {
    const res = await apiPost('/api/auth/login', { email, password });
    const data = await res.json();
    
    // Store tokens from response body
    if (data.accessToken) tokenStore.set(data.accessToken);
    if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
    
    return data;
}

/**
 * Register new account
 */
export async function register(email: string, password: string): Promise<{ user: User }> {
    const res = await apiPost('/api/auth/signup', { email, password });
    const data = await res.json();
    
    if (data.accessToken) tokenStore.set(data.accessToken);
    if (data.refreshToken) tokenStore.setRefresh(data.refreshToken);
    
    return data;
}

/**
 * Logout: clear local tokens
 */
export async function logout(): Promise<void> {
    try {
        await apiPost('/api/auth/logout', {});
    } finally {
        tokenStore.clear();
    }
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(): Promise<User | null> {
    const token = tokenStore.get();
    if (!token) return null;
    
    try {
        const res = await apiGet('/api/auth/me');
        const data = await res.json();
        return data.user;
    } catch {
        tokenStore.clear();
        return null;
    }
}

/**
 * Check if user is logged in (synchronous check)
 */
export function isAuthenticated(): boolean {
    return !!tokenStore.get();
}
