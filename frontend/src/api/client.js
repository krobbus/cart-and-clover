const productionUrl = import.meta.env.PRODUCTION_API_URL?.trim().replace(/\/+$/, '');
const configuredBase = import.meta.env.VITE_API_URL?.trim().replace(/\/+$/, '');
const token = import.meta.env.TOKEN?.trim().replace(/\/+$/, '');

function isPublicApiUrl(value) {
    if (!value) return false;

    try {
        const url = new URL(value);
        return (
            (url.protocol === 'http:' || url.protocol === 'https:') &&
            !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
        );
    } catch {
        return false;
    }
}

const BASE = import.meta.env.PROD
    ? (isPublicApiUrl(configuredBase) ? configuredBase : productionUrl)
    : configuredBase || '';

export const tokenStore = {
    get: () => localStorage.getItem(token),
    set: (t) => localStorage.setItem(token, t),
    clear: () => localStorage.removeItem(token),
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