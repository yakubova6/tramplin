const API_BASE = '/api'

import { CITIES } from '../constants/cities'
import {
    archiveEmployerOpportunity,
    closeEmployerOpportunity,
    createEmployerOpportunity,
    getEmployerOpportunity,
    listEmployerOpportunities,
    returnToDraftEmployerOpportunity,
    updateEmployerOpportunity,
} from './opportunities'
import {
    getContacts,
    addContact as addContactApi,
    acceptContactRequest,
    declineContactRequest,
    removeContact as removeContactApi,
    getMyResponses,
    createResponse,
    getFavorites,
    addToFavorites,
    removeFromFavorites,
    createRecommendation,
    getIncomingRecommendations,
    getOutgoingRecommendations,
    deleteRecommendation,
    getEmployerResponses,
    updateResponseStatus as updateInteractionResponseStatus,
} from './interaction'
import {
    httpJson,
    getSessionUserFromApi,
    getSessionUserIdFromApi,
    getRequiredCurrentUserPayload,
    clearSessionUserCache,
} from './http'

function createApiError(message, status = 0, extra = {}) {
    const error = new Error(message)
    error.status = status
    error.code = extra.code || null
    error.details = extra.details || {}
    error.payload = extra.payload || null
    return error
}

async function parseApiResponse(response) {
    if (response.status === 204) return null

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')

    if (isJson) {
        try {
            return await response.json()
        } catch {
            return null
        }
    }

    try {
        const text = await response.text()
        return text || null
    } catch {
        return null
    }
}

export async function getCurrentSessionUser(options = {}) {
    return getSessionUserFromApi(options)
}

async function getAuthenticatedUserPayload() {
    return getRequiredCurrentUserPayload()
}

async function apiRequest(endpoint, options = {}) {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    let response
    try {
        response = await fetch(endpoint, {
            credentials: 'include',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        })
    } catch {
        throw createApiError('Сервер недоступен. Попробуйте позже.', 0)
    }

    const data = await parseApiResponse(response)

    if (!response.ok) {
        const errorMessage =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Ошибка запроса'

        if (response.status === 401) {
            clearSessionUserCache()
        }

        throw createApiError(errorMessage, response.status, {
            code: typeof data === 'object' ? data?.code : null,
            details: typeof data === 'object' ? data?.details : {},
            payload: data,
        })
    }

    return data
}

async function multipartRequest(endpoint, formData, options = {}) {
    console.log(`[API] ${options.method || 'POST'} ${endpoint}`)

    let response
    try {
        response = await fetch(endpoint, {
            credentials: 'include',
            method: options.method || 'POST',
            body: formData,
            ...options,
        })
    } catch {
        throw createApiError('Сервер недоступен. Попробуйте позже.', 0)
    }

    const data = await parseApiResponse(response)

    if (!response.ok) {
        const errorMessage =
            (typeof data === 'object' && data?.message) ||
            (typeof data === 'object' && data?.error) ||
            (typeof data === 'string' && data) ||
            'Ошибка загрузки файла'

        if (response.status === 401) {
            clearSessionUserCache()
        }

        throw createApiError(errorMessage, response.status, {
            code: typeof data === 'object' ? data?.code : null,
            details: typeof data === 'object' ? data?.details : {},
            payload: data,
        })
    }

    return data
}

async function createMultipartWithCurrentUser(file) {
    const currentUser = await getAuthenticatedUserPayload()
    const formData = new FormData()

    formData.append('file', file)
    formData.append(
        'currentUser',
        new Blob([JSON.stringify(currentUser)], { type: 'application/json' })
    )

    return formData
}

// ========== HELPERS ==========

