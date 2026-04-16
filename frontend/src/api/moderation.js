import { httpJson, toQuery } from './http'

const API_BASE = '/api/moderation'

async function httpForm(url, formData, options = {}) {
    const response = await fetch(url, {
        method: options.method || 'POST',
        body: formData,
        credentials: 'include',
        headers: {
            ...(options.headers || {}),
        },
    })

    const contentType = response.headers.get('content-type') || ''
    const data = contentType.includes('application/json')
        ? await response.json().catch(() => null)
        : await response.text().catch(() => null)

    if (!response.ok) {
        const message = (typeof data === 'object' && data?.message)
            || (typeof data === 'object' && data?.error)
            || (typeof data === 'string' && data)
            || 'Ошибка запроса'

        const error = new Error(message)
        error.status = response.status
        throw error
    }

    return data
}

export const ENTITY_TYPES = [
    { value: '', label: 'Все типы' },
    { value: 'APPLICANT_PROFILE', label: 'Профиль соискателя' },
    { value: 'EMPLOYER_PROFILE', label: 'Профиль работодателя' },
    { value: 'EMPLOYER_VERIFICATION', label: 'Верификация компании' },
    { value: 'OPPORTUNITY', label: 'Вакансия' },
    { value: 'TAG', label: 'Тег' },
]

export const TASK_TYPES = [
    { value: '', label: 'Все типы' },
    { value: 'PROFILE_REVIEW', label: 'Проверка профиля' },
    { value: 'COMPANY_REVIEW', label: 'Проверка компании' },
    { value: 'VERIFICATION_REVIEW', label: 'Проверка верификации' },
    { value: 'OPPORTUNITY_REVIEW', label: 'Проверка вакансии' },
    { value: 'TAG_REVIEW', label: 'Проверка тега' },
    { value: 'CONTENT_REVIEW', label: 'Проверка контента' },
]

export const TASK_STATUSES = [
    { value: '', label: 'Все статусы' },
    { value: 'OPEN', label: 'Открытые' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'APPROVED', label: 'Одобренные' },
    { value: 'REJECTED', label: 'Отклонённые' },
    { value: 'NEEDS_REVISION', label: 'Нужны правки' },
    { value: 'CANCELLED', label: 'Отменённые' },
]

export const PRIORITIES = [
    { value: '', label: 'Все приоритеты' },
    { value: 'LOW', label: 'Низкий' },
    { value: 'MEDIUM', label: 'Средний' },
    { value: 'HIGH', label: 'Высокий' },
]

export const SEVERITY_OPTIONS = [
    { value: 'LOW', label: 'Низкая' },
    { value: 'NORMAL', label: 'Средняя' },
    { value: 'HIGH', label: 'Высокая' },
    { value: 'CRITICAL', label: 'Критическая' },
]

export const SORT_OPTIONS = [
    { value: 'createdAt,desc', label: 'Сначала новые' },
    { value: 'createdAt,asc', label: 'Сначала старые' },
    { value: 'updatedAt,desc', label: 'Недавно обновлённые' },
    { value: 'updatedAt,asc', label: 'Давно обновлённые' },
    { value: 'priority,desc', label: 'Сначала высокий приоритет' },
    { value: 'priority,asc', label: 'Сначала низкий приоритет' },
]

export async function getModerationTasks(params = {}) {
    const query = toQuery({
        status: params.status,
        taskType: params.taskType,
        entityType: params.entityType,
        priority: params.priority,
        assigneeUserId: params.assigneeUserId,
        mine: params.mine,
        createdFrom: params.createdFrom,
        createdTo: params.createdTo,
        page: params.page ?? 0,
        size: params.size ?? 20,
        sort: params.sort || 'createdAt,desc',
    })

    return httpJson(`${API_BASE}/tasks${query ? `?${query}` : ''}`)
}

export async function getModerationTaskDetail(taskId) {
    return httpJson(`${API_BASE}/tasks/${taskId}`)
}

export async function getEntityModerationHistory(entityType, entityId) {
    return httpJson(`${API_BASE}/entities/${entityType}/${entityId}/history`)
}

export async function getEntityAttachments(entityType, entityId) {
    return httpJson(`${API_BASE}/entities/${entityType}/${entityId}/attachments`)
}

export async function getModerationDashboard() {
    return httpJson(`${API_BASE}/dashboard`)
}

export async function approveModerationTask(taskId, payload) {
    const body = {
        comment: payload.comment || '',
        reasonCode: payload.reasonCode || '',
        applyPatch: payload.applyPatch || {},
        notifyUser: payload.notifyUser ?? true,
    }

    return httpJson(`${API_BASE}/tasks/${taskId}/approve`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function rejectModerationTask(taskId, payload) {
    const body = {
        comment: payload.comment || '',
        reasonCode: payload.reasonCode || '',
        severity: payload.severity || 'NORMAL',
        notifyUser: payload.notifyUser ?? true,
    }

    return httpJson(`${API_BASE}/tasks/${taskId}/reject`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function requestChangesModerationTask(taskId, payload) {
    const body = {
        comment: payload.comment || '',
        reasonCode: payload.reasonCode || '',
        fieldIssues: Array.isArray(payload.fieldIssues) ? payload.fieldIssues : [],
        notifyUser: payload.notifyUser ?? true,
    }

    return httpJson(`${API_BASE}/tasks/${taskId}/request-changes`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function addModerationComment(taskId, payload) {
    const body = {
        text: payload.text || '',
    }

    return httpJson(`${API_BASE}/tasks/${taskId}/comment`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function cancelModerationTask(taskId) {
    return httpJson(`${API_BASE}/tasks/${taskId}/cancel`, {
        method: 'POST',
    })
}

export async function assignModerationTask(taskId, payload) {
    const body = {
        comment: payload.comment || '',
    }

    return httpJson(`${API_BASE}/tasks/${taskId}/assign`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function createManualModerationTask(payload) {
    const body = {
        entityType: payload.entityType,
        entityId: Number(payload.entityId),
        taskType: payload.taskType,
        priority: payload.priority || 'MEDIUM',
        comment: payload.comment || '',
    }

    return httpJson(`${API_BASE}/tasks/manual`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function uploadModerationTaskAttachment(taskId, file) {
    const formData = new FormData()
    formData.append('file', file)

    return httpForm(`${API_BASE}/tasks/${taskId}/attachments`, formData)
}

export async function deleteModerationTaskAttachment(taskId, attachmentId) {
    return httpJson(`${API_BASE}/tasks/${taskId}/attachments/${attachmentId}`, {
        method: 'DELETE',
    })
}

export async function getModerationTaskAttachmentDownloadUrl(taskId, fileId) {
    return httpJson(`${API_BASE}/tasks/${taskId}/attachments/${fileId}/download-url`)
}