import { useState } from 'react'
import '../DashboardBase.scss'

function SeekerDashboard() {
    const [tab, setTab] = useState('profile')

    return (
        <div className="dashboard-page">
            <div className="dashboard-page__container">
                <header className="dashboard-page__header">
                    <h1 className="dashboard-page__title">Кабинет соискателя</h1>
                </header>

                <div className="dashboard-tabs">
                    <button className={`dashboard-tabs__btn ${tab === 'profile' ? 'is-active' : ''}`} onClick={() => setTab('profile')}>
                        Профиль
                    </button>
                    <button className={`dashboard-tabs__btn ${tab === 'applications' ? 'is-active' : ''}`} onClick={() => setTab('applications')}>
                        Мои отклики
                    </button>
                    <button className={`dashboard-tabs__btn ${tab === 'saved' ? 'is-active' : ''}`} onClick={() => setTab('saved')}>
                        Избранное
                    </button>
                </div>

                <section className="dashboard-panel">
                    {tab === 'profile' && <p>Форма профиля соискателя (следующий шаг — подключим API).</p>}
                    {tab === 'applications' && <p>История откликов.</p>}
                    {tab === 'saved' && <p>Избранные вакансии.</p>}
                </section>
            </div>
        </div>
    )
}

export default SeekerDashboard