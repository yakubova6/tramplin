import { toQuery } from './http'
import { translateStatusTokensInText } from '@/shared/lib/utils/statusLabels'

const API_BASE = '/api/admin/curators'
const CSRF_URL = '/api/auth/csrf'

let csrfState = null

function createError(message, status = 0, code = null) {
    const error = new Error(translateStatusTokensInText(message))
    error.status = status
    error.code = code
    return error
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
        response = await fetch(CSRF_URL, {
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
    const token = data?.token || ''

    if (!token) {
        throw createError(
            'Не удалось подготовить защищённый запрос. Обновите страницу и попробуйте снова.',
            response.status || 0
        )
    }

    csrfState = {
        headerName,
        token,
    }

    return csrfState
}

async function adminRequest(url, options = {}) {
    const {
        headers: customHeaders,
        skipCsrf = false,
        _retryWithFreshCsrf = false,
        forceCsrfRefresh = false,
        ...fetchOptions
    } = options

    const method = (fetchOptions.method || 'GET').toUpperCase()
    const shouldAttachCsrf =
        !skipCsrf && !['GET', 'HEAD', 'OPTIONS'].includes(method)

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

            return adminRequest(url, {
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
            'Ошибка запроса'

        const code =
            (typeof data === 'object' && (data?.code || data?.errorCode)) || null

        throw createError(message, response.status, code)
    }

    return data
}

export async function getCurators(params = {}) {
    const query = toQuery({
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        search: params.search?.trim() || undefined,
    })

    return adminRequest(`${API_BASE}${query ? `?${query}` : ''}`, {
        method: 'GET',
        skipCsrf: true,
    })
}

export async function getCuratorDetail(curatorId) {
    return adminRequest(`${API_BASE}/${curatorId}`, {
        method: 'GET',
        skipCsrf: true,
    })
}

export async function createCurator(payload) {
    return adminRequest(API_BASE, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function updateCuratorAccess(curatorId, payload) {
    return adminRequest(`${API_BASE}/${curatorId}/access`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}