function normalizeProfileLinks(links) {
    if (!links) return []

    if (Array.isArray(links)) {
        return links
            .map((item, index) => {
                if (typeof item === 'string') {
                    const url = item.trim()
                    if (!url) return null
                    return {
                        label: `Ссылка ${index + 1}`,
                        url,
                    }
                }

                if (item && typeof item === 'object') {
                    const url = item.url?.trim?.() || ''
                    if (!url) return null

                    return {
                        label: item.label?.trim?.() || item.title?.trim?.() || `Ссылка ${index + 1}`,
                        url,
                    }
                }

                return null
            })
            .filter(Boolean)
    }

    if (typeof links === 'object') {
        return Object.entries(links)
            .map(([label, url], index) => {
                const normalizedUrl = typeof url === 'string' ? url.trim() : ''
                if (!normalizedUrl) return null

                return {
                    label: label?.trim?.() || `Ссылка ${index + 1}`,
                    url: normalizedUrl,
                }
            })
            .filter(Boolean)
    }

    return []
}

function detectContactType(value = '', label = '') {
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

    if (
        normalizedLabel.includes('whatsapp') ||
        normalizedLabel.includes('wa')
    ) {
        return 'WHATSAPP'
    }

    if (
        normalizedLabel.includes('vk') ||
        normalizedValue.includes('vk.com')
    ) {
        return 'VK'
    }

    if (
        normalizedLabel.includes('linkedin') ||
        normalizedValue.includes('linkedin.com')
    ) {
        return 'LINKEDIN'
    }

    if (
        normalizedLabel.includes('phone') ||
        normalizedLabel.includes('tel') ||
        normalizedLabel.includes('тел') ||
        normalizedLabel.includes('звон') ||
        normalizedValue.startsWith('+') ||
        /^\d[\d\s\-()]+$/.test(normalizedValue)
    ) {
        return 'PHONE'
    }

    return 'OTHER'
}

function normalizeContactMethods(contacts) {
    if (!contacts) return []

    if (Array.isArray(contacts)) {
        return contacts
            .map((item, index) => {
                if (typeof item === 'string') {
                    const value = item.trim()
                    if (!value) return null

                    return {
                        type: detectContactType(value),
                        value,
                        label: `Контакт ${index + 1}`,
                    }
                }

                if (item && typeof item === 'object') {
                    const value =
                        item.value?.trim?.() ||
                        item.url?.trim?.() ||
                        ''

                    if (!value) return null

                    const label =
                        item.label?.trim?.() ||
                        item.title?.trim?.() ||
                        `Контакт ${index + 1}`

                    return {
                        type: ['EMAIL', 'PHONE', 'TELEGRAM', 'WHATSAPP', 'VK', 'LINKEDIN', 'OTHER'].includes(item.type)
                            ? item.type
                            : detectContactType(value, label),
                        value,
                        label,
                    }
                }

                return null
            })
            .filter(Boolean)
    }

    if (typeof contacts === 'object') {
        return Object.entries(contacts)
            .map(([label, value], index) => {
                const normalizedValue = typeof value === 'string' ? value.trim() : ''
                if (!normalizedValue) return null

                const normalizedLabel = label?.trim?.() || `Контакт ${index + 1}`

                return {
                    type: detectContactType(normalizedValue, normalizedLabel),
                    value: normalizedValue,
                    label: normalizedLabel,
                }
            })
            .filter(Boolean)
    }

    return []
}

function normalizeApplicantProfile(data = {}) {
    return {
        ...data,
        cityId: data.city?.id ?? data.cityId ?? null,
        cityName: data.city?.name ?? data.cityName ?? '',
        portfolioLinks: normalizeProfileLinks(data.portfolioLinks),
        contactLinks: normalizeContactMethods(data.contactLinks),
        portfolioFiles: Array.isArray(data.portfolioFiles) ? data.portfolioFiles : [],
        avatar: data.avatar || null,
        resumeFile: data.resumeFile || null,
        skills: Array.isArray(data.skills) ? data.skills : [],
        interests: Array.isArray(data.interests) ? data.interests : [],
        moderationStatus: data.moderationStatus || 'DRAFT',
    }
}

function normalizeEmployerProfile(data = {}) {
    return {
        ...data,
        cityId: data.city?.id ?? data.cityId ?? null,
        cityName: data.city?.name ?? data.cityName ?? '',
        locationId: data.location?.id ?? data.locationId ?? null,
        locationPreview: data.location || data.locationPreview || null,
        socialLinks: normalizeProfileLinks(data.socialLinks),
        publicContacts: normalizeContactMethods(data.publicContacts),
        logo: data.logo || null,
        moderationStatus: data.moderationStatus || 'DRAFT',
    }
}

