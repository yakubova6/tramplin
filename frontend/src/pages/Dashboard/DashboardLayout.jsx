import './DashboardLayout.scss'
import Navbar from '../../components/layout/Navbar'

function DashboardLayout({ title, subtitle, children }) {
    return (
        <div className="dashboard-layout">
            <Navbar />
            <main className="dashboard-layout__main container">
                <header className="dashboard-layout__header">
                    <h1 className="dashboard-layout__title">{title}</h1>
                    {subtitle && <p className="dashboard-layout__subtitle">{subtitle}</p>}
                </header>
                {children}
            </main>
        </div>
    )
}

export default DashboardLayout