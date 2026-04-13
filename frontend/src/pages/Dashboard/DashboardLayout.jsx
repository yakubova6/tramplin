import { useEffect, useState } from 'react'
import { Link, useLocation } from 'wouter'
import Navbar from '../../layouts/Navbar'
import { getSessionUser, subscribeSessionChange } from '../../utils/sessionStore'
import './DashboardLayout.scss'

function DashboardLayout({
                             title,
                             subtitle,
                             children,
                             hideHeaderActions = false,
                         }) {
    const [location] = useLocation()
    const [currentUser, setCurrentUser] = useState(getSessionUser())

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setCurrentUser(nextUser)
        })

        return unsubscribe
    }, [])

    const isSecurityPage = location.startsWith('/settings/security')
    const isApplicantCatalogPage = location === '/seekers'
    const isAdminCuratorsPage = location.startsWith('/admin/curators')

    const applicantCatalogAction = (() => {
        const role = currentUser?.role || ''

        if (role === 'APPLICANT') {
            return { href: '/seekers', label: 'Сообщество' }
        }

        if (['EMPLOYER', 'CURATOR', 'ADMIN'].includes(role)) {
            return { href: '/seekers', label: 'Каталог соискателей' }
        }

        return null
    })()

    const adminCuratorsAction = currentUser?.role === 'ADMIN'
        ? { href: '/admin/curators', label: 'Управление кураторами' }
        : null

    const actions = hideHeaderActions
        ? []
        : [
            ...(applicantCatalogAction && !isApplicantCatalogPage
                ? [applicantCatalogAction]
                : []),
            ...(adminCuratorsAction && !isAdminCuratorsPage
                ? [adminCuratorsAction]
                : []),
            ...(!isSecurityPage
                ? [{ href: '/settings/security', label: 'Настройки безопасности' }]
                : []),
        ]

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

                    {actions.length > 0 && (
                        <div className="dashboard-layout__actions">
                            {actions.map((action) => (
                                <Link
                                    key={action.href}
                                    href={action.href}
                                    className="dashboard-layout__action"
                                >
                                    {action.label}
                                </Link>
                            ))}
                        </div>
                    )}
                </header>

                {children}
            </main>
        </div>
    )
}

export default DashboardLayout