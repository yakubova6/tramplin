import { clearSessionUser } from '../utils/sessionStore'

function createHttpError(message, status = 0, extra = {}) {
    const error = new Error(message)
    error.status = status
    error.code = extra.code || null
    error.details = extra.details || {}
    error.payload = extra.payload || null
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

export async function httpJson(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : url
    console.log('[HTTP]', options.method || 'GET', fullUrl)

    let response
    try {
        response = await fetch(fullUrl, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        })
    } catch {
        throw createHttpError('Сервер недоступен. Попробуйте позже.', 0)
    }

    const data = await parseResponseBody(response)

    if (!response.ok) {
        const message =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Ошибка запроса'

        if (response.status === 401) {
            clearSessionUser()
        }

        throw createHttpError(message, response.status, {
            code: typeof data === 'object' ? data?.code : null,
            details: typeof data === 'object' ? data?.details : {},
            payload: data,
        })
    }

    return data
}

export function toQuery(params = {}) {
    const query = new URLSearchParams()

    Object.entries(params).forEach(([key, value]) => {
        if (value === null || value === undefined || value === '') return

        if (Array.isArray(value)) {
            if (value.length === 0) return
            query.set(key, value.join(','))
            return
        }

        query.set(key, String(value))
    })

    return query.toString()
}