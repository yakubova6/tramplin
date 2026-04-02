import { httpJson, toQuery } from './http'
import { getSessionUser, getSessionUserId } from '../utils/sessionStore'

const API_BASE = '/api/interaction'

function getCurrentUser() {
    const user = getSessionUser()
    if (!user?.id || !user?.email || !user?.role) return null

    return {
        userId: user.id,
        email: user.email,
        role: user.role,
    }
}

function getRequiredUserId() {
    const userId = getSessionUserId()
    if (!userId) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return userId
}

function getCurrentUserQueryValue() {
    const currentUser = getCurrentUser()
    return currentUser ? JSON.stringify(currentUser) : null
}

function getRequiredCurrentUser() {
    const currentUser = getCurrentUserQueryValue()
    if (!currentUser) {
        const error = new Error('Пользователь не авторизован')
        error.status = 401
        throw error
    }
    return currentUser
}

export async function getContacts() {
    const userId = getSessionUserId()
    if (!userId) return []

    const query = toQuery({ userId })
    return httpJson(`${API_BASE}/contacts?${query}`)
}

export async function addContact(contactUserId) {
    const userId = getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts?${query}`, {
        method: 'POST',
        body: JSON.stringify({ contactUserId }),
    })
}

export async function acceptContactRequest(contactUserId) {
    const userId = getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}/accept?${query}`, {
        method: 'PATCH',
    })
}

export async function declineContactRequest(contactUserId) {
    const userId = getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}/decline?${query}`, {
        method: 'PATCH',
    })
}

export async function removeContact(contactUserId) {
    const userId = getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/contacts/${contactUserId}?${query}`, {
        method: 'DELETE',
    })
}

export async function getMyResponses() {
    const userId = getSessionUserId()
    if (!userId) return []

    return httpJson(`${API_BASE}/responses/my?${toQuery({ userId })}`)
}

export async function getEmployerResponses(params = {}) {
    const currentUser = getCurrentUserQueryValue()
    const user = getSessionUser()

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
    const userId = getRequiredUserId()
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
    const userId = getRequiredUserId()
    const query = toQuery({ userId })

    return httpJson(`${API_BASE}/responses/${responseId}/status?${query}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment }),
    })
}

export async function getFavorites() {
    const userId = getSessionUserId()
    if (!userId) return []

    return httpJson(`${API_BASE}/favorites?${toQuery({ userId })}`)
}

export async function addToFavorites(opportunityId) {
    const userId = getRequiredUserId()

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId })}`, {
        method: 'POST',
    })
}

export async function removeFromFavorites(opportunityId) {
    const userId = getRequiredUserId()

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId })}`, {
        method: 'DELETE',
    })
}

export async function createRecommendation({ opportunityId, toApplicantUserId, message = '' }) {
    const currentUser = getRequiredCurrentUser()

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
    const currentUser = getCurrentUserQueryValue()
    if (!currentUser) return []

    return httpJson(`${API_BASE}/recommendations/incoming?${toQuery({ currentUser })}`)
}

export async function getOutgoingRecommendations() {
    const currentUser = getCurrentUserQueryValue()
    if (!currentUser) return []

    return httpJson(`${API_BASE}/recommendations/outgoing?${toQuery({ currentUser })}`)
}

export async function deleteRecommendation(recommendationId) {
    const currentUser = getRequiredCurrentUser()

    return httpJson(`${API_BASE}/recommendations/${recommendationId}?${toQuery({ currentUser })}`, {
        method: 'DELETE',
    })
}