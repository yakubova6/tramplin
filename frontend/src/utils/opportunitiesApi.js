const API_BASE = '/api'

function toQuery(params) {
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

async function requestJson(path) {
    const response = await fetch(path, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    if (!response.ok) {
        let message = 'Не удалось выполнить запрос'
        try {
            const payload = await response.json()
            message = payload?.message || payload?.error || message
        } catch {
            // ignore
        }
        throw new Error(message)
    }

    return response.json()
}

export function getOpportunityTypeLabel(type) {
    const labels = {
        INTERNSHIP: 'Стажировка',
        VACANCY: 'Вакансия',
        MENTORING: 'Менторская программа',
        EVENT: 'Мероприятие',
    }

    return labels[type] || type
}

export function getWorkFormatLabel(format) {
    const labels = {
        OFFICE: 'Офис',
        HYBRID: 'Гибрид',
        REMOTE: 'Удалённо',
        ONLINE: 'Онлайн',
    }

    return labels[format] || format
}

export function getEmploymentTypeLabel(type) {
    const labels = {
        FULL_TIME: 'Полная занятость',
        PART_TIME: 'Частичная занятость',
        PROJECT: 'Проектная',
    }

    return labels[type] || type
}

export function getGradeLabel(grade) {
    const labels = {
        INTERN: 'Intern',
        JUNIOR: 'Junior',
        MIDDLE: 'Middle',
        SENIOR: 'Senior',
    }

    return labels[grade] || grade
}

export async function getTags(category) {
    const query = toQuery({ category })
    return requestJson(`${API_BASE}/tags${query ? `?${query}` : ''}`)
}

export async function getOpportunities(params = {}) {
    const query = toQuery(params)
    return requestJson(`${API_BASE}/opportunities${query ? `?${query}` : ''}`)
}

export async function getOpportunityMapPoints(params = {}) {
    const query = toQuery(params)
    return requestJson(`${API_BASE}/opportunities/map${query ? `?${query}` : ''}`)
}

export async function getOpportunityById(id) {
    return requestJson(`${API_BASE}/opportunities/${id}`)
}