import { clearHttpGetCache, httpJson, toQuery } from './http'
import { getSessionUserId } from '@/shared/lib/utils/sessionStore'

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

function getRequiredUserId() {
    const userId = getSessionUserId()
    if (!userId) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return userId
}

export async function listOpportunities(params = {}) {
    const query = toQuery(params)
    return httpJson(`${API_BASE}/opportunities${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: 10_000,
    })
}

export async function listOpportunityMap(params = {}) {
    const query = toQuery(params)
    return httpJson(`${API_BASE}/opportunities/map${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: 8_000,
    })
}

export async function listNearbyOpportunities(params = {}) {
    const rawRadius = params.radius
    const numericRadius = Number(rawRadius)
    const normalizedRadius = Number.isFinite(numericRadius)
        ? (numericRadius > 0 && numericRadius < 1000 ? numericRadius * 1000 : numericRadius)
        : rawRadius

    const query = toQuery({
        ...params,
        radius: normalizedRadius,
    })

    return httpJson(`${API_BASE}/geo/opportunities/nearby${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: 8_000,
    })
}

export async function getOpportunity(id) {
    return httpJson(`${API_BASE}/opportunities/${id}`, {
        dedupe: true,
        cacheTtlMs: 15_000,
    })
}

export async function listTags(category) {
    const query = toQuery({ category })
    return httpJson(`${API_BASE}/tags${query ? `?${query}` : ''}`, {
        dedupe: true,
        cacheTtlMs: 60_000,
    })
}

export async function listEmployerOpportunities(params = {}) {
    const currentUserId = getRequiredUserId()

    const fullQuery = toQuery({
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
        sortBy: params.sortBy || 'UPDATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        status: params.status,
        group: params.group,
        type: params.type,
        workFormat: params.workFormat,
        search: params.search,
        currentUserId,
    })

    try {
        return await httpJson(`${API_BASE}/employer/opportunities?${fullQuery}`, {
            dedupe: true,
            cacheTtlMs: 7_000,
        })
    } catch (error) {
        const fallbackQuery = toQuery({ currentUserId })

        return httpJson(`${API_BASE}/employer/opportunities?${fallbackQuery}`, {
            dedupe: true,
            cacheTtlMs: 7_000,
        })
    }
}

export async function getEmployerOpportunity(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    return httpJson(`${API_BASE}/employer/opportunities/${id}?${query}`, {
        dedupe: true,
        cacheTtlMs: 12_000,
    })
}

export async function createEmployerOpportunity(payload) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    const data = await httpJson(`${API_BASE}/employer/opportunities?${query}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
    clearHttpGetCache('/api/employer/opportunities')
    return data
}

export async function updateEmployerOpportunity(id, payload) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    const data = await httpJson(`${API_BASE}/employer/opportunities/${id}?${query}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
    })
    clearHttpGetCache('/api/employer/opportunities')
    return data
}

export async function closeEmployerOpportunity(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    const data = await httpJson(`${API_BASE}/employer/opportunities/${id}/close?${query}`, {
        method: 'POST',
    })
    clearHttpGetCache('/api/employer/opportunities')
    return data
}

export async function archiveEmployerOpportunity(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    const data = await httpJson(`${API_BASE}/employer/opportunities/${id}/archive?${query}`, {
        method: 'POST',
    })
    clearHttpGetCache('/api/employer/opportunities')
    return data
}

export async function returnToDraftEmployerOpportunity(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    const data = await httpJson(`${API_BASE}/employer/opportunities/${id}/return-to-draft?${query}`, {
        method: 'POST',
    })
    clearHttpGetCache('/api/employer/opportunities')
    return data
}

export async function uploadOpportunityMedia(id, file) {
    const currentUserId = getRequiredUserId()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('currentUserId', currentUserId)

    const response = await fetch(`${API_BASE}/employer/opportunities/${id}/media`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
    })

    if (!response.ok) {
        const error = new Error('Ошибка загрузки файла')
        error.status = response.status
        throw error
    }

    return response.json()
}

export async function deleteOpportunityMedia(id, attachmentId) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    return httpJson(`${API_BASE}/employer/opportunities/${id}/media/${attachmentId}?${query}`, {
        method: 'DELETE',
    })
}

export async function getOpportunityModerationTask(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    return httpJson(`${API_BASE}/employer/opportunities/${id}/moderation-task?${query}`)
}

export async function cancelOpportunityModerationTask(id) {
    const currentUserId = getRequiredUserId()
    const query = toQuery({ currentUserId })

    return httpJson(`${API_BASE}/employer/opportunities/${id}/moderation-task/cancel?${query}`, {
        method: 'POST',
    })
}
