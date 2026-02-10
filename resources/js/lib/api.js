export async function apiRequest(url, { method = 'GET', data, headers = {} } = {}) {
    const csrfToken = document
        .querySelector('meta[name="csrf-token"]')
        ?.getAttribute('content');

    const requestHeaders = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        ...(csrfToken ? { 'X-CSRF-TOKEN': csrfToken } : {}),
        ...headers,
    };

    if (data !== undefined && !Object.keys(requestHeaders).some((key) => key.toLowerCase() === 'content-type')) {
        requestHeaders['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        method,
        headers: requestHeaders,
        credentials: 'same-origin',
        body: data !== undefined ? JSON.stringify(data) : undefined,
    });

    let payload = null;

    try {
        payload = response.status === 204 ? null : await response.json();
    } catch {
        payload = null;
    }

    if (!response.ok) {
        const error = new Error(payload?.message || 'Request failed');
        error.status = response.status;
        error.payload = payload;
        throw error;
    }

    return payload;
}
