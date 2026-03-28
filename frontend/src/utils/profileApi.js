const API_BASE = '/api'
import { CITIES } from '../constants/cities'
import {
    archiveEmployerOpportunity,
    createEmployerOpportunity,
    listEmployerOpportunities
} from '../api/opportunities'

function getCurrentUser() {
    try {
        const stored = localStorage.getItem('tramplin_current_user')
        return stored ? JSON.parse(stored) : null
    } catch {
        return null
    }
}

async function apiRequest(endpoint, options = {}) {
    console.log(`[API] ${options.method || 'GET'} ${endpoint}`)

    const response = await fetch(endpoint, {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
        },
        ...options,
    })

    if (!response.ok) {
        let errorMessage = 'Ошибка запроса'
        try {
            const errorData = await response.json()
            errorMessage = errorData.message || errorData.error || errorMessage
        } catch {
            // ignore
        }
        throw new Error(errorMessage)
    }

    return response.json()
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

/**
 * Получение профиля соискателя
 * GET /api/profile/applicant/{userId}
 */
export async function getApplicantProfile() {
    const user = getCurrentUser()
    if (!user || !user.userId) {
        throw new Error('Пользователь не авторизован')
    }

    const url = `${API_BASE}/profile/applicant/${user.userId}`
    console.log('[API] GET applicant profile:', url)

    try {
        const data = await apiRequest(url)
        console.log('[API] Applicant profile received:', data)
        return data
    } catch (error) {
        console.log('[API] Profile not found:', error.message)
        return null
    }
}

/**
 * Обновление профиля соискателя
 * PATCH /api/profile/applicant (текущий пользователь из сессии)
 */
export async function updateApplicantProfile(profile) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    // Если приходит массив объектов, преобразуем в массив строк
    let portfolioLinks = []
    let contactLinks = []

    if (profile.portfolioLinks) {
        if (Array.isArray(profile.portfolioLinks)) {
            if (profile.portfolioLinks.length > 0 && typeof profile.portfolioLinks[0] === 'string') {
                portfolioLinks = profile.portfolioLinks
            } else if (profile.portfolioLinks.length > 0 && profile.portfolioLinks[0].url) {
                portfolioLinks = profile.portfolioLinks.map(link => link.url)
            }
        } else if (typeof profile.portfolioLinks === 'object') {
            portfolioLinks = Object.values(profile.portfolioLinks)
        }
    }

    if (profile.contactLinks) {
        if (Array.isArray(profile.contactLinks)) {
            if (profile.contactLinks.length > 0 && typeof profile.contactLinks[0] === 'string') {
                contactLinks = profile.contactLinks
            } else if (profile.contactLinks.length > 0 && profile.contactLinks[0].url) {
                contactLinks = profile.contactLinks.map(link => link.url)
            }
        } else if (typeof profile.contactLinks === 'object') {
            contactLinks = Object.values(profile.contactLinks)
        }
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
        portfolioLinks: portfolioLinks,
        contactLinks: contactLinks,
        profileVisibility: profile.profileVisibility || 'AUTHENTICATED',
        resumeVisibility: profile.resumeVisibility || 'AUTHENTICATED',
        applicationsVisibility: profile.applicationsVisibility || 'PRIVATE',
        contactsVisibility: profile.contactsVisibility || 'AUTHENTICATED',
        openToWork: profile.openToWork ?? true,
        openToEvents: profile.openToEvents ?? true,
    }

    console.log('[API] Saving applicant profile with PATCH:', payload)

    const url = `${API_BASE}/profile/applicant`
    const data = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
    return data
}

// ========== ОТКЛИКИ ==========

/**
 * Получение списка откликов соискателя
 * GET /api/applicant/applications
 */
export async function getSeekerApplications() {
    const user = getCurrentUser()
    if (!user) return []

    try {
        const url = `${API_BASE}/applicant/applications`
        console.log('[API] GET applications:', url)
        const data = await apiRequest(url)
        return data || []
    } catch (error) {
        console.error('[API] Failed to load applications:', error)
        return []
    }
}