export function getFileDownloadUrlByUserAndFile(role, userId, fileId) {
    if (!userId || !fileId) return null

    if (role === 'EMPLOYER') {
        return `${API_BASE}/profile/employer/${userId}/files/${fileId}`
    }

    return `${API_BASE}/profile/applicant/${userId}/files/${fileId}`
}

// localStorage ниже оставлен только для гостевых фич (избранное).
// Аутентификация и профильные запросы на них больше не завязаны.

function normalizeInteractionContact(contact = {}) {
    const fullName = String(contact.contactName || '').trim()
    const nameParts = fullName ? fullName.split(/\s+/) : []

    return {
        id: contact.contactUserId,
        contactUserId: contact.contactUserId,
        firstName: nameParts[0] || '',
        lastName: nameParts.slice(1).join(' '),
        fullName,
        contactName: fullName,
        status: contact.status || 'PENDING',
        direction: contact.direction || (contact.status === 'ACCEPTED' ? 'CONFIRMED' : null),
        createdAt: contact.createdAt || null,
    }
}

function getGuestFavoritesStorageKey() {
    return 'tramplin_guest_favorite_opportunities'
}

function readGuestFavorites() {
    try {
        const raw = localStorage.getItem(getGuestFavoritesStorageKey())
        return raw ? JSON.parse(raw) : []
    } catch {
        return []
    }
}

function writeGuestFavorites(items) {
    localStorage.setItem(getGuestFavoritesStorageKey(), JSON.stringify(items))
}

export function getGuestFavoriteOpportunityIds() {
    return readGuestFavorites()
}

export function isGuestFavoriteOpportunity(opportunityId) {
    return readGuestFavorites().includes(Number(opportunityId))
}

export function addGuestFavoriteOpportunity(opportunityId) {
    const id = Number(opportunityId)
    const current = readGuestFavorites()
    if (!current.includes(id)) {
        const next = [...current, id]
        writeGuestFavorites(next)
        window.dispatchEvent(new CustomEvent('favorites-updated', {
            detail: { action: 'added', opportunityId: id, scope: 'guest' }
        }))
    }
}

export function removeGuestFavoriteOpportunity(opportunityId) {
    const id = Number(opportunityId)
    const next = readGuestFavorites().filter((item) => item !== id)
    writeGuestFavorites(next)
    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'removed', opportunityId: id, scope: 'guest' }
    }))
}

export async function migrateGuestFavoritesToAccount() {
    const user = await getCurrentSessionUser()
    if (!user?.id) return

    const guestIds = readGuestFavorites()
    if (!guestIds.length) return

    for (const opportunityId of guestIds) {
        try {
            await addToFavorites(opportunityId)
        } catch {
            // не прерываем миграцию
        }
    }

    writeGuestFavorites([])
    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'migrated', opportunityIds: guestIds, scope: 'guest' }
    }))
}

// ========== MEDIA / FILES ==========

export async function uploadApplicantAvatar(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/avatar`, formData, {
        method: 'PUT',
    })

    return normalizeApplicantProfile(data)
}

export async function uploadApplicantResumeFile(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/resume-file`, formData, {
        method: 'PUT',
    })

    return normalizeApplicantProfile(data)
}

