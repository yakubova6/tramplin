import { httpJson, toQuery } from './http'

const API_BASE = '/api'

export async function searchGeoCities(search, limit = 10) {
    const normalizedSearch = String(search || '').trim()

    if (normalizedSearch.length < 2) {
        return []
    }

    const query = toQuery({
        search: normalizedSearch,
        limit: Math.min(Math.max(Number(limit) || 10, 1), 20),
    })

    return httpJson(`${API_BASE}/geo/cities?${query}`, {
        dedupe: true,
        cacheTtlMs: 60_000,
    })
}

export async function getGeoCity(id) {
    if (!id) {
        throw new Error('Не указан id города')
    }

    return httpJson(`${API_BASE}/geo/cities/${id}`, {
        dedupe: true,
        cacheTtlMs: 5 * 60_000,
    })
}

export async function getGeoLocation(id) {
    if (!id) {
        throw new Error('Не указан id локации')
    }

    return httpJson(`${API_BASE}/geo/locations/${id}`, {
        dedupe: true,
        cacheTtlMs: 5 * 60_000,
    })
}

export async function suggestGeoAddress({ query, cityId = null }) {
    const normalizedQuery = String(query || '').trim()

    if (normalizedQuery.length < 3) {
        return []
    }

    const payload = {
        query: normalizedQuery,
    }

    if (cityId) {
        payload.cityId = Number(cityId)
    }

    return httpJson(`${API_BASE}/geo/address/suggest`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function resolveGeoAddress(unrestrictedValue) {
    const normalizedValue = String(unrestrictedValue || '').trim()

    if (!normalizedValue) {
        throw new Error('Не указан полный адрес для resolve')
    }

    return httpJson(`${API_BASE}/geo/address/resolve`, {
        method: 'POST',
        body: JSON.stringify({
            unrestrictedValue: normalizedValue,
        }),
    })
}

export async function getEmployerLocations() {
    return httpJson(`${API_BASE}/profile/employer/locations`)
}

export async function createEmployerLocation(payload) {
    return httpJson(`${API_BASE}/profile/employer/locations`, {
        method: 'POST',
        body: JSON.stringify(payload),
    })
}

export async function updateEmployerLocation(locationId, payload) {
    if (!locationId) {
        throw new Error('Не указан id локации')
    }

    return httpJson(`${API_BASE}/profile/employer/locations/${locationId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
    })
}

export async function deleteEmployerLocation(locationId) {
    if (!locationId) {
        throw new Error('Не указан id локации')
    }

    return httpJson(`${API_BASE}/profile/employer/locations/${locationId}`, {
        method: 'DELETE',
    })
}