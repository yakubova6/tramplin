/**
 * Получение строки из элемента (строки или объекта с name)
 */
export function getStringValue(item) {
    if (typeof item === 'string') return item
    if (item && typeof item === 'object' && item.name) return item.name
    return String(item)
}

/**
 * Улучшенный фильтр: сначала по началу строки, потом по вхождению подстроки
 * @param {Array} list - массив строк или объектов с полем name
 * @param {string} query - поисковый запрос
 * @param {number} limit - максимальное количество результатов
 * @returns {Array} отфильтрованный массив
 */
export function smartFilter(list, query, limit = 8) {
    const q = String(query || '').toLowerCase().trim()
    if (!q) return list.slice(0, limit)

    const startsWith = []
    const contains = []
    const seen = new Set()

    list.forEach(item => {
        const str = getStringValue(item).toLowerCase()

        if (str.includes(q)) {
            const key = str
            if (!seen.has(key)) {
                seen.add(key)
                if (str.startsWith(q)) {
                    startsWith.push(item)
                } else {
                    contains.push(item)
                }
            }
        }
    })

    return [...startsWith, ...contains].slice(0, limit)
}