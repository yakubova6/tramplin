import { httpJson, toQuery } from './http'
import { getSessionUser } from '../utils/sessionStore'

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

function getCurrentUserQueryValue() {
    const currentUser = getCurrentUser()
    return currentUser ? JSON.stringify(currentUser) : null
}

export async function getContacts() {
    const user = getSessionUser()
    if (!user?.id) return []

    const result = await httpJson(`${API_BASE}/contacts`)
    console.log('[interaction] getContacts raw response:', result)
    return result
}

export async function addContact(contactUserId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    console.log('[interaction] addContact request body:', { contactUserId })

    const result = await httpJson(`${API_BASE}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactUserId }),
    })

    console.log('[interaction] addContact response:', result)
    return result
}

export async function acceptContactRequest(contactUserId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    const result = await httpJson(`${API_BASE}/contacts/${contactUserId}/accept`, {
        method: 'PATCH',
    })

    console.log('[interaction] acceptContactRequest response:', result)
    return result
}

export async function declineContactRequest(contactUserId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    const result = await httpJson(`${API_BASE}/contacts/${contactUserId}/decline`, {
        method: 'PATCH',
    })

    console.log('[interaction] declineContactRequest response:', result)
    return result
}

export async function removeContact(contactUserId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    const result = await httpJson(`${API_BASE}/contacts/${contactUserId}`, {
        method: 'DELETE',
    })

    console.log('[interaction] removeContact response:', result)
    return result
}

export async function getMyResponses() {
    const user = getSessionUser()
    if (!user?.id) return []
    return httpJson(`${API_BASE}/responses/my?${toQuery({ userId: user.id })}`)
}

export async function getEmployerResponses(params = {}) {
    const currentUser = getCurrentUserQueryValue()

    const query = toQuery({
        limit: params.limit ?? 20,
        offset: params.offset ?? 0,
        sortBy: params.sortBy || 'CREATED_AT',
        sortDirection: params.sortDirection || 'DESC',
        opportunityId: params.opportunityId,
        status: params.status,
        search: params.search,
        currentUser,
    })

    return httpJson(`/api/employer/responses${query ? `?${query}` : ''}`)
}

export async function createResponse(opportunityId, applicantComment = '', coverLetter = '') {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    return httpJson(`${API_BASE}/responses?${toQuery({ userId: user.id })}`, {
        method: 'POST',
        body: JSON.stringify({
            opportunityId,
            applicantComment,
            coverLetter,
        }),
    })
}

export async function updateResponseStatus(responseId, status, employerComment = '') {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    return httpJson(`${API_BASE}/responses/${responseId}/status?${toQuery({ userId: user.id })}`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment }),
    })
}

export async function getFavorites() {
    const user = getSessionUser()
    if (!user?.id) return []
    return httpJson(`${API_BASE}/favorites?${toQuery({ userId: user.id })}`)
}

export async function addToFavorites(opportunityId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId: user.id })}`, {
        method: 'POST',
    })
}

export async function removeFromFavorites(opportunityId) {
    const user = getSessionUser()
    if (!user?.id) throw new Error('Пользователь не авторизован')

    return httpJson(`${API_BASE}/favorites/opportunities/${opportunityId}?${toQuery({ userId: user.id })}`, {
        method: 'DELETE',
    })
}

export async function createRecommendation({ opportunityId, toApplicantUserId, message = '' }) {
    const currentUser = getCurrentUserQueryValue()
    if (!currentUser) throw new Error('Пользователь не авторизован')

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
    const currentUser = getCurrentUserQueryValue()
    if (!currentUser) throw new Error('Пользователь не авторизован')

    return httpJson(`${API_BASE}/recommendations/${recommendationId}?${toQuery({ currentUser })}`, {
        method: 'DELETE',
    })
}