export async function httpJson(url, options = {}) {
    console.log('[HTTP]', options.method || 'GET', url)

    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    })

    if (!response.ok) {
        let message = 'Ошибка запроса'
        try {
            const payload = await response.json()
            message = payload?.message || payload?.error || message
        } catch {
            // ignore
        }
        throw new Error(message)
    }

    if (response.status === 204) return null

    return response.json()
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