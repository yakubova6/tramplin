import { httpJson, toQuery } from './http'

const API_BASE = '/api'

export const OPPORTUNITY_LABELS = {
    type: {
        INTERNSHIP: 'Стажировка',
        VACANCY: 'Вакансия',
        MENTORING: 'Менторская программа',
        EVENT: 'Мероприятие',
    },
    workFormat: {
        OFFICE: 'Офис',
        HYBRID: 'Гибрид',
        REMOTE: 'Удалённо',
        ONLINE: 'Онлайн',
    },
    employmentType: {
        FULL_TIME: 'Полная занятость',
        PART_TIME: 'Частичная занятость',
        PROJECT: 'Проектная',
    },
    grade: {
        INTERN: 'Intern',
        JUNIOR: 'Junior',
        MIDDLE: 'Middle',
        SENIOR: 'Senior',
    },
    status: {
        DRAFT: 'Черновик',
        PENDING_MODERATION: 'На модерации',
        PUBLISHED: 'Опубликовано',
        REJECTED: 'Отклонено',
        CLOSED: 'Закрыто',
        ARCHIVED: 'В архиве',
        PLANNED: 'Запланировано',
    },
}

export async function listOpportunities(params = {}) {
    const query = toQuery(params)
    console.log('[API] listOpportunities:', `${API_BASE}/opportunities${query ? `?${query}` : ''}`)
    return httpJson(`${API_BASE}/opportunities${query ? `?${query}` : ''}`)
}

export async function listOpportunityMap(params = {}) {
    const query = toQuery(params)
    console.log('[API] listOpportunityMap:', `${API_BASE}/opportunities/map${query ? `?${query}` : ''}`)
    return httpJson(`${API_BASE}/opportunities/map${query ? `?${query}` : ''}`)
}

export async function getOpportunity(id) {
    console.log('[API] getOpportunity:', `${API_BASE}/opportunities/${id}`)
    return httpJson(`${API_BASE}/opportunities/${id}`)
}

export async function listTags(category) {
    const query = toQuery({ category })
    console.log('[API] listTags:', `${API_BASE}/tags${query ? `?${query}` : ''}`)
    return httpJson(`${API_BASE}/tags${query ? `?${query}` : ''}`)
}

// Employer endpoints
export async function listEmployerOpportunities(params = {}) {
    const query = toQuery(params)
    return httpJson(`${API_BASE}/employer/opportunities${query ? `?${query}` : ''}`)
}

export async function getEmployerOpportunity(id) {
    return httpJson(`${API_BASE}/employer/opportunities/${id}`)
}

export async function createEmployerOpportunity(payload) {
    return httpJson(`${API_BASE}/employer/opportunities`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function updateEmployerOpportunity(id, payload) {
    return httpJson(`${API_BASE}/employer/opportunities/${id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    })
}

export async function closeEmployerOpportunity(id) {
    return httpJson(`${API_BASE}/employer/opportunities/${id}/close`, { method: 'POST' })
}

export async function archiveEmployerOpportunity(id) {
    return httpJson(`${API_BASE}/employer/opportunities/${id}/archive`, { method: 'POST' })
}

export async function returnToDraftEmployerOpportunity(id) {
    return httpJson(`${API_BASE}/employer/opportunities/${id}/return-to-draft`, { method: 'POST' })
}

// Отклик на вакансию
export async function applyToOpportunity(opportunityId, message = '') {
    console.log('[API] applyToOpportunity:', `${API_BASE}/opportunities/${opportunityId}/apply`)
    return httpJson(`${API_BASE}/opportunities/${opportunityId}/apply`, {
        method: 'POST',
        body: JSON.stringify({ message }),
    })
}