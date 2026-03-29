/**
 * Получение текущего пользователя из localStorage
 */
export function getCurrentUser() {
    try {
        const stored = localStorage.getItem('tramplin_current_user')
        if (stored) {
            return JSON.parse(stored)
        }
        return null
    } catch (error) {
        console.error('Error getting current user:', error)
        return null
    }
}

/**
 * Сохранение текущего пользователя в localStorage
 */
export function setCurrentUser(user) {
    try {
        localStorage.setItem('tramplin_current_user', JSON.stringify(user))
    } catch (error) {
        console.error('Error saving current user:', error)
    }
}

/**
 * Очистка данных пользователя (при выходе)
 */
export function clearCurrentUser() {
    localStorage.removeItem('tramplin_current_user')
}

/**
 * Получение роли текущего пользователя
 */
export function getUserRole() {
    const user = getCurrentUser()
    return user?.role || null
}

/**
 * Проверка, является ли пользователь работодателем
 */
export function isEmployer() {
    return getUserRole() === 'EMPLOYER'
}

/**
 * Проверка, является ли пользователь соискателем
 */
export function isApplicant() {
    return getUserRole() === 'APPLICANT'
}

/**
 * Проверка, является ли пользователь куратором или администратором
 */
export function isCurator() {
    const role = getUserRole()
    return role === 'CURATOR' || role === 'ADMIN'
}