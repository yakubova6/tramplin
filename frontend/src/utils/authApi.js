// utils/authApi.js

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
        const errorMessage = data?.message || data?.error || 'Произошла ошибка запроса'
        throw new Error(errorMessage)
    }

    return data
}

export async function registerUser(payload) {
    return request(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function loginUser(payload) {
    return request(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function validateSession() {
    return request(`${API_BASE}/validateSession`, {
        method: 'GET',
    })
}

export async function getCurrentUserInfo() {
    return request(`${API_BASE}/me`, {
        method: 'GET',
    })
}

export async function logoutUser() {
    return request(`${API_BASE}/logout`, {
        method: 'POST',
    })
}

export async function requestPasswordReset(payload) {
    return request(`${API_BASE}/forgot-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function confirmPasswordReset(payload) {
    return request(`${API_BASE}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function changePassword(payload) {
    return request(`${API_BASE}/change-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}