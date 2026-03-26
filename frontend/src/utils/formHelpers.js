/**
 * Преобразование строки в число (обрезание до целого)
 */
export function toShort(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return null
    return Math.trunc(n)
}

/**
 * Создание новой строки для ссылки
 */
export function createLinkRow() {
    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: '',
        url: ''
    }
}

/**
 * Очистка ссылок — возвращает массив строк (только URL)
 */
export function cleanLinksToArray(rows) {
    const urls = []
    rows.forEach((row) => {
        const title = row.title.trim()
        const url = row.url.trim()
        if (title && url) {
            urls.push(url)
        }
    })
    return urls
}

// Старая функция для обратной совместимости (если нужно)
export function cleanLinks(rows) {
    const map = {}
    rows.forEach((row) => {
        const title = row.title.trim()
        const url = row.url.trim()
        if (title && url) map[title] = url
    })
    return map
}