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

/**
 * Регистрация нового пользователя
 * @param {Object} payload - { displayName, email, password, role, status }
 */
export async function registerUser(payload) {
    return request(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

/**
 * Авторизация пользователя
 * @param {Object} payload - { email, password }
 */
export async function loginUser(payload) {
    return request(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

/**
 * Проверка текущей сессии (передаётся sessionId через cookie)
 */
export async function validateSession() {
    return request(`${API_BASE}/validateSession`, {
        method: 'GET',
    })
}

/**
 * Выход из системы
 */
export async function logoutUser() {
    return request(`${API_BASE}/logout`, {
        method: 'POST',
    })
}

/**
 * Сброс пароля (запрос)
 * @param {Object} payload - { email }
 */
export async function requestPasswordReset(payload) {
    return request(`${API_BASE}/forgot-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

/**
 * Подтверждение сброса пароля
 * @param {Object} payload - { token, newPassword }
 */
export async function confirmPasswordReset(payload) {
    return request(`${API_BASE}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

/**
 * Изменение пароля (для авторизованных пользователей)
 * @param {Object} payload - { currentPassword, newPassword }
 */
export async function changePassword(payload) {
    return request(`${API_BASE}/change-password`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}