import { Link, useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import brandMark from '../../assets/icons/brand-mark.svg'
import { getCurrentUserInfo, logoutUser } from '../../api/authApi'
import { getApplicantProfile, getEmployerProfile } from '../../utils/profileApi'
import { getCurrentUser, setCurrentUser, clearCurrentUser } from '../../utils/userHelpers'
import './Navbar.scss'

function Navbar() {
    const [location] = useLocation()
    const [user, setUser] = useState(null)
    const [displayName, setDisplayName] = useState('')
    const [isLoading, setIsLoading] = useState(true)

    const loadUserData = async () => {
        setIsLoading(true)
        try {
            // Получаем данные о сессии
            const sessionData = await getCurrentUserInfo()
            console.log('[Navbar] Session data:', sessionData)

            // Сохраняем пользователя в state
            let userData
            if (sessionData && sessionData.user) {
                userData = sessionData.user
            } else {
                userData = sessionData
            }

            setUser(userData)

            if (!userData) {
                // Если нет пользователя, чистим localStorage
                clearCurrentUser()
                setIsLoading(false)
                return
            }

            // Сохраняем в localStorage как кэш
            setCurrentUser(userData)

            // В зависимости от роли, получаем профиль для отображения имени
            if (userData.role === 'APPLICANT') {
                try {
                    const profile = await getApplicantProfile()
                    if (profile && (profile.firstName || profile.lastName)) {
                        const fullName = `${profile.firstName || ''} ${profile.lastName || ''}`.trim()
                        if (fullName) {
                            setDisplayName(fullName)
                        } else {
                            setDisplayName(userData.displayName || userData.email?.split('@')[0])
                        }
                    } else {
                        setDisplayName(userData.displayName || userData.email?.split('@')[0])
                    }
                } catch (error) {
                    console.warn('Failed to load applicant profile:', error)
                    setDisplayName(userData.displayName || userData.email?.split('@')[0])
                }
            } else if (userData.role === 'EMPLOYER') {
                try {
                    const profile = await getEmployerProfile()
                    if (profile && profile.companyName) {
                        setDisplayName(profile.companyName)
                    } else {
                        setDisplayName(userData.displayName)
                    }
                } catch (error) {
                    console.warn('Failed to load employer profile:', error)
                    setDisplayName(userData.displayName)
                }
            } else {
                setDisplayName(userData.displayName || userData.email?.split('@')[0])
            }
        } catch (error) {
            console.error('[Navbar] Failed to load user data:', error)

            // При 401 или любой ошибке авторизации — чистим localStorage
            if (error.message?.includes('401') || error.message?.includes('истекла') || error.message?.includes('Unauthorized')) {
                clearCurrentUser()
                setUser(null)
                setDisplayName('')
            } else {
                // Fallback на localStorage только при ошибках сети
                const cachedUser = getCurrentUser()
                if (cachedUser) {
                    console.log('[Navbar] Using cached user from localStorage')
                    setUser(cachedUser)
                    setDisplayName(cachedUser.displayName || cachedUser.email?.split('@')[0])
                }
            }
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        try {
            // Вызываем backend logout
            await logoutUser()
            console.log('[Navbar] Logout successful')
        } catch (error) {
            console.error('[Navbar] Logout error:', error)
        } finally {
            // В любом случае чистим локальные данные
            clearCurrentUser()
            setUser(null)
            setDisplayName('')
            // Редирект на главную
            window.location.href = '/'
        }
    }

    useEffect(() => {
        loadUserData()

        // Слушаем событие обновления профиля
        const handleProfileUpdate = (event) => {
            const { firstName, lastName, companyName, role } = event.detail || {}

            if (role === 'APPLICANT' && (firstName || lastName)) {
                const fullName = `${firstName || ''} ${lastName || ''}`.trim()
                if (fullName) {
                    setDisplayName(fullName)
                    // Обновляем также в localStorage
                    const stored = getCurrentUser()
                    if (stored) {
                        stored.displayName = fullName
                        setCurrentUser(stored)
                    }
                }
            } else if (role === 'EMPLOYER' && companyName) {
                setDisplayName(companyName)
                const stored = getCurrentUser()
                if (stored) {
                    stored.displayName = companyName
                    setCurrentUser(stored)
                }
            } else {
                // Если нет данных, перезагружаем полностью
                loadUserData()
            }
        }

        window.addEventListener('profile-updated', handleProfileUpdate)

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
        }
    }, [])

    const isActive = (path) => location === path

    const getDashboardLink = () => {
        if (user?.role === 'EMPLOYER') return '/employer'
        if (user?.role === 'CURATOR' || user?.role === 'ADMIN') return '/curator'
        return '/seeker'
    }

    if (isLoading) {
        return (
            <nav className="navbar">
                <div className="navbar__container container">
                    <Link href="/" className="navbar__logo">
                        <img src={brandMark} alt="Трамплин" className="navbar__logo-icon" />
                        <span className="navbar__logo-text">Трамплин</span>
                    </Link>
                    <div className="navbar__links">
                        <Link href="/" className="navbar__link">Главная</Link>
                    </div>
                </div>
            </nav>
        )
    }

    return (
        <nav className="navbar">
            <div className="navbar__container container">
                <Link href="/" className="navbar__logo">
                    <img src={brandMark} alt="Трамплин" className="navbar__logo-icon" />
                    <span className="navbar__logo-text">Трамплин</span>
                </Link>

                <div className="navbar__links">
                    <Link href="/" className={`navbar__link ${isActive('/') ? 'is-active' : ''}`}>
                        Главная
                    </Link>

                    {user ? (
                        <>
                            <Link
                                href={getDashboardLink()}
                                className={`navbar__link ${isActive(getDashboardLink()) ? 'is-active' : ''}`}
                            >
                                Личный кабинет
                            </Link>
                            <button
                                onClick={handleLogout}
                                className="navbar__link navbar__link--logout"
                            >
                                Выйти
                            </button>
                            <span className="navbar__user">
                                {displayName || user.displayName || user.email?.split('@')[0]}
                            </span>
                        </>
                    ) : (
                        <>
                            <Link href="/login" className={`navbar__link ${isActive('/login') ? 'is-active' : ''}`}>
                                Войти
                            </Link>
                            <Link href="/register" className={`navbar__link navbar__link--register ${isActive('/register') ? 'is-active' : ''}`}>
                                Регистрация
                            </Link>
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar