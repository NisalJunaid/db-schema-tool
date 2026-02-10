const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function buildHeaders({ headers = {}, hasBody = false }) {
    const csrfToken = getCsrfToken();

    const requestHeaders = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...headers,
    };

    const hasContentType = Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type');

    if (hasBody && !hasContentType) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    return requestHeaders;
}

async function parseResponse(response) {
    try {
        return response.status === 204 ? null : await response.json();
    } catch {
        return null;
    }
}

export async function apiRequest(url, { method = 'GET', data, headers = {} } = {}) {
    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: buildHeaders({ headers, hasBody: data !== undefined }),
        body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    const payload = await parseResponse(response);

    if (!response.ok) {
        const error = new Error(payload?.message || (response.status === 401 ? SESSION_EXPIRED_MESSAGE : 'Request failed'));
        error.status = response.status;
        error.payload = payload;
        error.isAuthenticationError = response.status === 401;
        throw error;
    }

    return payload;
}

export const api = {
    get: (url, options = {}) => apiRequest(url, { ...options, method: 'GET' }),
    post: (url, data, options = {}) => apiRequest(url, { ...options, method: 'POST', data }),
    patch: (url, data, options = {}) => apiRequest(url, { ...options, method: 'PATCH', data }),
    delete: (url, options = {}) => apiRequest(url, { ...options, method: 'DELETE' }),
};

export { SESSION_EXPIRED_MESSAGE };
