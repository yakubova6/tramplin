import { httpJson, toQuery, getSessionUserFromApi, getSessionUserIdFromApi, getRequiredCurrentUserPayload } from './http'

const API_BASE = '/api/interaction'

async function getCurrentUser() {
    const user = await getSessionUserFromApi()
    if (!user?.id || !user?.email || !user?.role) return null

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    }
}

async function getRequiredUserId() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return userId
}

async function getCurrentUserQueryValue() {
    const currentUser = await getCurrentUser()
    return currentUser ? JSON.stringify(currentUser) : null
}

async function getRequiredCurrentUser() {
    const currentUser = JSON.stringify(await getRequiredCurrentUserPayload())
    if (!currentUser) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return currentUser
}

export async function getContacts() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    const query = toQuery({ userId })
    return httpJson(`${API_BASE}/contacts?${query}`)
}

export async function addContact(contactUserId) {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts?${query}`, {
        method: 'POST',
        body: JSON.stringify({ contactUserId }),
    })
}

export async function acceptContactRequest(contactUserId) {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}/accept?${query}`, {
        method: 'PATCH',
    })
}

export async function declineContactRequest(contactUserId) {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}/decline?${query}`, {
        method: 'PATCH',
    })
}

export async function removeContact(contactUserId) {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}?${query}`, {
        method: 'DELETE',
    })
}

export async function getMyResponses() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/responses/my?${toQuery({ userId })}`)
}

export async function getEmployerResponses(params = {}) {
    const currentUser = await getCurrentUserQueryValue()
    const user = await getSessionUserFromApi()

    const fullQuery = toQuery({
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        sortBy: params.sortBy || 'CREATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        opportunityId: params.opportunityId,
        status: params.status,
        search: params.search,
        currentUser,
    })

    try {
        return await httpJson(`/api/employer/responses${fullQuery ? `?${fullQuery}` : ''}`)
    } catch (error) {
        console.warn('[interaction] employer responses with currentUser failed, retrying with currentUserId:', error)

        if (!user?.id) {
            throw error
        }

        const fallbackQuery = toQuery({
            limit: params.limit ?? 20,
            offset: params.offset ?? 0,
            sortBy: params.sortBy || 'CREATED_AT',
            sortDirection: params.sortDirection || 'DESC',
            opportunityId: params.opportunityId,
            status: params.status,
            search: params.search,
            currentUserId: user.id,
        })

        return httpJson(`/api/employer/responses${fallbackQuery ? `?${fallbackQuery}` : ''}`)
    }
}

export async function createResponse(opportunityId, applicantComment = '', coverLetter = '') {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/responses?${query}`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            applicantComment,
            coverLetter,
        }),
    })
}

export async function updateResponseStatus(responseId, status, employerComment = '') {
    const userId = await getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/responses/${responseId}/status?${query}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment }),
    })
}

export async function getFavorites() {
    const userId = await getSessionUserIdFromApi()
    if (!userId) return []

    return httpJson(`${API_BASE}/favorites?${toQuery({ userId })}`, {
        dedupe: true,
        cacheTtlMs: 15_000,
    })
}

export async function addToFavorites(opportunityId) {
    const userId = await getRequiredUserId()

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId })}`, {
        method: 'POST',
    })
}

export async function removeFromFavorites(opportunityId) {
    const userId = await getRequiredUserId()

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId })}`, {
        method: 'DELETE',
    })
}

export async function addEmployerToFavorites(employerUserId) {
    const userId = await getRequiredUserId()
    return httpJson(`${API_BASE}/favorites/employers/${employerUserId}?${toQuery({ userId })}`, {
        method: 'POST',
    })
}

export async function removeEmployerFromFavorites(employerUserId) {
    const userId = await getRequiredUserId()
    return httpJson(`${API_BASE}/favorites/employers/${employerUserId}?${toQuery({ userId })}`, {
        method: 'DELETE',
    })
}

export async function createRecommendation({ opportunityId, toApplicantUserId, message = '' }) {
    const currentUser = await getRequiredCurrentUser()

    return httpJson(`${API_BASE}/recommendations?${toQuery({ currentUser })}`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            toApplicantUserId,
            message,
        }),
    })
}

export async function getIncomingRecommendations() {
    const currentUser = await getCurrentUserQueryValue()
    if (!currentUser) return []

    return httpJson(`${API_BASE}/recommendations/incoming?${toQuery({ currentUser })}`)
}

export async function getOutgoingRecommendations() {
    const currentUser = await getCurrentUserQueryValue()
    if (!currentUser) return []

    return httpJson(`${API_BASE}/recommendations/outgoing?${toQuery({ currentUser })}`)
}

export async function updateRecommendationStatus(recommendationId, status) {
    const currentUser = await getRequiredCurrentUser()

    return httpJson(`${API_BASE}/recommendations/${recommendationId}/status?${toQuery({ currentUser })}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
    })
}

export async function deleteRecommendation(recommendationId) {
    const currentUser = await getRequiredCurrentUser()

    return httpJson(`${API_BASE}/recommendations/${recommendationId}?${toQuery({ currentUser })}`, {
        method: 'DELETE',
    })
}
