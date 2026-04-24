/**
 * Получение строки из элемента (строки или объекта с name)
 */
export function getStringValue(item) {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && item.name) return item.name
    return String(item)
}

function normalizeSearchText(value) {
    return String(value || '')
        .toLowerCase()
        .replace(/ё/g, 'е')
        .replace(/[^a-zа-я0-9\s-]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

function calculateSearchScore(candidate, query, queryTokens) {
    if (!candidate) return -1

    let score = 0
    const candidateTokens = candidate.split(' ').filter(Boolean)

    if (candidate === query) score += 100
    if (candidate.startsWith(query)) score += 60
    if (candidate.includes(query)) score += 35

    queryTokens.forEach((token) => {
        if (!token) return

        if (candidateTokens.some((candidateToken) => candidateToken.startsWith(token))) {
            score += 18
            return
        }

        if (candidate.includes(token)) {
            score += 8
        }
    })

    return score
}

/**
 * Улучшенный фильтр: сначала по началу строки, потом по вхождению подстроки
 * @param {Array} list - массив строк или объектов с полем name
 * @param {string} query - поисковый запрос
 * @param {number} limit - максимальное количество результатов
 * @returns {Array} отфильтрованный массив
 */
export function smartFilter(list, query, limit = 8) {
    const q = normalizeSearchText(query)
    if (!q) return list.slice(0, limit)

    const queryTokens = q.split(' ').filter(Boolean)
    const ranked = []
    const seen = new Set()

    list.forEach((item, index) => {
        const rawValue = getStringValue(item)
        const normalizedValue = normalizeSearchText(rawValue)
        if (!normalizedValue) return

        const uniqueKey = normalizedValue
        if (seen.has(uniqueKey)) return
        seen.add(uniqueKey)

        const score = calculateSearchScore(normalizedValue, q, queryTokens)
        if (score > 0) {
            ranked.push({
                item,
                score,
                len: normalizedValue.length,
                index,
            })
        }
    })

    ranked.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score
        if (a.len !== b.len) return a.len - b.len
        return a.index - b.index
    })

    return ranked.slice(0, limit).map((entry) => entry.item)
}
