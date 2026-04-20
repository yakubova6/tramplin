import {
    getFavorites,
    addEmployerToFavorites as addEmployerToFavoritesApi,
    removeEmployerFromFavorites as removeEmployerFromFavoritesApi,
} from './interaction'

let savedFavoritesCache = null
let savedFavoritesCacheAt = 0
let savedFavoritesInFlight = null
const SAVED_FAVORITES_CACHE_TTL_MS = 30_000

function createEmptyFavorites() {
    return {
        opportunities: [],
        employers: [],
    }
}

function setSavedFavoritesCache(nextValue) {
    savedFavoritesCache = nextValue
    savedFavoritesCacheAt = Date.now()
    savedFavoritesInFlight = null
    return savedFavoritesCache
}

export function getCachedSavedFavorites() {
    if (
        savedFavoritesCache &&
        Date.now() - savedFavoritesCacheAt < SAVED_FAVORITES_CACHE_TTL_MS
    ) {
        return savedFavoritesCache
    }

    return createEmptyFavorites()
}

function toNumberOrNull(value) {
    if (value === null || value === undefined || value === '') return null
    const numeric = Number(value)
    return Number.isFinite(numeric) ? numeric : null
}

function mapOpportunityFavorite(item, index) {
    const id = toNumberOrNull(
        item.targetId ??
        item.opportunityId ??
        item.opportunity_id ??
        item.opportunity?.id ??
        item.id ??
        null
    )

    return {
        id,
        title:
            item.title ||
            item.opportunityTitle ||
            item.opportunity?.title ||
            (id ? `Возможность #${id}` : `Возможность ${index + 1}`),
        companyName:
            item.subtitle ||
            item.companyName ||
            item.opportunity?.companyName ||
            'Компания',
        logo: item.logo || null,
        savedAt: item.createdAt || item.savedAt || null,
    }
}

function mapEmployerFavorite(item, index) {
    const id = toNumberOrNull(
        item.targetId ??
        item.employerUserId ??
        item.employer_user_id ??
        item.employer?.userId ??
        item.id ??
        null
    )

    return {
        id,
        title:
            item.title ||
            item.companyName ||
            item.employer?.companyName ||
            (id ? `Работодатель #${id}` : `Работодатель ${index + 1}`),
        subtitle:
            item.subtitle ||
            item.description ||
            item.industry ||
            '',
        logo: item.logo || null,
        savedAt: item.createdAt || item.savedAt || null,
    }
}

export async function getSavedFavorites() {
    if (
        savedFavoritesCache &&
        Date.now() - savedFavoritesCacheAt < SAVED_FAVORITES_CACHE_TTL_MS
    ) {
        return savedFavoritesCache
    }

    if (savedFavoritesInFlight) {
        return savedFavoritesInFlight
    }

    try {
        savedFavoritesInFlight = getFavorites().then((favorites) => {
            if (!Array.isArray(favorites)) {
                return setSavedFavoritesCache(createEmptyFavorites())
            }

            return setSavedFavoritesCache({
                opportunities: favorites
                    .filter((item) => item?.targetType === 'OPPORTUNITY')
                    .map(mapOpportunityFavorite)
                    .filter((item) => item.id !== null),
                employers: favorites
                    .filter((item) => item?.targetType === 'EMPLOYER')
                    .map(mapEmployerFavorite)
                    .filter((item) => item.id !== null),
            })
        }).catch((error) => {
            savedFavoritesInFlight = null
            throw error
        })

        return await savedFavoritesInFlight
    } catch (error) {
        if ([401, 403, 500, 503].includes(error?.status)) {
            return setSavedFavoritesCache(createEmptyFavorites())
        }

        throw error
    }
}

function dispatchFavoritesUpdated(detail) {
    window.dispatchEvent(new CustomEvent('favorites-updated', { detail }))
}

export async function addEmployerToSaved(employerUserId) {
    const result = await addEmployerToFavoritesApi(employerUserId)

    dispatchFavoritesUpdated({
        action: 'added',
        targetType: 'EMPLOYER',
        employerUserId,
    })

    return result
}

export async function removeEmployerFromSaved(employerUserId) {
    const result = await removeEmployerFromFavoritesApi(employerUserId)

    dispatchFavoritesUpdated({
        action: 'removed',
        targetType: 'EMPLOYER',
        employerUserId,
    })

    return result
}
