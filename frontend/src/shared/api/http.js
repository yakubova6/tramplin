
import { translateStatusTokensInText } from '@/shared/lib/utils/statusLabels'

function createHttpError(message, status = 0, extra = {}) {
    const error = new Error(translateStatusTokensInText(message))
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

let sessionUserCache = null
let sessionUserCacheAt = 0
const SESSION_CACHE_TTL_MS = 15_000
const GET_RESPONSE_CACHE = new Map()
const GET_IN_FLIGHT_REQUESTS = new Map()

export function clearSessionUserCache() {
    sessionUserCache = null
    sessionUserCacheAt = 0
}

export function clearHttpGetCache(match = null) {
    if (!match) {
        GET_RESPONSE_CACHE.clear()
        return
    }

    for (const key of GET_RESPONSE_CACHE.keys()) {
        if (typeof match === 'string' ? key.includes(match) : match.test(key)) {
            GET_RESPONSE_CACHE.delete(key)
        }
    }
}

export async function httpJson(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : url
    const method = (options.method || 'GET').toUpperCase()
    const cacheTtlMs = Number(options.cacheTtlMs) || 0
    const dedupe = Boolean(options.dedupe)
    const force = Boolean(options.force)
    const cacheKey = options.cacheKey || `${method}:${fullUrl}`
    const requestOptions = { ...options }

    delete requestOptions.cacheTtlMs
    delete requestOptions.cacheKey
    delete requestOptions.dedupe
    delete requestOptions.force

    const canUseGetCache = method === 'GET' && cacheTtlMs > 0
    const canUseInFlightDedupe = method === 'GET' && dedupe

    if (!force && canUseGetCache) {
        const cached = GET_RESPONSE_CACHE.get(cacheKey)
        if (cached && cached.expiresAt > Date.now()) {
            return cached.data
        }
    }

    if (!force && canUseInFlightDedupe) {
        const inFlight = GET_IN_FLIGHT_REQUESTS.get(cacheKey)
        if (inFlight) {
            return inFlight
        }
    }

    const requestPromise = (async () => {
        let response
        try {
            response = await fetch(fullUrl, {
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    ...(requestOptions.headers || {}),
                },
                ...requestOptions,
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
                clearSessionUserCache()
            }

            throw createHttpError(message, response.status, {
                code: typeof data === 'object' ? data?.code : null,
                details: typeof data === 'object' ? data?.details : {},
                payload: data,
            })
        }

        if (canUseGetCache) {
            GET_RESPONSE_CACHE.set(cacheKey, {
                data,
                expiresAt: Date.now() + cacheTtlMs,
            })
        }

        return data
    })()

    if (canUseInFlightDedupe) {
        GET_IN_FLIGHT_REQUESTS.set(cacheKey, requestPromise)
    }

    try {
        return await requestPromise
    } finally {
        if (canUseInFlightDedupe) {
            GET_IN_FLIGHT_REQUESTS.delete(cacheKey)
        }
    }
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

function mapSessionUser(response) {
    if (!response?.user) return null

    return {
        id: response.user.id,
        userId: response.user.id,
        displayName: response.user.displayName || '',
        email: response.user.email || '',
        role: response.user.role || '',
        twoFactorEnabled: Boolean(response.user.twoFactorEnabled),
    }
}

export async function getSessionUserFromApi({ force = false } = {}) {
    const isFresh =
        sessionUserCache &&
        Date.now() - sessionUserCacheAt < SESSION_CACHE_TTL_MS

    if (!force && isFresh) {
        return sessionUserCache
    }

    try {
        const data = await httpJson('/api/auth/me')
        const mapped = mapSessionUser(data)
        sessionUserCache = mapped
        sessionUserCacheAt = Date.now()
        return mapped
    } catch (error) {
        if (error?.status === 401) {
            clearSessionUserCache()
            return null
        }

        throw error
    }
}

export async function getSessionUserIdFromApi(options = {}) {
    const user = await getSessionUserFromApi(options)
    return user?.id || null
}

export async function getRequiredCurrentUserPayload() {
    const user = await getSessionUserFromApi()
    if (!user?.id || !user?.email || !user?.role) {
        throw createHttpError('Пользователь не авторизован', 401)
    }

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    }
}