export async function uploadApplicantPortfolioFile(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/applicant/profile/portfolio/files`, formData, {
        method: 'POST',
    })

    return normalizeApplicantProfile(data)
}

export async function deleteApplicantFile(fileId) {
    if (!fileId) throw createApiError('Не указан fileId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const data = await apiRequest(`${API_BASE}/applicant/profile/files/${fileId}?currentUser=${currentUser}`, {
        method: 'DELETE',
    })

    return normalizeApplicantProfile(data)
}

export async function uploadEmployerLogo(file) {
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    const data = await multipartRequest(`${API_BASE}/employer/profile/logo`, formData, {
        method: 'PUT',
    })

    return normalizeEmployerProfile(data)
}

export async function deleteEmployerFile(fileId) {
    if (!fileId) throw createApiError('Не указан fileId', 400)

    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))
    const data = await apiRequest(`${API_BASE}/employer/profile/files/${fileId}?currentUser=${currentUser}`, {
        method: 'DELETE',
    })

    return normalizeEmployerProfile(data)
}

export async function createEmployerVerification(payload) {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(`${API_BASE}/employer/verification?employerUserId=${userId}`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function uploadEmployerVerificationAttachment(verificationId, file) {
    if (!verificationId) throw createApiError('Не указан verificationId', 400)
    if (!file) throw createApiError('Файл не выбран', 400)

    const formData = await createMultipartWithCurrentUser(file)
    return multipartRequest(`${API_BASE}/employer/verifications/${verificationId}/attachments`, formData, {
        method: 'POST',
    })
}

export async function getEmployerVerificationModerationTask(verificationId) {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(`${API_BASE}/employer/verification/${verificationId}/moderation-task?employerUserId=${userId}`)
}

export async function cancelEmployerVerificationModerationTask(verificationId) {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    return apiRequest(`${API_BASE}/employer/verification/${verificationId}/moderation-task/cancel?employerUserId=${userId}`, {
        method: 'POST',
    })
}

function normalizeOpportunity(item = {}) {
    return {
        ...item,
        cityId: item.cityId ?? item.city?.id ?? null,
        cityName: item.cityName ?? item.city?.name ?? '',
        locationId: item.locationId ?? item.location?.id ?? null,
        locationPreview: item.locationPreview || item.location || null,
        resourceLinks: normalizeProfileLinks(item.resourceLinks),
        tagIds: Array.isArray(item.tags) ? item.tags.map((tag) => tag.id) : (item.tagIds || []),
        contactEmail: item.contactInfo?.email || '',
        contactPhone: item.contactInfo?.phone || '',
        contactTelegram: item.contactInfo?.telegram || '',
        contactPerson: item.contactInfo?.contactPerson || '',
    }
}

function buildOpportunityPayload(opportunity) {
    const normalizedResourceLinks = Array.isArray(opportunity.resourceLinks)
        ? opportunity.resourceLinks
            .map((item, index) => {
                if (!item) return null

                const url = item.url?.trim?.() || item.value?.trim?.() || ''
                if (!url) return null

                return {
                    label: item.label?.trim?.() || item.title?.trim?.() || `Ссылка ${index + 1}`,
                    linkType: item.linkType || 'RESOURCE',
                    url,
                }
            })
            .filter(Boolean)
        : []

    let expiresAt = null

    if (opportunity.expiresAt) {
        const rawValue = String(opportunity.expiresAt).trim()

        if (/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
            expiresAt = rawValue
        } else {
            const parsed = new Date(rawValue)
            if (!Number.isNaN(parsed.getTime())) {
                expiresAt = parsed.toISOString()
            }
        }
    }

    return {
        title: opportunity.title?.trim(),
        shortDescription: opportunity.shortDescription?.trim() || '',
        fullDescription:
            opportunity.fullDescription?.trim() ||
            opportunity.shortDescription?.trim() ||
            '',
        requirements: opportunity.requirements?.trim() || null,
        companyName:
            opportunity.companyName?.trim() ||
            opportunity.profileCompanyName ||
            'Компания работодателя',
        type: opportunity.type || 'VACANCY',
        workFormat: opportunity.workFormat || opportunity.format || 'REMOTE',
        employmentType: opportunity.employmentType || 'FULL_TIME',
        grade: opportunity.grade || opportunity.experienceLevel || 'JUNIOR',
        salaryFrom:
            opportunity.salaryFrom !== '' && opportunity.salaryFrom != null
                ? Number(opportunity.salaryFrom)
                : null,
        salaryTo:
            opportunity.salaryTo !== '' && opportunity.salaryTo != null
                ? Number(opportunity.salaryTo)
                : null,
        salaryCurrency: (opportunity.salaryCurrency || 'RUB').trim().toUpperCase(),
        expiresAt,
        eventDate: opportunity.eventDate || null,
        cityId: opportunity.cityId ? Number(opportunity.cityId) : null,
        locationId: opportunity.locationId ? Number(opportunity.locationId) : null,
        contactInfo: {
            email: opportunity.contactEmail?.trim?.() || opportunity.contactInfo?.email || null,
            phone: opportunity.contactPhone?.trim?.() || opportunity.contactInfo?.phone || null,
            telegram: opportunity.contactTelegram?.trim?.() || opportunity.contactInfo?.telegram || null,
            contactPerson: opportunity.contactPerson?.trim?.() || opportunity.contactInfo?.contactPerson || null,
        },
        resourceLinks: normalizedResourceLinks,
        tagIds: Array.isArray(opportunity.tagIds)
            ? opportunity.tagIds
                .map(Number)
                .filter((id) => Number.isFinite(id) && id > 0)
            : [],
    }
}

// ========== ПОИСК ГОРОДОВ ==========

export async function searchCities(query) {
    if (!query || query.length < 2) return []

    const lowerQuery = query.toLowerCase()
    const filtered = CITIES.filter((city) =>
        city.name.toLowerCase().includes(lowerQuery)
    )

    return filtered.slice(0, 10)
}

// ========== СОИСКАТЕЛЬ ==========

export async function getApplicantProfile() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        return null
    }

    try {
        const data = await apiRequest(`${API_BASE}/profile/applicant/${userId}?currentUserId=${userId}`)
        return normalizeApplicantProfile(data)
    } catch (error) {
        if (error.status === 404) {
            return null
        }
        throw error
    }
}

export async function updateApplicantProfile(profile) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const payload = {
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        middleName: profile.middleName || null,
        universityName: profile.universityName || null,
        facultyName: profile.facultyName || null,
        studyProgram: profile.studyProgram || null,
        course: profile.course ? Number(profile.course) : null,
        graduationYear: profile.graduationYear ? Number(profile.graduationYear) : null,
        cityId: profile.cityId || null,
        about: profile.about || null,
        resumeText: profile.resumeText || null,
        portfolioLinks: normalizeProfileLinks(profile.portfolioLinks),
        contactLinks: normalizeContactMethods(profile.contactLinks),
        profileVisibility: profile.profileVisibility || 'AUTHENTICATED',
        resumeVisibility: profile.resumeVisibility || 'AUTHENTICATED',
        applicationsVisibility: profile.applicationsVisibility || 'PRIVATE',
        contactsVisibility: profile.contactsVisibility || 'AUTHENTICATED',
        openToWork: profile.openToWork ?? true,
        openToEvents: profile.openToEvents ?? true,
        skillTagIds: Array.isArray(profile.skillTagIds) ? profile.skillTagIds : undefined,
        interestTagIds: Array.isArray(profile.interestTagIds) ? profile.interestTagIds : undefined,
    }

    const data = await apiRequest(`${API_BASE}/profile/applicant?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    return normalizeApplicantProfile(data)
}

