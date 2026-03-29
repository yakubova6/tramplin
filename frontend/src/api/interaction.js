import { httpJson } from './http'

const API_BASE = '/api/interaction'

// ========== КОНТАКТЫ ==========

/**
 * Получение списка контактов текущего пользователя
 * GET /api/interaction/contacts
 */
export async function getContacts() {
    console.log('[API] getContacts:', `${API_BASE}/contacts`)
    return httpJson(`${API_BASE}/contacts`)
}

/**
 * Отправка запроса на добавление в контакты
 * POST /api/interaction/contacts
 * Body: { "contactUserId": userId }
 */
export async function addContact(contactUserId) {
    console.log('[API] addContact:', `${API_BASE}/contacts`, { contactUserId })
    return httpJson(`${API_BASE}/contacts`, {
        method: 'POST',
        body: JSON.stringify({ contactUserId })
    })
}

/**
 * Принять запрос в контакты
 * PATCH /api/interaction/contacts/{contactUserId}/accept
 */
export async function acceptContactRequest(contactUserId) {
    console.log('[API] acceptContactRequest:', `${API_BASE}/contacts/${contactUserId}/accept`)
    return httpJson(`${API_BASE}/contacts/${contactUserId}/accept`, {
        method: 'PATCH'
    })
}

/**
 * Отклонить запрос в контакты
 * PATCH /api/interaction/contacts/{contactUserId}/decline
 */
export async function declineContactRequest(contactUserId) {
    console.log('[API] declineContactRequest:', `${API_BASE}/contacts/${contactUserId}/decline`)
    return httpJson(`${API_BASE}/contacts/${contactUserId}/decline`, {
        method: 'PATCH'
    })
}

/**
 * Удалить из контактов
 * DELETE /api/interaction/contacts/{contactUserId}
 */
export async function removeContact(contactUserId) {
    console.log('[API] removeContact:', `${API_BASE}/contacts/${contactUserId}`)
    return httpJson(`${API_BASE}/contacts/${contactUserId}`, {
        method: 'DELETE'
    })
}

// ========== ОТКЛИКИ ==========

/**
 * Получение моих откликов
 * GET /api/interaction/responses/my
 */
export async function getMyResponses() {
    console.log('[API] getMyResponses:', `${API_BASE}/responses/my`)
    return httpJson(`${API_BASE}/responses/my`)
}

/**
 * Получение откликов на вакансию (для работодателя)
 * GET /api/interaction/opportunities/{opportunityId}/responses
 */
export async function getOpportunityResponses(opportunityId) {
    console.log('[API] getOpportunityResponses:', `${API_BASE}/opportunities/${opportunityId}/responses`)
    return httpJson(`${API_BASE}/opportunities/${opportunityId}/responses`)
}

/**
 * Создать отклик на вакансию
 * POST /api/interaction/responses
 * Body: { "opportunityId": id, "applicantComment": "", "coverLetter": "" }
 */
export async function createResponse(opportunityId, applicantComment = '', coverLetter = '') {
    console.log('[API] createResponse:', `${API_BASE}/responses`, { opportunityId, applicantComment, coverLetter })
    return httpJson(`${API_BASE}/responses`, {
        method: 'POST',
        body: JSON.stringify({ opportunityId, applicantComment, coverLetter })
    })
}

/**
 * Обновить статус отклика
 * PATCH /api/interaction/responses/{id}/status
 * Body: { "status": "ACCEPTED|REJECTED|...", "employerComment": "" }
 */
export async function updateResponseStatus(responseId, status, employerComment = '') {
    console.log('[API] updateResponseStatus:', `${API_BASE}/responses/${responseId}/status`, { status, employerComment })
    return httpJson(`${API_BASE}/responses/${responseId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, employerComment })
    })
}

// ========== ИЗБРАННОЕ ==========

/**
 * Получение списка избранного текущего пользователя
 * GET /api/interaction/favorites
 */
export async function getFavorites() {
    console.log('[API] getFavorites:', `${API_BASE}/favorites`)
    return httpJson(`${API_BASE}/favorites`)
}

/**
 * Добавить в избранное
 * POST /api/interaction/favorites/{opportunityId}
 */
export async function addToFavorites(opportunityId) {
    console.log('[API] addToFavorites:', `${API_BASE}/favorites/${opportunityId}`)
    return httpJson(`${API_BASE}/favorites/${opportunityId}`, {
        method: 'POST'
    })
}

/**
 * Удалить из избранного
 * DELETE /api/interaction/favorites/{opportunityId}
 */
export async function removeFromFavorites(opportunityId) {
    console.log('[API] removeFromFavorites:', `${API_BASE}/favorites/${opportunityId}`)
    return httpJson(`${API_BASE}/favorites/${opportunityId}`, {
        method: 'DELETE'
    })
}