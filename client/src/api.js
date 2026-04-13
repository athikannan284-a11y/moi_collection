// Centralized API helper with auto-retry logic and strict timeouts
// This prevents the app from "hanging" or "freezing" on slow networks.

const API_BASE = '/api';
const REQUEST_TIMEOUT = 15000; // 15 Seconds strict timeout

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Fetch with automatic retry and strict timeout.
 */
export async function apiFetch(endpoint, options = {}, retries = 5) {
    const url = `${API_BASE}${endpoint}`;

    for (let attempt = 1; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

        try {
            const response = await fetch(url, {
                headers: { 'Content-Type': 'application/json' },
                ...options,
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            return response;
        } catch (err) {
            clearTimeout(timeoutId);
            const isTimeout = err.name === 'AbortError';
            
            if (attempt === retries || isTimeout) {
                // If it's a timeout or we've run out of retries, throw the error
                // This allows the calling component to fall back to local data immediately.
                throw err;
            }
            
            // Wait before retrying: 1s, 2s, 4s, etc.
            await delay(1000 * Math.pow(2, attempt - 1));
        }
    }
}