// ========== РАБОТОДАТЕЛЬ ==========

export async function getEmployerProfile() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        return null
    }

    try {
        const data = await apiRequest(`${API_BASE}/profile/employer/${userId}?currentUserId=${userId}`)
        return normalizeEmployerProfile(data)
    } catch (error) {
        if (error.status === 404) {
            return null
        }

        throw error
    }
}

export async function updateEmployerProfile(profile) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const payload = {
        companyName: profile.companyName || null,
        description: profile.description || null,
        industry: profile.industry || null,
        websiteUrl: profile.websiteUrl || null,
        cityId: profile.cityId || null,
        locationId: profile.locationId || null,
        companySize: profile.companySize || null,
        foundedYear: profile.foundedYear ? Number(profile.foundedYear) : null,
        socialLinks: normalizeProfileLinks(profile.socialLinks),
        publicContacts: normalizeContactMethods(profile.publicContacts),
    }

    const data = await apiRequest(`${API_BASE}/profile/employer?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    return normalizeEmployerProfile(data)
}

export async function submitVerification(payload) {
    const body = {
        verificationMethod: payload.verificationMethod,
        corporateEmail: payload.corporateEmail || null,
        professionalLinks: Array.isArray(payload.professionalLinks)
            ? payload.professionalLinks.filter(Boolean)
            : [],
        submittedComment: payload.submittedComment || null,
    }

    return createEmployerVerification(body)
}

// ========== INTERACTION API: СОИСКАТЕЛЬ ==========

export async function getSeekerContacts() {
    try {
        const contacts = await getContacts()

        if (!Array.isArray(contacts)) {
            return []
        }

        return contacts.map(normalizeInteractionContact)
    } catch (error) {
        if (error?.code === 'applicant_networking_requires_approved_profile') {
            throw error
        }

        if (error?.status === 401) {
            return []
        }

        if ([500, 503].includes(error?.status)) {
            return []
        }

        throw error
    }
}

export async function addContact(contactUserId) {
    return addContactApi(contactUserId)
}

export async function acceptContact(contactUserId) {
    return acceptContactRequest(contactUserId)
}

export async function declineContact(contactUserId) {
    return declineContactRequest(contactUserId)
}

export async function removeContact(contactUserId) {
    return removeContactApi(contactUserId)
}

export async function getSeekerApplications() {
    try {
        const responses = await getMyResponses()
        if (!Array.isArray(responses)) return []

        return responses.map((r, index) => {
            const opportunityId = r.opportunityId ?? r.opportunity?.id ?? null
            const fallbackTitle = opportunityId ? `Вакансия #${opportunityId}` : `Отклик #${r.id ?? index + 1}`

            return {
                id: r.id ?? `${opportunityId ?? 'unknown'}-${r.createdAt ?? index}`,
                opportunityId,
                position: r.opportunityTitle || r.opportunity?.title || fallbackTitle,
                title: r.opportunityTitle || r.opportunity?.title || fallbackTitle,
                companyName: r.companyName || 'Компания',
                status: r.status || 'SUBMITTED',
                message: r.employerComment || r.applicantComment || 'Отклик отправлен',
                appliedAt: r.createdAt,
                createdAt: r.createdAt,
            }
        })
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
            return []
        }

        throw error
    }
}

