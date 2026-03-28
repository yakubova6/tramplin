// api/admin.js

import { httpJson } from './http'

const API_BASE = '/api'

/**
 * Получение CSRF токена
 * GET /api/auth/csrf
 */
async function getCsrfToken() {
    try {
        const response = await fetch(`${API_BASE}/auth/csrf`, {
            credentials: 'include',
        })
        const data = await response.json()
        return data
    } catch (error) {
        console.warn('Failed to get CSRF token:', error)
        return null
    }
}

/**
 * Создание куратора (только для ADMIN)
 * POST /api/admin/curators
 */
export async function createCurator(payload) {
    // Получаем CSRF токен
    const csrf = await getCsrfToken()

    const headers = {
        'Content-Type': 'application/json',
    }

    // Добавляем CSRF токен в заголовки, если он есть
    if (csrf?.headerName && csrf?.token) {
        headers[csrf.headerName] = csrf.token
        console.log('[API] Adding CSRF header:', csrf.headerName, csrf.token)
    }

    return httpJson(`${API_BASE}/admin/curators`, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: headers
    })
}