export const PROFILE_REVIEW_STORAGE_PREFIX = 'tramplin_profile_review_state'

function buildKey(scope, userId) {
    return `${PROFILE_REVIEW_STORAGE_PREFIX}_${scope}_${userId || 'guest'}`
}

export function readProfileModerationState(scope, userId) {
    try {
        const raw = localStorage.getItem(buildKey(scope, userId))
        return raw
            ? JSON.parse(raw)
            : {
                hasEverBeenSubmitted: false,
                lastSubmittedAt: null,
                status: 'DRAFT',
                lastTaskId: null,
            }
    } catch {
        return {
            hasEverBeenSubmitted: false,
            lastSubmittedAt: null,
            status: 'DRAFT',
            lastTaskId: null,
        }
    }
}

export function writeProfileModerationState(scope, userId, value) {
    localStorage.setItem(buildKey(scope, userId), JSON.stringify(value))
}

export function markProfileSubmittedToModeration(scope, userId, task) {
    const nextValue = {
        hasEverBeenSubmitted: true,
        lastSubmittedAt: new Date().toISOString(),
        status: 'PENDING_REVIEW',
        lastTaskId: task?.id || null,
    }

    writeProfileModerationState(scope, userId, nextValue)
    return nextValue
}

export function markProfileNeedsRevision(scope, userId, task) {
    const current = readProfileModerationState(scope, userId)

    const nextValue = {
        ...current,
        status: 'NEEDS_REVISION',
        lastTaskId: task?.id || current.lastTaskId || null,
    }

    writeProfileModerationState(scope, userId, nextValue)
    return nextValue
}

export function markProfileApproved(scope, userId, task) {
    const current = readProfileModerationState(scope, userId)

    const nextValue = {
        ...current,
        hasEverBeenSubmitted: true,
        status: 'APPROVED',
        lastTaskId: task?.id || current.lastTaskId || null,
    }

    writeProfileModerationState(scope, userId, nextValue)
    return nextValue
}