export async function applyToOpportunity(opportunityId, message = '') {
    try {
        return await createResponse(opportunityId, message)
    } catch (error) {
        if (error.message?.toLowerCase().includes('already')) {
            throw createApiError('already_applied', error.status || 409)
        }
        throw error
    }
}

export async function getSeekerSaved() {
    try {
        const favorites = await getFavorites()
        if (!Array.isArray(favorites)) return []

        return favorites
            .map((f, index) => {
                const opportunityId =
                    f.targetId ??
                    f.opportunityId ??
                    f.opportunity_id ??
                    f.opportunity?.id ??
                    f.id ??
                    null

                const opportunityTitle =
                    f.opportunityTitle ||
                    f.title ||
                    f.opportunity?.title ||
                    (opportunityId ? `Вакансия #${opportunityId}` : `Вакансия ${index + 1}`)

                return {
                    id: opportunityId,
                    title: opportunityTitle,
                    companyName: f.companyName || f.subtitle || f.opportunity?.companyName || 'Компания',
                    shortDescription: f.shortDescription || f.opportunity?.shortDescription || '',
                    salaryFrom: f.salaryFrom ?? f.opportunity?.salaryFrom ?? null,
                    salaryTo: f.salaryTo ?? f.opportunity?.salaryTo ?? null,
                    salaryCurrency: f.salaryCurrency ?? f.opportunity?.salaryCurrency ?? null,
                    type: f.type ?? f.opportunity?.type ?? null,
                    workFormat: f.workFormat ?? f.opportunity?.workFormat ?? null,
                    savedAt: f.createdAt || f.savedAt || null,
                }
            })
            .filter((item) => item.id !== null && item.id !== undefined)
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
            return []
        }

        throw error
    }
}

export async function addToSaved(opportunity) {
    const opportunityId = typeof opportunity === 'object' ? opportunity.id : opportunity
    const result = await addToFavorites(opportunityId)

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'added', opportunityId }
    }))

    return result
}

export async function removeFromSaved(opportunityId) {
    const result = await removeFromFavorites(opportunityId)

    window.dispatchEvent(new CustomEvent('favorites-updated', {
        detail: { action: 'removed', opportunityId }
    }))

    return result
}

