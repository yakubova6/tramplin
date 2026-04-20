import { useMemo, useState } from 'react'

export default function SavedFavoritesSection({
                                                  favorites,
                                                  onOpenOpportunity,
                                                  onRemoveOpportunity,
                                                  onRemoveEmployer,
                                              }) {
    const [savedTab, setSavedTab] = useState('opportunities')

    const opportunityItems = favorites?.opportunities || []
    const employerItems = favorites?.employers || []

    const currentItems = useMemo(() => {
        return savedTab === 'opportunities' ? opportunityItems : employerItems
    }, [savedTab, opportunityItems, employerItems])

    const isOpportunityTab = savedTab === 'opportunities'
    const emptyTitle = isOpportunityTab
        ? 'У вас пока нет избранных вакансий'
        : 'У вас пока нет избранных работодателей'
    const emptyDescription = isOpportunityTab
        ? 'Добавляйте вакансии в избранное на главной странице'
        : 'Добавляйте работодателей в избранное из карточки возможности'

    return (
        <div className="seeker-saved">
            <div className="section-header">
                <h2>Избранное</h2>
                <span className="section-count">{opportunityItems.length + employerItems.length}</span>
            </div>

            <div className="dashboard-tabs dashboard-tabs--inner dashboard-tabs--stats">
                <button
                    type="button"
                    className={`dashboard-tabs__btn ${isOpportunityTab ? 'is-active' : ''}`}
                    onClick={() => setSavedTab('opportunities')}
                >
                    <span className="dashboard-tabs__label">Избранные вакансии</span>
                    <span className="dashboard-tabs__badge">{opportunityItems.length}</span>
                </button>

                <button
                    type="button"
                    className={`dashboard-tabs__btn ${!isOpportunityTab ? 'is-active' : ''}`}
                    onClick={() => setSavedTab('employers')}
                >
                    <span className="dashboard-tabs__label">Избранные работодатели</span>
                    <span className="dashboard-tabs__badge">{employerItems.length}</span>
                </button>
            </div>

            {currentItems.length === 0 ? (
                <div className="empty-state">
                    <p>{emptyTitle}</p>
                    <span>{emptyDescription}</span>
                </div>
            ) : (
                <div className="saved-list">
                    {isOpportunityTab
                        ? opportunityItems.map((item, index) => {
                            const itemKey = item.id ?? `${item.title ?? 'saved-opportunity'}-${item.savedAt ?? index}`
                            const canOpenOpportunity = item.id !== null && item.id !== undefined

                            return (
                                <div
                                    key={itemKey}
                                    className="saved-card"
                                    onClick={() => canOpenOpportunity && onOpenOpportunity(item.id)}
                                >
                                    <div className="saved-card__content">
                                        <h3>{item.title || 'Вакансия'}</h3>
                                        <p className="saved-card__company">{item.companyName || 'Компания'}</p>
                                    </div>

                                    <button
                                        className="saved-card__remove"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            onRemoveOpportunity(item.id, item.title)
                                        }}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            )
                        })
                        : employerItems.map((item, index) => {
                            const itemKey = item.id ?? `${item.title ?? 'saved-employer'}-${item.savedAt ?? index}`

                            return (
                                <div key={itemKey} className="saved-card">
                                    <div className="saved-card__content">
                                        <h3>{item.title || 'Работодатель'}</h3>
                                        <p className="saved-card__company">{item.subtitle || 'Работодатель'}</p>
                                    </div>

                                    <button
                                        className="saved-card__remove"
                                        onClick={() => onRemoveEmployer(item.id, item.title)}
                                    >
                                        Удалить
                                    </button>
                                </div>
                            )
                        })}
                </div>
            )}
        </div>
    )
}