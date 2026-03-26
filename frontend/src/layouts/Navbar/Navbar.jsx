import { Link, useLocation } from 'wouter'
import brandMark from '../../assets/icons/brand-mark.svg'
import './Navbar.scss'

function Navbar() {
    const [location] = useLocation()
    const user = JSON.parse(localStorage.getItem('tramplin_current_user') || 'null')

    const handleLogout = () => {
        localStorage.removeItem('tramplin_current_user')
        window.location.href = '/login'
    }

    const isActive = (path) => location === path

    const role = user?.role

    const getDashboardLink = () => {
        if (role === 'EMPLOYER') return '/employer'
        if (role === 'CURATOR' || role === 'ADMIN') return '/curator'
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
                                onClick={handleLogout}
                                className="navbar__link navbar__link--logout"
                            >
                                Выйти
                            </button>
                            <span className="navbar__user">
                                {user.displayName || user.email}
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