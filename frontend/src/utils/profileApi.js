// utils/profileApi.js

const API_BASE = '/api'
import { CITIES } from '../constants/cities'

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
            // Если это массив строк
            if (profile.portfolioLinks.length > 0 && typeof profile.portfolioLinks[0] === 'string') {
                portfolioLinks = profile.portfolioLinks
            }
            // Если это массив объектов
            else if (profile.portfolioLinks.length > 0 && profile.portfolioLinks[0].url) {
                portfolioLinks = profile.portfolioLinks.map(link => link.url)
            }
        } else if (typeof profile.portfolioLinks === 'object') {
            // Если это объект
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
        return data
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
        socialLinks: profile.socialLinks || [],
        publicContacts: profile.publicContacts || [],
        verificationStatus: profile.verificationStatus || 'PENDING',
    }

    console.log('[API] Saving employer profile with PATCH:', payload)

    const url = `${API_BASE}/profile/employer`
    console.log('[API] PATCH employer profile:', url)

    const data = await apiRequest(url, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
    console.log('[API] Employer profile saved:', data)
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
    console.log('[API] Verification response:', data)
    return data
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ (локально) ==========

export async function getSeekerApplications() {
    const user = getCurrentUser()
    if (!user) return []
    const key = `seeker_applications_${user.email}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
}

export async function getSeekerSaved() {
    const user = getCurrentUser()
    if (!user) return []
    const key = `seeker_saved_${user.email}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
}

export async function addToSaved(opportunity) {
    const user = getCurrentUser()
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `seeker_saved_${user.email}`
    const saved = localStorage.getItem(key)
    const savedItems = saved ? JSON.parse(saved) : []
    if (!savedItems.some(item => item.id === opportunity.id)) {
        const updated = [opportunity, ...savedItems]
        localStorage.setItem(key, JSON.stringify(updated))
    }
    return { success: true }
}

export async function removeFromSaved(opportunityId) {
    const user = getCurrentUser()
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `seeker_saved_${user.email}`
    const saved = localStorage.getItem(key)
    const savedItems = saved ? JSON.parse(saved) : []
    const updated = savedItems.filter(item => item.id !== opportunityId)
    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}

export async function getEmployerOpportunities() {
    const user = getCurrentUser()
    if (!user) return []
    const key = `employer_opportunities_${user.email}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
}

export async function createOpportunity(opportunity) {
    const user = getCurrentUser()
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `employer_opportunities_${user.email}`
    const saved = localStorage.getItem(key)
    const opportunities = saved ? JSON.parse(saved) : []
    const newOpportunity = {
        id: Date.now(),
        ...opportunity,
        createdAt: new Date().toISOString(),
        status: 'active',
    }
    const updated = [newOpportunity, ...opportunities]
    localStorage.setItem(key, JSON.stringify(updated))
    return newOpportunity
}

export async function deleteOpportunity(opportunityId) {
    const user = getCurrentUser()
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `employer_opportunities_${user.email}`
    const saved = localStorage.getItem(key)
    const opportunities = saved ? JSON.parse(saved) : []
    const updated = opportunities.filter(opp => opp.id !== opportunityId)
    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}

export async function getEmployerApplications() {
    const user = getCurrentUser()
    if (!user) return []
    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    return saved ? JSON.parse(saved) : []
}

export async function updateApplicationStatus(applicationId, status) {
    const user = getCurrentUser()
    if (!user) throw new Error('Пользователь не авторизован')
    const key = `employer_applications_${user.email}`
    const saved = localStorage.getItem(key)
    const applications = saved ? JSON.parse(saved) : []
    const updated = applications.map(app =>
        app.id === applicationId ? { ...app, status } : app
    )
    localStorage.setItem(key, JSON.stringify(updated))
    return { success: true }
}