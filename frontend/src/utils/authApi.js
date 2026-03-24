const API_BASE = '/api/auth'

async function request(url, options = {}) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    })

    let data = null

    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok) {
        const errorMessage =
            data?.message || data?.error || 'Произошла ошибка запроса'
        throw new Error(errorMessage)
    }

    return data
}

export async function loginUser(payload) {
    return request(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function registerUser(payload) {
    return request(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function validateSession() {
    return request(`${API_BASE}/validateSession`, {
        method: 'GET',
    })
}