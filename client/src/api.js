// Centralized API helper with auto-retry logic
// Uses relative URLs - Vite proxy handles routing to backend in dev
// In production, same server serves both frontend and API

const API_BASE = '/api';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry on network failures.
 * Retries up to 3 times with exponential backoff (1s, 2s, 4s).
 * This prevents "Server connection failed" errors when the server
 * is still starting up or temporarily unavailable.
 */
export async function apiFetch(endpoint, options = {}, retries = 5) {
    const url = `${API_BASE}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
            });
            return response;
        } catch (err) {
            if (attempt === retries) {
                throw err; // All retries exhausted
            }
            // Wait before retrying: 1s, 2s, 4s, 8s, 16s (total ~31s)
            // This is crucial for handling Render.com free tier cold starts
            await delay(1000 * Math.pow(2, attempt - 1));
        }
    }
}
