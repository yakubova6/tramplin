const API_BASE = '/api'

import { CITIES } from '../constants/cities'
import {
    archiveEmployerOpportunity,
    createEmployerOpportunity,
    listEmployerOpportunities
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
} from './interaction'
import { clearSessionUser, getSessionUser, getSessionUserId } from '../utils/sessionStore'

function createApiError(message, status = 0) {
    const error = new Error(message)
    error.status = status
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

        if (response.status === 401 || response.status === 403) {
            clearSessionUser()
        }

        throw createApiError(errorMessage, response.status)
    }

    return data
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

function normalizeContactMethods(contacts) {
    if (!contacts) return []

    if (Array.isArray(contacts)) {
        return contacts
            .map((item, index) => {
                if (typeof item === 'string') {
                    const value = item.trim()
                    if (!value) return null

                    return {
                        type: 'OTHER',
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

                    return {
                        type: item.type || 'OTHER',
                        value,
                        label: item.label?.trim?.() || item.title?.trim?.() || `Контакт ${index + 1}`,
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

                return {
                    type: 'OTHER',
                    value: normalizedValue,
                    label: label?.trim?.() || `Контакт ${index + 1}`,
                }
            })
            .filter(Boolean)
    }

    return []
}

function getContactDirectionStorageKey() {
    const user = getSessionUser()
    return user?.id ? `tramplin_contact_directions_${user.id}` : 'tramplin_contact_directions_guest'
}

function readContactDirections() {
    try {
        const raw = localStorage.getItem(getContactDirectionStorageKey())
        return raw ? JSON.parse(raw) : {}
    } catch {
        return {}
    }
}

function writeContactDirections(value) {
    localStorage.setItem(getContactDirectionStorageKey(), JSON.stringify(value))
}

function markContactDirection(contactUserId, direction) {
    const map = readContactDirections()
    map[String(contactUserId)] = direction
    writeContactDirections(map)
}

function removeContactDirection(contactUserId) {
    const map = readContactDirections()
    delete map[String(contactUserId)]
    writeContactDirections(map)
}

function getContactDirection(contactUserId) {
    const map = readContactDirections()
    return map[String(contactUserId)] || null
}

// guest favorites
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
    const user = getSessionUser()
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

// ========== ПОИСК ГОРОДОВ (локальная версия) ==========

export async function searchCities(query) {
    if (!query || query.length < 2) return []

    const lowerQuery = query.toLowerCase()
    const filtered = CITIES.filter(city =>
        city.name.toLowerCase().includes(lowerQuery)
    )

    console.log('[API] Cities found (local):', filtered)
    return filtered.slice(0, 10)
}

// ========== СОИСКАТЕЛЬ ==========

export async function getApplicantProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/applicant/${userId}`
    console.log('[API] GET applicant profile:', url)

    try {
        const data = await apiRequest(url)
        console.log('[API] Applicant profile received:', data)

        return {
            ...data,
            portfolioLinks: normalizeProfileLinks(data.portfolioLinks),
            contactLinks: normalizeContactMethods(data.contactLinks),
        }
    } catch (error) {
        if ([401, 403, 404, 500, 503].includes(error.status)) {
            console.log('[API] Applicant profile unavailable:', error.message)
            return null
        }

        throw error
    }
}

export async function updateApplicantProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

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
    }

    return apiRequest(`${API_BASE}/profile/applicant`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

// ========== РАБОТОДАТЕЛЬ ==========

export async function getEmployerProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/employer/${userId}`

    try {
        const data = await apiRequest(url)
        return {
            ...data,
            socialLinks: normalizeProfileLinks(data.socialLinks),
            publicContacts: normalizeContactMethods(data.publicContacts),
        }
    } catch (error) {
        if ([401, 403, 404, 500, 503].includes(error.status)) {
            return null
        }

        throw error
    }
}

export async function updateEmployerProfile(profile) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    const payload = {
        companyName: profile.companyName || '',
        legalName: profile.legalName || null,
        inn: profile.inn || '',
        description: profile.description || null,
        industry: profile.industry || null,
        websiteUrl: profile.websiteUrl || null,
        cityId: profile.cityId || null,
        locationId: profile.locationId || null,
        companySize: profile.companySize || null,
        foundedYear: profile.foundedYear ? Number(profile.foundedYear) : null,
        socialLinks: normalizeProfileLinks(profile.socialLinks),
        publicContacts: normalizeContactMethods(profile.publicContacts),
        verificationStatus: profile.verificationStatus || 'PENDING',
    }

    return apiRequest(`${API_BASE}/profile/employer`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

export async function submitVerification(payload) {
    return apiRequest(`${API_BASE}/employer/verification`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

// ========== INTERACTION API: СОИСКАТЕЛЬ ==========

export async function getSeekerContacts() {
    try {
        const contacts = await getContacts()
        console.log('[profile] getSeekerContacts raw contacts:', contacts)

        if (!Array.isArray(contacts)) {
            console.log('[profile] getSeekerContacts: response is not array')
            return []
        }

        const mappedContacts = contacts.map((c) => {
            const direction = getContactDirection(c.contactUserId)

            const mapped = {
                id: c.contactUserId,
                firstName: c.contactName?.split(' ')[0] || '',
                lastName: c.contactName?.split(' ').slice(1).join(' ') || '',
                fullName: c.contactName || '',
                status: c.status,
                createdAt: c.createdAt,
                direction: c.status === 'ACCEPTED'
                    ? 'confirmed'
                    : (direction || 'incoming'),
            }

            console.log('[profile] mapped contact:', {
                raw: c,
                localDirection: direction,
                mapped,
            })

            return mapped
        })

        console.log('[profile] getSeekerContacts mapped contacts:', mappedContacts)
        return mappedContacts
    } catch (error) {
        console.log('[profile] getSeekerContacts error:', error)

        if ([401, 403, 500, 503].includes(error.status)) {
            return []
        }

        throw error
    }
}

export async function addContact(contactUserId) {
    const result = await addContactApi(contactUserId)
    markContactDirection(contactUserId, 'outgoing')
    return result
}

export async function acceptContact(contactUserId) {
    const result = await acceptContactRequest(contactUserId)
    markContactDirection(contactUserId, 'confirmed')
    return result
}

export async function declineContact(contactUserId) {
    const result = await declineContactRequest(contactUserId)
    removeContactDirection(contactUserId)
    return result
}

export async function removeContact(contactUserId) {
    const result = await removeContactApi(contactUserId)
    removeContactDirection(contactUserId)
    return result
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
        if ([401, 403, 500, 503].includes(error.status)) {
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

export async function getEmployerOpportunities(params = {}) {
    const page = await listEmployerOpportunities({
        limit: params.limit || 20,
        offset: params.offset || 0,
        sortBy: params.sortBy || 'UPDATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        status: params.status,
        group: params.group,
        type: params.type,
        workFormat: params.workFormat,
        search: params.search,
    })

    return page?.items || []
}

function normalizeTagIds(tagIds) {
    if (!Array.isArray(tagIds)) return []
    return tagIds
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0)
}

export async function createOpportunity(opportunity) {
    const payload = {
        title: opportunity.title?.trim(),
        shortDescription: opportunity.shortDescription?.trim() || opportunity.description?.trim() || '',
        fullDescription: opportunity.fullDescription?.trim() || opportunity.description?.trim() || '',
        requirements: opportunity.requirements?.trim() || null,
        companyName: opportunity.companyName?.trim() || opportunity.profileCompanyName || 'Компания работодателя',
        type: opportunity.type || 'VACANCY',
        workFormat: opportunity.workFormat || opportunity.format || 'REMOTE',
        employmentType: opportunity.employmentType || 'FULL_TIME',
        grade: opportunity.grade || opportunity.experienceLevel || 'JUNIOR',
        salaryFrom: opportunity.salaryFrom ? Number(opportunity.salaryFrom) : null,
        salaryTo: opportunity.salaryTo ? Number(opportunity.salaryTo) : null,
        salaryCurrency: opportunity.salaryCurrency || 'RUB',
        expiresAt: opportunity.expiresAt || opportunity.deadline || null,
        eventDate: opportunity.eventDate || null,
        cityId: opportunity.cityId ? Number(opportunity.cityId) : null,
        locationId: opportunity.locationId ? Number(opportunity.locationId) : null,
        contactInfo: {
            email: opportunity.contactEmail || null,
            phone: opportunity.contactPhone || null,
            telegram: opportunity.contactTelegram || null,
            contactPerson: opportunity.contactPerson || null,
        },
        resourceLinks: Array.isArray(opportunity.resourceLinks) ? opportunity.resourceLinks : [],
        tagIds: normalizeTagIds(opportunity.tagIds),
    }

    return createEmployerOpportunity(payload)
}

export async function deleteOpportunity(opportunityId) {
    await archiveEmployerOpportunity(opportunityId)
    return { success: true }
}

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
        if ([401, 403, 500, 503].includes(error.status)) {
            return { items: [], total: 0, limit: params.limit || 50, offset: params.offset || 0 }
        }

        throw error
    }
}

export async function updateApplicationStatus(applicationId, status) {
    const user = getSessionUser()
    if (!user) throw createApiError('Пользователь не авторизован', 401)

    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    const applications = saved ? JSON.parse(saved) : []
    const updated = applications.map(app =>
        app.id === applicationId ? { ...app, status } : app
    )
    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}