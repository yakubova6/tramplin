export function createLinkRow(title = '', url = '') {
    return {
        id: Date.now() + Math.random(),
        title,
        url,
    }
}

export function statusBucket(status) {
    if (status === 'DRAFT') return 'draft'
    if (status === 'PLANNED') return 'planned'
    if (['CLOSED', 'ARCHIVED', 'REJECTED'].includes(status)) return 'closed'
    return 'active'
}

export function formatDate(date) {
    if (!date) return '—'

    const parsed = new Date(date)
    if (Number.isNaN(parsed.getTime())) return '—'

    return parsed.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

export function firstNonEmptyString(...values) {
    for (const value of values) {
        if (typeof value === 'string' && value.trim()) {
            return value.trim()
        }
    }

    return ''
}

export function normalizeFieldIssues(items = []) {
    const seen = new Set()

    return items
        .filter((item) => item && typeof item === 'object')
        .map((item) => ({
            field: item.field || '',
            message: item.message || '',
            code: item.code || '',
        }))
        .filter((item) => item.message)
        .filter((item) => {
            const key = `${item.field}|${item.message}|${item.code}`
            if (seen.has(key)) return false
            seen.add(key)
            return true
        })
}

export function extractModerationFeedback(historyItems = [], taskDetail = null) {
    const sortedHistory = [...historyItems].sort(
        (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )

    const latestRevisionEvent =
        sortedHistory.find((item) => item?.action === 'REQUESTED_CHANGES') ||
        sortedHistory.find((item) => item?.action === 'REJECTED') ||
        null

    if (!latestRevisionEvent && !taskDetail) {
        return null
    }

    const payload = latestRevisionEvent?.payload && typeof latestRevisionEvent.payload === 'object'
        ? latestRevisionEvent.payload
        : {}

    const taskHistoryFieldIssues = Array.isArray(taskDetail?.history)
        ? taskDetail.history.flatMap((item) =>
            Array.isArray(item?.payload?.fieldIssues) ? item.payload.fieldIssues : []
        )
        : []

    const fieldIssues = normalizeFieldIssues([
        ...(Array.isArray(payload.fieldIssues) ? payload.fieldIssues : []),
        ...taskHistoryFieldIssues,
    ])

    const comment = firstNonEmptyString(
        payload.comment,
        payload.message,
        payload.text,
        payload.resolutionComment,
        taskDetail?.resolutionComment
    )

    if (!comment && fieldIssues.length === 0) {
        return null
    }

    return {
        action: latestRevisionEvent?.action || null,
        comment,
        fieldIssues,
        createdAt: latestRevisionEvent?.createdAt || taskDetail?.updatedAt || null,
        taskId: latestRevisionEvent?.taskId || taskDetail?.id || null,
    }
}

export function renderContactMethod(contact) {
    if (!contact?.value) return null

    if (contact.type === 'EMAIL') {
        return <a href={`mailto:${contact.value}`}>{contact.value}</a>
    }

    if (contact.type === 'PHONE') {
        return <a href={`tel:${contact.value}`}>{contact.value}</a>
    }

    if (contact.type === 'TELEGRAM') {
        const value = contact.value.replace(/^@/, '')
        return (
            <a href={`https://t.me/${value}`} target="_blank" rel="noopener noreferrer">
                @{value}
            </a>
        )
    }

    if (contact.type === 'WHATSAPP') {
        const value = contact.value.replace(/[^\d+]/g, '')
        return (
            <a href={`https://wa.me/${value.replace(/^\+/, '')}`} target="_blank" rel="noopener noreferrer">
                {contact.value}
            </a>
        )
    }

    if (contact.type === 'VK' || contact.type === 'LINKEDIN' || contact.type === 'OTHER') {
        if (/^https?:\/\//i.test(contact.value)) {
            return (
                <a href={contact.value} target="_blank" rel="noopener noreferrer">
                    {contact.value}
                </a>
            )
        }
    }

    return <span>{contact.value}</span>
}

export function detectEmployerContactType(value = '', label = '') {
    const normalizedValue = String(value).trim().toLowerCase()
    const normalizedLabel = String(label).trim().toLowerCase()

    if (
        normalizedLabel.includes('email') ||
        normalizedLabel.includes('mail') ||
        normalizedLabel.includes('почт') ||
        normalizedValue.includes('@')
    ) {
        return 'EMAIL'
    }

    if (
        normalizedLabel.includes('telegram') ||
        normalizedLabel.includes('tg') ||
        normalizedLabel.includes('телеграм') ||
        normalizedValue.startsWith('https://t.me/') ||
        normalizedValue.startsWith('http://t.me/') ||
        normalizedValue.startsWith('@')
    ) {
        return 'TELEGRAM'
    }

    if (normalizedLabel.includes('whatsapp') || normalizedLabel.includes('wa')) {
        return 'WHATSAPP'
    }

    if (normalizedLabel.includes('vk') || normalizedValue.includes('vk.com')) {
        return 'VK'
    }

    if (normalizedLabel.includes('linkedin') || normalizedValue.includes('linkedin.com')) {
        return 'LINKEDIN'
    }

    if (
        normalizedLabel.includes('phone') ||
        normalizedLabel.includes('tel') ||
        normalizedLabel.includes('тел') ||
        normalizedValue.startsWith('+') ||
        /^\d[\d\s\-()]+$/.test(normalizedValue)
    ) {
        return 'PHONE'
    }

    return 'OTHER'
}

export function normalizeEmployerProfileState(profileData = {}, fallbackUser = null) {
    return {
        userId: profileData.userId ?? fallbackUser?.userId ?? fallbackUser?.id ?? null,
        companyName: profileData.companyName || fallbackUser?.displayName || '',
        legalName: profileData.legalName || '',
        inn: profileData.inn || '',
        description: profileData.description || '',
        industry: profileData.industry || '',
        websiteUrl: profileData.websiteUrl || '',
        cityId: profileData.cityId ?? profileData.city?.id ?? null,
        cityName: profileData.cityName || profileData.city?.name || '',
        locationId: profileData.locationId ?? profileData.location?.id ?? null,
        locationPreview: profileData.locationPreview || profileData.location || null,
        companySize: profileData.companySize || '',
        foundedYear: profileData.foundedYear ?? '',
        socialLinks: Array.isArray(profileData.socialLinks) ? profileData.socialLinks : [],
        publicContacts: Array.isArray(profileData.publicContacts) ? profileData.publicContacts : [],
        verificationStatus: profileData.verificationStatus || '',
        moderationStatus: profileData.moderationStatus || 'DRAFT',
        logo: profileData.logo || null,
    }
}

export function normalizeLocationState(location = {}) {
    return {
        id: location.id ?? null,
        title: location.title || '',
        cityId: location.cityId ?? location.city?.id ?? null,
        cityName: location.cityName || location.city?.name || '',
        addressLine: location.addressLine || '',
        addressLine2: location.addressLine2 || '',
        postalCode: location.postalCode || '',
        latitude: location.latitude ?? '',
        longitude: location.longitude ?? '',
        fiasId: location.fiasId || '',
        unrestrictedValue: location.unrestrictedValue || '',
        qcGeo: location.qcGeo ?? '',
        isActive: location.isActive ?? true,
    }
}

const normalizeEmployerWorkspaceResponse = (workspaceData = {}, fallbackUser = null) => {
    const current = normalizeEmployerProfileState(workspaceData.currentProfile || {}, fallbackUser)
    const publicVersion = workspaceData.publicProfile
        ? normalizeEmployerProfileState(workspaceData.publicProfile, fallbackUser)
        : null

    return {
        current,
        publicProfile: publicVersion,
        moderationStatus: workspaceData.moderationStatus || current.moderationStatus || 'DRAFT',
        hasApprovedPublicVersion: Boolean(workspaceData.hasApprovedPublicVersion),
    }
}

export function createEmptyLocationForm() {
    return {
        id: null,
        title: '',
        cityId: null,
        cityName: '',
        addressLine: '',
        addressLine2: '',
        postalCode: '',
        latitude: '',
        longitude: '',
        fiasId: '',
        unrestrictedValue: '',
        qcGeo: '',
        isActive: true,
    }
}

export function getLocationLabel(location) {
    if (!location) return '—'

    const parts = [
        location.title,
        location.cityName || location.city?.name,
        location.addressLine,
    ].filter(Boolean)

    return parts.join(' • ') || 'Локация без названия'
}

export function getEmployerModerationStatusMeta(status) {
    switch (status) {
        case 'PENDING_MODERATION':
            return {
                label: 'На модерации',
                tone: 'pending',
                description: 'Профиль отправлен куратору и ожидает проверки.',
            }
        case 'APPROVED':
            return {
                label: 'Одобрен',
                tone: 'approved',
                description: 'Профиль работодателя прошёл модерацию.',
            }
        case 'NEEDS_REVISION':
            return {
                label: 'Нужны правки',
                tone: 'revision',
                description: 'Куратор вернул профиль на доработку. Исправьте данные и отправьте его повторно.',
            }
        default:
            return {
                label: 'Не отправлен на модерацию',
                tone: 'draft',
                description: 'Профиль ещё не отправлялся на проверку.',
            }
    }
}