export async function httpJson(url, options = {}) {
    const fullUrl = url.startsWith('http') ? url : url

    console.log('[HTTP]', options.method || 'GET', fullUrl)

    const response = await fetch(fullUrl, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    })

    // Для 204 No Content — возвращаем null, не пытаемся парсить JSON
    if (response.status === 204) {
        console.log('[HTTP] No content (204)')
        return null
    }

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

    // Проверяем, есть ли тело ответа
    const text = await response.text()
    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch {
        return null
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