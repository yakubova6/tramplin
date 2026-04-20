const STORAGE_KEY = 'tramplin_current_user'
const SESSION_EVENT = 'session-changed'

function normalizeUser(user) {
    if (!user || typeof user !== 'object') return null

    const normalizedId = user.id ?? user.userId ?? null

    return {
        ...user,
        id: normalizedId,
        userId: normalizedId,
    }
}

export function getSessionUser() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return null
        return normalizeUser(JSON.parse(raw))
    } catch {
        return null
    }
}

export function getSessionUserId() {
    return getSessionUser()?.id ?? null
}

export function setSessionUser(user) {
    const normalized = normalizeUser(user)
    if (!normalized) {
        clearSessionUser()
        return null
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { user: normalized } }))
    return normalized
}

export function clearSessionUser() {
    localStorage.removeItem(STORAGE_KEY)
    window.dispatchEvent(new CustomEvent(SESSION_EVENT, { detail: { user: null } }))
}

export function subscribeSessionChange(listener) {
    const handler = (event) => {
        listener(event.detail?.user ?? null)
    }

    window.addEventListener(SESSION_EVENT, handler)
    return () => window.removeEventListener(SESSION_EVENT, handler)
}

export function isAuthenticated() {
    return getSessionUser() !== null
}

export { STORAGE_KEY, SESSION_EVENT }