/**
 * Отклик на вакансию
 * POST /api/opportunities/{id}/apply
 */
export async function applyToOpportunity(opportunityId, message = '') {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Чтобы откликнуться, необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/opportunities/${opportunityId}/apply`
    console.log('[API] POST apply:', url)

    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ message }),
    })
}

// ========== ИЗБРАННОЕ ==========

/**
 * Получение списка избранных вакансий
 * GET /api/applicant/saved
 */
export async function getSeekerSaved() {
    const user = getCurrentUser()
    if (!user) return []

    try {
        const url = `${API_BASE}/applicant/saved`
        console.log('[API] GET saved:', url)
        const data = await apiRequest(url)
        return data || []
    } catch (error) {
        console.error('[API] Failed to load saved:', error)
        return []
    }
}

/**
 * Добавление вакансии в избранное
 * POST /api/opportunities/{id}/save
 */
export async function addToSaved(opportunityId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/opportunities/${opportunityId}/save`
    console.log('[API] POST save:', url)

    return apiRequest(url, {
        method: 'POST',
    })
}

/**
 * Удаление вакансии из избранного
 * DELETE /api/opportunities/{id}/save
 */
export async function removeFromSaved(opportunityId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/opportunities/${opportunityId}/save`
    console.log('[API] DELETE saved:', url)

    return apiRequest(url, {
        method: 'DELETE',
    })
}

// ========== ПРОФЕССИОНАЛЬНЫЕ КОНТАКТЫ (INTERACTION API) ==========

/**
 * Получение списка контактов соискателя
 * GET /api/interaction/contacts
 */
export async function getSeekerContacts() {
    const user = getCurrentUser()
    if (!user) return []

    try {
        const url = `${API_BASE}/interaction/contacts`
        console.log('[API] GET contacts:', url)
        const data = await apiRequest(url)
        return data || []
    } catch (error) {
        console.error('[API] Failed to load contacts:', error)
        return []
    }
}

/**
 * Отправка запроса на добавление в контакты
 * POST /api/interaction/contacts
 * Body: { "contactUserId": userId }
 */
export async function addContact(contactUserId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/interaction/contacts`
    console.log('[API] POST add contact:', url)

    return apiRequest(url, {
        method: 'POST',
        body: JSON.stringify({ contactUserId }),
    })
}

/**
 * Принять запрос в контакты
 * POST /api/interaction/contacts/{requestId}/accept
 */
export async function acceptContactRequest(requestId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/interaction/contacts/${requestId}/accept`
    console.log('[API] POST accept contact:', url)

    return apiRequest(url, {
        method: 'POST',
    })
}

/**
 * Отклонить запрос в контакты
 * POST /api/interaction/contacts/{requestId}/decline
 */
export async function declineContactRequest(requestId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/interaction/contacts/${requestId}/decline`
    console.log('[API] POST decline contact:', url)

    return apiRequest(url, {
        method: 'POST',
    })
}

/**
 * Удаление из контактов
 * DELETE /api/interaction/contacts/{contactUserId}
 */
