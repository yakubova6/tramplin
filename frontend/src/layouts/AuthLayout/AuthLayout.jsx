import { Link } from 'wouter'
import brandMark from '../../assets/icons/brand-mark.svg'
import './AuthLayout.scss'

function AuthLayout({ children }) {
    return (
        <div className="auth-layout">
            <div className="auth-layout__background" />

            <div className="auth-layout__inner">
                <Link href="/" className="auth-layout__logo-link">
                    <img
                        src={brandMark}
                        alt="Логотип Трамплин"
                        className="auth-layout__logo-image"
                    />
                    <span className="auth-layout__logo-text">Трамплин</span>
                </Link>

                {children}
            </div>
        </div>
    )
}

export default AuthLayout