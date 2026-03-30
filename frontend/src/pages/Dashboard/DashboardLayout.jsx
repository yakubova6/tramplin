import { Link, useLocation } from 'wouter'
import './DashboardLayout.scss'
import Navbar from '../../layouts/Navbar'

function DashboardLayout({ title, subtitle, children }) {
    const [location] = useLocation()
    const isSecurityPage = location.startsWith('/settings/security')

    return (
        <div className="dashboard-layout">
            <Navbar />
            <main className="dashboard-layout__main container">
                <header className="dashboard-layout__header">
                    <div className="dashboard-layout__heading">
                        <h1 className="dashboard-layout__title">{title}</h1>
                        {subtitle && (
                            <p className="dashboard-layout__subtitle">{subtitle}</p>
                        )}
                    </div>

                    {!isSecurityPage && (
                        <Link
                            href="/settings/security"
                            className="dashboard-layout__action"
                        >
                            Настройки безопасности
                        </Link>
                    )}
                </header>
                {children}
            </main>
        </div>
    )
}

export default DashboardLayout