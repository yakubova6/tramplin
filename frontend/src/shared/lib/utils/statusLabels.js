const STATUS_LABELS_RU = {
    OPEN: 'Открыта',
    IN_PROGRESS: 'В работе',
    UNDER_REVIEW: 'На проверке',
    PENDING: 'В ожидании',
    PENDING_REVIEW: 'На проверке',
    NOT_STARTED: 'Не начата',
    APPROVED: 'Одобрено',
    REJECTED: 'Отклонено',
    REVOKED: 'Отозвано',
    NEEDS_REVISION: 'Нужны правки',
    REQUESTED_CHANGES: 'Запрошены правки',
    CANCELLED: 'Отменено',
    CLOSED: 'Закрыто',
    ARCHIVED: 'В архиве',
    PENDING_MODERATION: 'На модерации',
    ON_MODERATION: 'На модерации',
    DRAFT: 'Черновик',
    SUBMITTED: 'Отправлено',
    IN_REVIEW: 'На рассмотрении',
    ACCEPTED: 'Принято',
    RESERVE: 'В резерве',
    WITHDRAWN: 'Отозвано',
    ACTIVE: 'Активно',
    INACTIVE: 'Неактивно',
    NEW: 'Новая',
    VIEWED: 'Просмотрена',
    INTERESTED: 'Интересно',
    APPLIED: 'Откликнулся',
    ASSIGNED: 'Назначено',
    CREATED: 'Создано',
    STATUS_CHANGED: 'Статус изменен',
}

export function getStatusLabelRu(status) {
    const normalizedStatus = String(status || '').toUpperCase()
    return STATUS_LABELS_RU[normalizedStatus] || status || '—'
}

export function translateStatusTokensInText(text) {
    if (typeof text !== 'string' || !text) return text

    return text.replace(/\b[A-Z][A-Z0-9_]{1,}\b/g, (token) => {
        return STATUS_LABELS_RU[token] || token
    })
}

