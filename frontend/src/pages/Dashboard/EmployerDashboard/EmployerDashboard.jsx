import { useState } from 'react'
import '../DashboardBase.scss'

function EmployerDashboard() {
    const [tab, setTab] = useState('opportunities')

    return (
        <div className="dashboard-page">
            <div className="dashboard-page__container">
                <header className="dashboard-page__header">
                    <h1 className="dashboard-page__title">Кабинет работодателя</h1>
                </header>

                <div className="dashboard-tabs">
                    <button className={`dashboard-tabs__btn ${tab === 'opportunities' ? 'is-active' : ''}`} onClick={() => setTab('opportunities')}>
                        Мои публикации
                    </button>
                    <button className={`dashboard-tabs__btn ${tab === 'create' ? 'is-active' : ''}`} onClick={() => setTab('create')}>
                        Новая вакансия
                    </button>
                    <button className={`dashboard-tabs__btn ${tab === 'applicants' ? 'is-active' : ''}`} onClick={() => setTab('applicants')}>
                        Отклики
                    </button>
                    <button className={`dashboard-tabs__btn ${tab === 'profile' ? 'is-active' : ''}`} onClick={() => setTab('profile')}>
                        О компании
                    </button>
                </div>

                <section className="dashboard-panel">
                    {tab === 'opportunities' && <p>Список публикаций работодателя.</p>}
                    {tab === 'create' && <p>Форма создания вакансии/стажировки.</p>}
                    {tab === 'applicants' && <p>Список откликнувшихся.</p>}
                    {tab === 'profile' && <p>Профиль компании.</p>}
                </section>
            </div>
        </div>
    )
}

export default EmployerDashboard