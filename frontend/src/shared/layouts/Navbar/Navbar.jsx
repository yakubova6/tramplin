import { Link, useLocation } from 'wouter'
import { useState, useEffect } from 'react'
import brandMark from '@/assets/icons/brand-mark.svg'
import { getCurrentUserInfo, logoutUser } from '@/shared/api/auth'
import { getApplicantProfile, getEmployerProfile } from '@/shared/api/profile'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '@/shared/lib/utils/sessionStore'
import './Navbar.scss'

function Navbar() {
    const [location, navigate] = useLocation()
    const [user, setUser] = useState(getSessionUser())
    const [displayName, setDisplayName] = useState('')
    const [isCheckingSession, setIsCheckingSession] = useState(!!getSessionUser())

    const loadUserData = async () => {
        const localUser = getSessionUser()

        if (!localUser) {
            setUser(null)
            setDisplayName('')
            setIsCheckingSession(false)
            return
        }

        setIsCheckingSession(true)

        try {
            const sessionData = await getCurrentUserInfo()
            const userData = sessionData?.user || sessionData || null

            if (!userData) {
                clearSessionUser()
                setUser(null)
                setDisplayName('')
                return
            }

            setUser(userData)
            setSessionUser(userData)

            const fallbackName =
                userData.displayName ||
                userData.email?.split('@')[0] ||
                'Пользователь'

            if (userData.role === 'APPLICANT') {
                try {
                    const profile = await getApplicantProfile()
                    const fullName = `${profile?.firstName || ''} ${profile?.lastName || ''}`.trim()
                    setDisplayName(fullName || fallbackName)
                } catch {
                    setDisplayName(fallbackName)
                }
                return
            }

            if (userData.role === 'EMPLOYER') {
                try {
                    const profile = await getEmployerProfile()
                    setDisplayName(profile?.companyName || fallbackName)
                } catch {
                    setDisplayName(fallbackName)
                }
                return
            }

            setDisplayName(fallbackName)
        } catch (error) {
            console.error('Failed to load user data:', error)
            clearSessionUser()
            setUser(null)
            setDisplayName('')
        } finally {
            setIsCheckingSession(false)
        }
    }

    useEffect(() => {
        loadUserData()

        const handleProfileUpdate = (event) => {
            const { firstName, lastName, companyName, role } = event.detail || {}

            if (role === 'APPLICANT' && (firstName || lastName)) {
                const fullName = `${firstName || ''} ${lastName || ''}`.trim()
                if (fullName) {
                    setDisplayName(fullName)
                    const localUser = getSessionUser()
                    if (localUser) setSessionUser({ ...localUser, displayName: fullName })
                }
                return
            }

            if (role === 'EMPLOYER' && companyName) {
                setDisplayName(companyName)
                const localUser = getSessionUser()
                if (localUser) setSessionUser({ ...localUser, displayName: companyName })
                return
            }

            loadUserData()
        }

        const unsubscribeSession = subscribeSessionChange((nextUser) => {
            setUser(nextUser)

            if (!nextUser) {
                setDisplayName('')
                setIsCheckingSession(false)
            }
        })

        window.addEventListener('profile-updated', handleProfileUpdate)

        return () => {
            window.removeEventListener('profile-updated', handleProfileUpdate)
            unsubscribeSession()
        }
    }, [])

    const handleLogout = async () => {
        setUser(null)
        setDisplayName('')
        clearSessionUser()

        try {
            await logoutUser()
        } catch (error) {
            console.error('Logout error:', error)
        } finally {
            navigate('/login')
        }
    }

    const isActive = (path) => location === path

    const getDashboardLink = () => {
        if (user?.role === 'EMPLOYER') return '/employer'
        if (user?.role === 'CURATOR' || user?.role === 'ADMIN') return '/curator'
        return '/seeker'
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
                                type="button"
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
                            {!isCheckingSession && (
                                <>
                                    <Link href="/login" className={`navbar__link ${isActive('/login') ? 'is-active' : ''}`}>
                                        Войти
                                    </Link>
                                    <Link
                                        href="/register"
                                        className={`navbar__link navbar__link--register ${isActive('/register') ? 'is-active' : ''}`}
                                    >
                                        Регистрация
                                    </Link>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>
        </nav>
    )
}

export default Navbar