export function formatDate(dateString) {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
    })
}

export function getPriorityLabel(priority) {
    const labels = {
        LOW: 'Низкий',
        MEDIUM: 'Средний',
        HIGH: 'Высокий',
    }
    return labels[priority] || priority
}

export function getPriorityClass(priority) {
    const classes = {
        LOW: 'priority-low',
        MEDIUM: 'priority-medium',
        HIGH: 'priority-high',
    }
    return classes[priority] || ''
}

export function getStatusLabel(status) {
    const labels = {
        OPEN: 'Открыта',
        IN_PROGRESS: 'В работе',
        APPROVED: 'Одобрено',
        REJECTED: 'Отклонено',
        CANCELLED: 'Отменено',
    }
    return labels[status] || status
}

export function getStatusClass(status) {
    const classes = {
        OPEN: 'status-open',
        IN_PROGRESS: 'status-progress',
        APPROVED: 'status-approved',
        REJECTED: 'status-rejected',
        CANCELLED: 'status-cancelled',
    }
    return classes[status] || ''
}

export function getEntityTypeLabel(entityType) {
    const labels = {
        EMPLOYER_PROFILE: 'Профиль работодателя',
        EMPLOYER_VERIFICATION: 'Верификация компании',
        OPPORTUNITY: 'Вакансия',
        TAG: 'Тег',
    }
    return labels[entityType] || entityType
}

export function getTaskTypeLabel(taskType) {
    const labels = {
        VERIFICATION_REVIEW: 'Проверка верификации',
        OPPORTUNITY_REVIEW: 'Проверка вакансии',
        TAG_REVIEW: 'Проверка тега',
        CONTENT_REVIEW: 'Проверка контента',
    }
    return labels[taskType] || taskType
}

export function getActionLabel(action) {
    const labels = {
        CREATED: 'CREATED',
        ASSIGNED: 'ASSIGNED',
        APPROVED: 'APPROVED',
        REJECTED: 'REJECTED',
        STATUS_CHANGED: 'STATUS_CHANGED',
        COMMENTED: 'COMMENTED',
        UPDATED: 'UPDATED',
    }
    return labels[action] || action
}

export function deepClone(value) {
    if (value === null || value === undefined) return value
    return JSON.parse(JSON.stringify(value))
}

export function buildChangedFieldsPatch(original = {}, draft = {}) {
    const patch = {}

    if (!draft || typeof draft !== 'object') return patch

    Object.keys(draft).forEach((key) => {
        const before = original?.[key]
        const after = draft?.[key]

        if (JSON.stringify(before) !== JSON.stringify(after)) {
            patch[key] = after
        }
    })

    return patch
}

export function getEditableFieldsByEntityType(entityType) {
    switch (entityType) {
        case 'EMPLOYER_PROFILE':
            return [
                { key: 'companyName', label: 'Название компании', type: 'text' },
                { key: 'legalName', label: 'Юридическое название', type: 'text' },
                { key: 'inn', label: 'ИНН', type: 'text' },
                { key: 'industry', label: 'Сфера деятельности', type: 'text' },
                { key: 'websiteUrl', label: 'Сайт', type: 'text' },
                { key: 'description', label: 'Описание', type: 'textarea' },
            ]

        case 'EMPLOYER_VERIFICATION':
            return [
                { key: 'verificationMethod', label: 'Метод верификации', type: 'text' },
                { key: 'corporateEmail', label: 'Корпоративная почта', type: 'text' },
                { key: 'inn', label: 'ИНН', type: 'text' },
                { key: 'submittedComment', label: 'Комментарий', type: 'textarea' },
            ]

        case 'OPPORTUNITY':
            return [
                { key: 'title', label: 'Название', type: 'text' },
                { key: 'companyName', label: 'Компания', type: 'text' },
                { key: 'type', label: 'Тип', type: 'text' },
                { key: 'workFormat', label: 'Формат', type: 'text' },
                { key: 'shortDescription', label: 'Краткое описание', type: 'textarea' },
                { key: 'requirements', label: 'Требования', type: 'textarea' },
                { key: 'salaryFrom', label: 'Зарплата от', type: 'number' },
                { key: 'salaryTo', label: 'Зарплата до', type: 'number' },
            ]

        case 'TAG':
            return [
                { key: 'name', label: 'Название тега', type: 'text' },
                { key: 'category', label: 'Категория', type: 'text' },
                { key: 'manualComment', label: 'Комментарий', type: 'textarea' },
                { key: 'isActive', label: 'Активен', type: 'boolean' },
            ]

        default:
            return []
    }
}

export function getPreviewFieldsByEntityType(entityType, snapshot = {}) {
    switch (entityType) {
        case 'EMPLOYER_PROFILE':
            return [
                ['Компания', snapshot.companyName],
                ['Юридическое название', snapshot.legalName],
                ['ИНН', snapshot.inn],
                ['Сфера', snapshot.industry],
                ['Сайт', snapshot.websiteUrl],
                ['Описание', snapshot.description],
            ]

        case 'EMPLOYER_VERIFICATION':
            return [
                ['Метод', snapshot.verificationMethod],
                ['Корпоративная почта', snapshot.corporateEmail],
                ['ИНН', snapshot.inn],
                ['Комментарий', snapshot.submittedComment],
            ]

        case 'OPPORTUNITY':
            return [
                ['Название', snapshot.title],
                ['Компания', snapshot.companyName],
                ['Тип', snapshot.type],
                ['Формат', snapshot.workFormat],
                ['Описание', snapshot.shortDescription],
                ['Требования', snapshot.requirements],
                ['Зарплата от', snapshot.salaryFrom],
                ['Зарплата до', snapshot.salaryTo],
            ]

        case 'TAG':
            return [
                ['Название', snapshot.name],
                ['Категория', snapshot.category],
                ['Активен', snapshot.isActive ? 'Да' : 'Нет'],
                ['Комментарий', snapshot.manualComment],
            ]

        default:
            return []
    }
}