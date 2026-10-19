const configuredBase = import.meta.env.VITE_API_URL?.replace(/\/+$/, '');
const productionUrl = import.meta.env.PRODUCTION_API_URL?.replace(/\/+$/, '');

function isLoopbackUrl(value) {
    if (!value) return false;

    try {
        const hostname = new URL(value).hostname;
        return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
    } catch {
        return false;
    }
}

const useProductionFallback = import.meta.env.PROD && isLoopbackUrl(configuredBase);
const BASE = import.meta.env.PROD
    ? (useProductionFallback ? productionUrl : configuredBase || productionUrl)
    : configuredBase || '';

if (useProductionFallback) {
    console.warn(`Ignoring loopback VITE_API_URL in production; using ${productionUrl}.`);
}

const TOKEN_KEY = 'key.token';

export const tokenStore = {
    get: () => localStorage.getItem(TOKEN_KEY),
    set: (t) => localStorage.setItem(TOKEN_KEY, t),
    clear: () => localStorage.removeItem(TOKEN_KEY),
};

export class ApiError extends Error {
    constructor(message, status, body) {
        super(message);
        this.status = status;
        this.body = body;
    }
}

async function request(path, { method = 'GET', body, signal } = {}) {
    const headers = {};
    const token = tokenStore.get();
    if (token) headers.Authorization = `Bearer ${token}`;

    let payload;
    if (body instanceof FormData) {
        payload = body;
    } else if (body !== undefined) {
        headers['Content-Type'] = 'application/json';
        payload = JSON.stringify(body);
    }

    let res;
    try {
        res = await fetch(`${BASE}/api${path}`, { method, headers, body: payload, signal });
    } catch (err) {
        if (err.name === 'AbortError') throw err;
        throw new ApiError('Cannot reach the server. Check that the API is running.', 0, null);
    }

    if (res.status === 204) return null;

    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }

    if (!res.ok) {
        if (res.status === 401) {
            tokenStore.clear();
            if (!location.pathname.startsWith('/login')) location.assign('/login');
        }
        const message =
            (data && (data.message || data.error)) ||
            `Request failed (${res.status}).`;
        throw new ApiError(message, res.status, data);
    }

    return data;
}

export const api = {
    get: (path, opts) => request(path, { ...opts }),
    post: (path, body, opts) => request(path, { ...opts, method: 'POST', body }),
    patch: (path, body, opts) => request(path, { ...opts, method: 'PATCH', body }),
    put: (path, body, opts) => request(path, { ...opts, method: 'PUT', body }),
    delete: (path, opts) => request(path, { ...opts, method: 'DELETE' }),
};