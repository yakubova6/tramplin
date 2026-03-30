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
    getEmployerResponses,
    updateResponseStatus as updateInteractionResponseStatus,
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
    return {
        title: opportunity.title?.trim(),
        shortDescription: opportunity.shortDescription?.trim() || '',
        fullDescription: opportunity.fullDescription?.trim() || opportunity.shortDescription?.trim() || '',
        requirements: opportunity.requirements?.trim() || null,
        companyName: opportunity.companyName?.trim() || opportunity.profileCompanyName || 'Компания работодателя',
        type: opportunity.type || 'VACANCY',
        workFormat: opportunity.workFormat || opportunity.format || 'REMOTE',
        employmentType: opportunity.employmentType || 'FULL_TIME',
        grade: opportunity.grade || opportunity.experienceLevel || 'JUNIOR',
        salaryFrom: opportunity.salaryFrom !== '' && opportunity.salaryFrom != null ? Number(opportunity.salaryFrom) : null,
        salaryTo: opportunity.salaryTo !== '' && opportunity.salaryTo != null ? Number(opportunity.salaryTo) : null,
        salaryCurrency: opportunity.salaryCurrency || 'RUB',
        expiresAt: opportunity.expiresAt || null,
        eventDate: opportunity.eventDate || null,
        cityId: opportunity.cityId ? Number(opportunity.cityId) : null,
        locationId: opportunity.locationId ? Number(opportunity.locationId) : null,
        contactInfo: {
            email: opportunity.contactEmail || null,
            phone: opportunity.contactPhone || null,
            telegram: opportunity.contactTelegram || null,
            contactPerson: opportunity.contactPerson || null,
        },
        resourceLinks: normalizeProfileLinks(opportunity.resourceLinks),
        tagIds: Array.isArray(opportunity.tagIds)
            ? opportunity.tagIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
            : [],
    }
}

export async function searchCities(query) {
    if (!query || query.length < 2) return []

    const lowerQuery = query.toLowerCase()
    const filtered = CITIES.filter((city) =>
        city.name.toLowerCase().includes(lowerQuery)
    )

    return filtered.slice(0, 10)
}

export async function getApplicantProfile() {
    const userId = getSessionUserId()
    if (!userId) {
        return null
    }

    const url = `${API_BASE}/profile/applicant/${userId}`

    try {
        const data = await apiRequest(url)

        return {
            ...data,
            cityId: data.city?.id ?? null,
            cityName: data.city?.name ?? '',
            portfolioLinks: normalizeProfileLinks(data.portfolioLinks),
            contactLinks: normalizeContactMethods(data.contactLinks),
        }
    } catch (error) {
        if ([401, 403, 404, 500, 503].includes(error.status)) {
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
            cityId: data.city?.id ?? null,
            cityName: data.city?.name ?? '',
            locationId: data.location?.id ?? null,
            locationPreview: data.location || null,
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
    }

    return apiRequest(`${API_BASE}/profile/employer`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

export async function submitVerification(payload) {
    const user = getSessionUser()
    if (!user) {
        throw createApiError('Пользователь не авторизован', 401)
    }

    const body = {
        verificationMethod: payload.verificationMethod,
        corporateEmail: payload.corporateEmail || null,
        inn: payload.inn || null,
        professionalLinks: Array.isArray(payload.professionalLinks)
            ? payload.professionalLinks.filter(Boolean)
            : [],
        submittedComment: payload.submittedComment || null,
    }

    return apiRequest(`${API_BASE}/employer/verification`, {
        method: 'POST',
        body: JSON.stringify(body),
    })
}

export async function getSeekerContacts() {
    try {
        const contacts = await getContacts()
        if (!Array.isArray(contacts)) return []

        return contacts.map((c) => ({
            id: c.contactUserId,
            firstName: c.contactName?.split(' ')[0] || '',
            lastName: c.contactName?.split(' ').slice(1).join(' ') || '',
            status: c.status,
            createdAt: c.createdAt,
        }))
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
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

export async function getEmployerOpportunities(params = {}) {
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

    return {
        ...page,
        items: Array.isArray(page?.items) ? page.items.map(normalizeOpportunity) : [],
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
            items: Array.isArray(page?.items)
                ? page.items.map((item) => ({
                    id: item.id,
                    opportunityId: item.opportunityId,
                    opportunityTitle: item.opportunityTitle,
                    status: item.status,
                    employerComment: item.employerComment || '',
                    applicantComment: item.applicantComment || '',
                    coverLetter: item.coverLetter || '',
                    createdAt: item.createdAt,
                    applicant: item.applicant || null,
                }))
                : [],
        }
    } catch (error) {
        if ([401, 403, 500, 503].includes(error.status)) {
            return { items: [], total: 0, limit: params.limit || 50, offset: params.offset || 0 }
        }

        throw error
    }
}

export async function updateApplicationStatus(applicationId, status, employerComment = '') {
    return updateInteractionResponseStatus(applicationId, status, employerComment)
}