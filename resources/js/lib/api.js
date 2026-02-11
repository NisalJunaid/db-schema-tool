const SESSION_EXPIRED_MESSAGE = 'Your session has expired. Please sign in again.';

function getCsrfToken() {
    return document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') ?? '';
}

function isFormDataPayload(data) {
    return typeof FormData !== 'undefined' && data instanceof FormData;
}

function buildHeaders({ headers = {}, body } = {}) {
    const csrfToken = getCsrfToken();
    const isFormData = isFormDataPayload(body);

    const requestHeaders = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...headers,
    };

    if (isFormData) {
        for (const key of Object.keys(requestHeaders)) {
            if (key.toLowerCase() === 'content-type') {
                delete requestHeaders[key];
            }
        }
    }

    const hasContentType = Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type');

    if (body !== undefined && !hasContentType && !isFormData) {
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
    const isFormData = isFormDataPayload(data);

    const response = await fetch(url, {
        method,
        credentials: 'same-origin',
        headers: buildHeaders({ headers, body: data }),
        body: data !== undefined ? (isFormData ? data : JSON.stringify(data)) : undefined,
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
    postForm: (url, data, options = {}) => apiRequest(url, { ...options, method: 'POST', data }),
    patch: (url, data, options = {}) => apiRequest(url, { ...options, method: 'PATCH', data }),
    delete: (url, options = {}) => apiRequest(url, { ...options, method: 'DELETE' }),
};

export { SESSION_EXPIRED_MESSAGE };
