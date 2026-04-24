import { clearSessionUser, setSessionUser } from '@/shared/lib/utils/sessionStore'
import { clearSessionUserCache, getSessionUserFromApi } from './http'
import { translateStatusTokensInText } from '@/shared/lib/utils/statusLabels'

const API_BASE = '/api/auth'

let csrfState = null

const SESSION_ERROR_CODES = new Set([
    'invalid_session',
])

function createError(message, status = 0, code = null) {
    const error = new Error(translateStatusTokensInText(message))
    error.status = status
    error.code = code
    return error
}

function readCookie(name) {
    if (typeof document === 'undefined') return ''

    const escapedName = name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&')
    const match = document.cookie.match(
        new RegExp(`(?:^|; )${escapedName}=([^;]*)`)
    )

    return match ? decodeURIComponent(match[1]) : ''
}

async function parseResponseBody(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (isJson) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }

    try {
        const text = await response.text()
        return text || null
    } catch {
        return null
    }
}

async function getCsrf(forceRefresh = false) {
    if (csrfState && !forceRefresh) {
        return csrfState
    }

    let response

    try {
        response = await fetch(`${API_BASE}/csrf`, {
            method: 'GET',
            credentials: 'include',
        })
    } catch {
        throw createError(
            'Не удалось подготовить защищённый запрос. Попробуйте ещё раз.',
            0
        )
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
        const message =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            'Не удалось получить CSRF-токен'

        throw createError(message, response.status)
    }

    const headerName = data?.headerName || 'X-XSRF-TOKEN'
    const token = data?.token || readCookie('XSRF-TOKEN')

    if (!token) {
        throw createError(
            'Не удалось подготовить защищённый запрос. Попробуйте обновить страницу.',
            response.status || 0
        )
    }

    csrfState = {
        headerName,
        token,
    }

    return csrfState
}

async function request(url, options = {}) {
    const {
        headers: customHeaders,
        skipCsrf = false,
        _retryWithFreshCsrf = false,
        forceCsrfRefresh = false,
        ...fetchOptions
    } = options

    const method = (fetchOptions.method || 'GET').toUpperCase()
    const shouldAttachCsrf = !skipCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)

    const headers = {
        'Content-Type': 'application/json',
        ...(customHeaders || {}),
    }

    if (shouldAttachCsrf) {
        const csrf = await getCsrf(forceCsrfRefresh)
        headers[csrf.headerName] = csrf.token
    }

    let response

    try {
        response = await fetch(url, {
            credentials: 'include',
            headers,
            ...fetchOptions,
        })
    } catch {
        throw createError(
            'Сервер недоступен. Проверьте подключение и попробуйте снова.',
            0
        )
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
        if (response.status === 403 && shouldAttachCsrf && !_retryWithFreshCsrf) {
            csrfState = null

            return request(url, {
                ...fetchOptions,
                headers: customHeaders,
                skipCsrf,
                _retryWithFreshCsrf: true,
                forceCsrfRefresh: true,
            })
        }

        const message =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Произошла ошибка запроса'

        const code =
            (typeof data === 'object' && (data?.code || data?.errorCode)) || null

        if (SESSION_ERROR_CODES.has(code)) {
            clearSessionUser()
        }

        throw createError(message, response.status, code)
    }

    return data
}

export async function registerUser(payload) {
    const response = await request(`${API_BASE}/register`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function confirmRegistration(payload) {
    const response = await request(`${API_BASE}/register/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function resendRegistrationCode(payload) {
    return request(`${API_BASE}/register/resend`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })
}

export async function loginUser(payload) {
    const response = await request(`${API_BASE}/login`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function verifyLoginTwoFactor(payload) {
    const response = await request(`${API_BASE}/2fa/login/verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })

    if (response?.user) {
        setSessionUser(response.user)
    }

    return response
}

export async function resendLoginTwoFactorCode(payload) {
    return request(`${API_BASE}/2fa/login/resend`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })
}

export async function requestEnableTwoFactor(payload) {
    return request(`${API_BASE}/2fa/enable/request`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function confirmEnableTwoFactor(payload) {
    return request(`${API_BASE}/2fa/enable/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function requestDisableTwoFactor(payload) {
    return request(`${API_BASE}/2fa/disable/request`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function confirmDisableTwoFactor(payload) {
    return request(`${API_BASE}/2fa/disable/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function requestPasswordReset(payload) {
    return request(`${API_BASE}/password-reset/request`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })
}

export async function verifyPasswordResetCode(payload) {
    return request(`${API_BASE}/password-reset/verify`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })
}

export async function confirmPasswordReset(payload) {
    return request(`${API_BASE}/password-reset/confirm`, {
        method: 'POST',
        body: JSON.stringify(payload),
        skipCsrf: true,
    })
}

export async function validateSession() {
    return request(`${API_BASE}/validateSession`, {
        method: 'GET',
    })
}

export async function getCurrentUserInfo() {
    try {
        const user = await getSessionUserFromApi({ force: false })

        if (user) {
            setSessionUser(user)
        } else {
            clearSessionUser()
            clearSessionUserCache()
        }

        return user
    } catch (error) {
        if ([401, 403, 404, 500, 502, 503].includes(error.status)) {
            clearSessionUser()
            clearSessionUserCache()
            return null
        }

        throw error
    }
}

export async function logoutUser() {
    try {
        await request(`${API_BASE}/logout`, {
            method: 'POST',
        })
    } finally {
        clearSessionUser()
        clearSessionUserCache()
        csrfState = null
    }

    return null
}