export async function getSeekerRecommendations() {
    try {
        const [incoming, outgoing] = await Promise.all([
            getIncomingRecommendations(),
            getOutgoingRecommendations(),
        ])

        return {
            incoming: Array.isArray(incoming) ? incoming : [],
            outgoing: Array.isArray(outgoing) ? outgoing : [],
        }
    } catch (error) {
        if (error?.code === 'applicant_networking_requires_approved_profile') {
            throw error
        }

        if ([401, 500, 503].includes(error.status)) {
            return { incoming: [], outgoing: [] }
        }

        throw error
    }
}

export async function sendSeekerRecommendation(data) {
    return createRecommendation(data)
}

export async function removeSeekerRecommendation(recommendationId) {
    return deleteRecommendation(recommendationId)
}

// ========== EMPLOYER OPPORTUNITIES ==========

export async function getEmployerOpportunities(params = {}) {
    try {
        const page = await listEmployerOpportunities({
            limit: params.limit || 50,
            offset: params.offset || 0,
            sortBy: params.sortBy || 'UPDATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            status: params.status,
            group: params.group,
            type: params.type,
            workFormat: params.workFormat,
            search: params.search,
        })

        return page || { items: [], total: 0, limit: 50, offset: 0 }
    } catch (error) {
        if ([500, 503].includes(error?.status)) {
            return { items: [], total: 0, limit: 50, offset: 0 }
        }
        throw error
    }
}

export async function getEmployerOpportunityById(opportunityId) {
    const data = await getEmployerOpportunity(opportunityId)
    return normalizeOpportunity(data)
}

export async function createOpportunity(opportunity) {
    const payload = buildOpportunityPayload(opportunity)
    const created = await createEmployerOpportunity(payload)
    return normalizeOpportunity(created)
}

export async function updateOpportunity(opportunityId, opportunity) {
    const payload = buildOpportunityPayload(opportunity)
    const updated = await updateEmployerOpportunity(opportunityId, payload)
    return normalizeOpportunity(updated)
}

export async function updateOpportunityStatus(opportunityId, action) {
    if (action === 'close') {
        return closeEmployerOpportunity(opportunityId)
    }

    if (action === 'archive') {
        return archiveEmployerOpportunity(opportunityId)
    }

    if (action === 'draft') {
        return returnToDraftEmployerOpportunity(opportunityId)
    }

    throw createApiError('Неизвестное действие со статусом', 400)
}

export async function deleteOpportunity(opportunityId) {
    await archiveEmployerOpportunity(opportunityId)
    return { success: true }
}

// ========== EMPLOYER RESPONSES ==========

export async function getEmployerApplications(params = {}) {
    try {
        const page = await getEmployerResponses({
            limit: params.limit || 50,
            offset: params.offset || 0,
            sortBy: params.sortBy || 'CREATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            opportunityId: params.opportunityId,
            status: params.status,
            search: params.search,
        })

        return {
            ...page,
            items: Array.isArray(page?.items) ? page.items : [],
        }
    } catch (error) {
        if ([500, 503].includes(error?.status)) {
            return { items: [], total: 0, limit: params.limit || 50, offset: params.offset || 0 }
        }
        throw error
    }
}

export async function updateApplicationStatus(applicationId, status, employerComment = '') {
    return updateInteractionResponseStatus(applicationId, status, employerComment)
}

export async function updateEmployerCompanyData(companyData) {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const payload = {
        legalName: companyData.legalName || '',
        inn: companyData.inn || '',
    }

    const data = await apiRequest(`${API_BASE}/profile/employer/company?currentUser=${currentUser}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })

    return normalizeEmployerProfile(data)
}

export async function submitEmployerProfileForModeration() {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const data = await apiRequest(`${API_BASE}/profile/employer/moderation/submit?currentUser=${currentUser}`, {
        method: 'POST',
    })

    return normalizeEmployerProfile(data)
}

export async function submitApplicantProfileForModeration() {
    const currentUser = encodeURIComponent(JSON.stringify(await getAuthenticatedUserPayload()))

    const data = await apiRequest(`${API_BASE}/profile/applicant/moderation/submit?currentUser=${currentUser}`, {
        method: 'POST',
    })

    return normalizeApplicantProfile(data)
}