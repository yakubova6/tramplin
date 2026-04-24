import { getStatusLabelRu } from '@/shared/lib/utils/statusLabels'

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
    return labels[priority] || priority || '—'
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
        NEEDS_REVISION: 'Нужны правки',
        CANCELLED: 'Отменено',
    }
    return labels[status] || getStatusLabelRu(status)
}

export function getStatusClass(status) {
    const classes = {
        OPEN: 'status-open',
        IN_PROGRESS: 'status-progress',
        APPROVED: 'status-approved',
        REJECTED: 'status-rejected',
        NEEDS_REVISION: 'status-revision',
        CANCELLED: 'status-cancelled',
    }
    return classes[status] || ''
}

export function getEntityTypeLabel(entityType) {
    const labels = {
        APPLICANT_PROFILE: 'Профиль соискателя',
        EMPLOYER_PROFILE: 'Профиль работодателя',
        EMPLOYER_VERIFICATION: 'Верификация компании',
        OPPORTUNITY: 'Вакансия',
        OPPORTUNITY_RESPONSE: 'Отклик',
        MODERATION_TASK: 'Задача модерации',
        TAG: 'Тег',
    }
    return labels[entityType] || entityType || '—'
}

export function getTaskTypeLabel(taskType) {
    const labels = {
        PROFILE_REVIEW: 'Проверка профиля',
        COMPANY_REVIEW: 'Проверка компании',
        VERIFICATION_REVIEW: 'Проверка верификации',
        OPPORTUNITY_REVIEW: 'Проверка вакансии',
        TAG_REVIEW: 'Проверка тега',
        CONTENT_REVIEW: 'Проверка контента',
    }
    return labels[taskType] || taskType || '—'
}

export function getActionLabel(action) {
    const labels = {
        CREATED: 'Создано',
        ASSIGNED: 'Назначено',
        APPROVED: 'Одобрено',
        REJECTED: 'Отклонено',
        REQUESTED_CHANGES: 'Запрошены правки',
        STATUS_CHANGED: 'Статус изменён',
        COMMENTED: 'Комментарий',
        UPDATED: 'Обновлено',
    }
    return labels[action] || getStatusLabelRu(action)
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

function isPlainObject(value) {
    return Object.prototype.toString.call(value) === '[object Object]'
}

function formatPrimitiveValue(value) {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
    if (Array.isArray(value)) {
        if (!value.length) return '—'
        return value
            .map((item) => {
                if (isPlainObject(item)) {
                    return item.name || item.title || item.label || JSON.stringify(item)
                }
                return String(item)
            })
            .join(', ')
    }
    if (isPlainObject(value)) {
        if ('name' in value) return value.name || '—'
        if ('title' in value) return value.title || '—'
        if ('label' in value) return value.label || '—'
        return JSON.stringify(value)
    }
    return String(value)
}

function fallbackPreviewFields(snapshot = {}) {
    if (!snapshot || typeof snapshot !== 'object') return []

    return Object.entries(snapshot)
        .filter(([key]) => !String(key).startsWith('_'))
        .map(([key, value]) => ({
            key,
            label: key,
            value: formatPrimitiveValue(value),
        }))
}

function buildPreviewFields(snapshot = {}, definitions = []) {
    const fields = definitions
        .map((definition) => ({
            key: definition.key,
            label: definition.label,
            value: definition.getValue
                ? definition.getValue(snapshot)
                : formatPrimitiveValue(snapshot?.[definition.key]),
        }))
        .filter((field) => field.value !== '—')

    return fields.length ? fields : fallbackPreviewFields(snapshot)
}

export function getEditableFieldsByEntityType(entityType) {
    switch (entityType) {
        case 'APPLICANT_PROFILE':
            return [
                { key: 'firstName', label: 'Имя', type: 'text' },
                { key: 'lastName', label: 'Фамилия', type: 'text' },
                { key: 'middleName', label: 'Отчество', type: 'text' },
                { key: 'title', label: 'Заголовок профиля', type: 'text' },
                { key: 'city', label: 'Город', type: 'text' },
                { key: 'telegram', label: 'Telegram', type: 'text' },
                { key: 'portfolioUrl', label: 'Портфолио', type: 'text' },
                { key: 'about', label: 'О себе', type: 'textarea' },
            ]
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
        case 'APPLICANT_PROFILE':
            return buildPreviewFields(snapshot, [
                {
                    key: 'fullName',
                    label: 'ФИО',
                    getValue: (data) => formatPrimitiveValue(
                        [data?.lastName, data?.firstName, data?.middleName].filter(Boolean).join(' ')
                    ),
                },
                { key: 'title', label: 'Заголовок' },
                { key: 'city', label: 'Город' },
                { key: 'telegram', label: 'Telegram' },
                { key: 'portfolioUrl', label: 'Портфолио' },
                { key: 'about', label: 'О себе' },
                { key: 'educationLevel', label: 'Уровень образования' },
                { key: 'university', label: 'Учебное заведение' },
                { key: 'specialization', label: 'Специализация' },
                { key: 'skills', label: 'Навыки' },
            ])
        case 'EMPLOYER_PROFILE':
            return buildPreviewFields(snapshot, [
                { key: 'companyName', label: 'Компания' },
                { key: 'legalName', label: 'Юридическое название' },
                { key: 'inn', label: 'ИНН' },
                { key: 'industry', label: 'Сфера' },
                { key: 'websiteUrl', label: 'Сайт' },
                { key: 'description', label: 'Описание' },
            ])
        case 'EMPLOYER_VERIFICATION':
            return buildPreviewFields(snapshot, [
                { key: 'verificationMethod', label: 'Метод' },
                { key: 'corporateEmail', label: 'Корпоративная почта' },
                { key: 'inn', label: 'ИНН' },
                { key: 'submittedComment', label: 'Комментарий' },
            ])
        case 'OPPORTUNITY':
            return buildPreviewFields(snapshot, [
                { key: 'title', label: 'Название' },
                { key: 'companyName', label: 'Компания' },
                { key: 'type', label: 'Тип' },
                { key: 'workFormat', label: 'Формат' },
                { key: 'shortDescription', label: 'Описание' },
                { key: 'requirements', label: 'Требования' },
                { key: 'salaryFrom', label: 'Зарплата от' },
                { key: 'salaryTo', label: 'Зарплата до' },
            ])
        case 'TAG':
            return buildPreviewFields(snapshot, [
                { key: 'name', label: 'Название' },
                { key: 'category', label: 'Категория' },
                { key: 'isActive', label: 'Активен' },
                { key: 'manualComment', label: 'Комментарий' },
            ])
        default:
            return fallbackPreviewFields(snapshot)
    }
}

export function getAttachmentRoleLabel(role) {
    const labels = {
        AVATAR: 'Аватар',
        RESUME: 'Резюме',
        PORTFOLIO: 'Портфолио',
        LOGO: 'Логотип',
        MEDIA: 'Медиа',
        VERIFICATION: 'Верификация',
        ATTACHMENT: 'Вложение',
    }

    return labels[role] || role || '—'
}
