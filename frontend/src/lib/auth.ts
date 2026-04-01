/**
 * Authentication Utilities
 * 
 * Wrappers for backend authentication endpoints.
 */

import { apiPost, apiGet } from './api';

/**
 * User type from backend
 */
export interface User {
    id: string;
    email: string;
    createdAt: string;
}

/**
 * Login with email and password
 * @param email User email
 * @param password User password
 * @returns User object on success
 */
export async function login(email: string, password: string): Promise<{ user: User }> {
    const res = await apiPost('/api/auth/login', { email, password });
    return res.json();
}

/**
 * Register new account
 * @param email User email
 * @param password User password
 * @returns User object on success
 */
export async function register(email: string, password: string): Promise<{ user: User }> {
    const res = await apiPost('/api/auth/signup', { email, password });
    return res.json();
}

/**
 * Logout current user
 */
export async function logout(): Promise<void> {
    await apiPost('/api/auth/logout', {});
}

/**
 * Get current authenticated user
 * @returns User object or null if not authenticated
 */
export async function getCurrentUser(): Promise<User | null> {
    try {
        const res = await apiGet('/api/auth/me');
        const data = await res.json();
        return data.user;
    } catch {
        return null;
    }
}
