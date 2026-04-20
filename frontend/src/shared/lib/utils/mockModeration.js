const CURRENT_USER_KEY = 'tramplin_current_user'
const PROFILES_KEY = 'tramplin_profiles'
const QUEUE_KEY = 'tramplin_verification_queue'

export function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem(CURRENT_USER_KEY) || 'null')
    } catch {
        return null
    }
}

export function setCurrentUser(user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user))
}

export function getProfiles() {
    try {
        return JSON.parse(localStorage.getItem(PROFILES_KEY) || '[]')
    } catch {
        return []
    }
}

export function saveProfile(profile) {
    const all = getProfiles()
    const filtered = all.filter((item) => item.email !== profile.email)
    localStorage.setItem(PROFILES_KEY, JSON.stringify([profile, ...filtered]))
}

export function getVerificationQueue() {
    try {
        return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]')
    } catch {
        return []
    }
}

export function submitVerificationRequest(payload) {
    const queue = getVerificationQueue()
    const item = {
        id: Date.now(),
        status: 'pending', // pending | approved | rejected
        createdAt: new Date().toISOString(),
        ...payload,
    }
    localStorage.setItem(QUEUE_KEY, JSON.stringify([item, ...queue]))
    return item
}

export function setVerificationStatus(id, status, note = '') {
    const queue = getVerificationQueue().map((item) =>
        item.id === id
            ? {
                ...item,
                status,
                note,
                reviewedAt: new Date().toISOString(),
            }
            : item
    )

    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue))
    return queue
}