export async function removeContact(contactUserId) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/interaction/contacts/${contactUserId}`
    console.log('[API] DELETE contact:', url)

    return apiRequest(url, {
        method: 'DELETE',
    })
}

// ========== РАБОТОДАТЕЛЬ ==========

/**
 * Получение профиля работодателя
 * GET /api/profile/employer/{userId}
 */
export async function getEmployerProfile() {
    const user = getCurrentUser()
    if (!user || !user.userId) {
        throw new Error('Пользователь не авторизован')
    }

    const url = `${API_BASE}/profile/employer/${user.userId}`
    console.log('[API] GET employer profile:', url)

    try {
        const data = await apiRequest(url)
        console.log('[API] Employer profile received:', data)

        const socialLinksArray = data.socialLinks && Array.isArray(data.socialLinks)
            ? data.socialLinks.map((url, index) => ({
                id: index,
                title: `Ссылка ${index + 1}`,
                url: url
            }))
            : []

        const publicContactsArray = data.publicContacts && typeof data.publicContacts === 'object'
            ? Object.entries(data.publicContacts).map(([title, url], index) => ({
                id: index,
                title: title,
                url: url
            }))
            : []

        return {
            ...data,
            socialLinks: socialLinksArray,
            publicContacts: publicContactsArray,
        }
    } catch (error) {
        console.log('[API] Profile not found:', error.message)
        return null
    }
}

/**
 * Обновление профиля работодателя
 * PATCH /api/profile/employer (текущий пользователь из сессии)
 */
export async function updateEmployerProfile(profile) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    let socialLinks = []
    if (profile.socialLinks) {
        if (Array.isArray(profile.socialLinks)) {
            if (profile.socialLinks.length > 0 && profile.socialLinks[0].title !== undefined) {
                socialLinks = profile.socialLinks
                    .filter(link => link.url?.trim())
                    .map(link => link.url.trim())
            } else if (profile.socialLinks.length > 0 && typeof profile.socialLinks[0] === 'string') {
                socialLinks = profile.socialLinks.filter(url => url?.trim())
            }
        } else if (typeof profile.socialLinks === 'object') {
            socialLinks = Object.values(profile.socialLinks).filter(url => url?.trim())
        }
    }

    let publicContacts = {}
    if (profile.publicContacts) {
        if (Array.isArray(profile.publicContacts)) {
            if (profile.publicContacts.length > 0 && profile.publicContacts[0].title !== undefined) {
                profile.publicContacts.forEach(contact => {
                    const title = contact.title?.trim()
                    const url = contact.url?.trim()
                    if (title && url) {
                        publicContacts[title] = url
                    }
                })
            } else if (profile.publicContacts.length > 0 && typeof profile.publicContacts[0] === 'string') {
                profile.publicContacts.forEach((url, index) => {
                    if (url?.trim()) {
                        publicContacts[`contact_${index + 1}`] = url.trim()
                    }
                })
            }
        } else if (typeof profile.publicContacts === 'object') {
            publicContacts = profile.publicContacts
        }
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
        socialLinks: socialLinks,
        publicContacts: publicContacts,
        verificationStatus: profile.verificationStatus || 'PENDING',
    }

    console.log('[API] Saving employer profile with PATCH:', JSON.stringify(payload, null, 2))

    const url = `${API_BASE}/profile/employer`
    const data = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
    return data
}

/**
 * Отправка на верификацию
 * POST /api/employer/verification
 */
export async function submitVerification(payload) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Пользователь не авторизован')
    }

    const url = `${API_BASE}/employer/verification`
    console.log('[API] Submitting verification:', payload)

    const data = await apiRequest(url, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
    return data
}

// ========== РАБОТОДАТЕЛЬ: ВАКАНСИИ И ОТКЛИКИ ==========

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

/**
 * Получение списка откликов на вакансии работодателя
 * GET /api/employer/applications
 */
export async function getEmployerApplications() {
    const user = getCurrentUser()
    if (!user) return []

    try {
        const url = `${API_BASE}/employer/applications`
        console.log('[API] GET employer applications:', url)
        const data = await apiRequest(url)
        return data || []
    } catch (error) {
        console.error('[API] Failed to load employer applications:', error)
        return []
    }
}

/**
 * Обновление статуса отклика
 * PATCH /api/employer/applications/{id}
 */
export async function updateApplicationStatus(applicationId, status) {
    const user = getCurrentUser()
    if (!user) {
        throw new Error('Необходимо войти в аккаунт')
    }

    const url = `${API_BASE}/employer/applications/${applicationId}`
    console.log('[API] PATCH application status:', url)

    return apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    })
}