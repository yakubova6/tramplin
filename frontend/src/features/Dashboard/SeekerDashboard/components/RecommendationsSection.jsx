import { useState } from 'react'
import { useToast } from '@/shared/hooks/use-toast'
import { updateRecommendationStatus } from '@/shared/api/interaction'
import { getStatusLabelRu } from '@/shared/lib/utils/statusLabels'
import './RecommendationsSection.scss'

const STATUS_LABELS = {
    NEW: 'Новая',
    VIEWED: 'Просмотрена',
    INTERESTED: 'Интересно',
    APPLIED: 'Откликнулся',
    DECLINED: 'Не интересно',
}

const STATUS_CLASS_NAMES = {
    NEW: 'is-new',
    VIEWED: 'is-viewed',
    INTERESTED: 'is-interested',
    APPLIED: 'is-applied',
    DECLINED: 'is-declined',
}

const ALLOWED_TRANSITIONS = {
    NEW: ['VIEWED', 'INTERESTED', 'APPLIED', 'DECLINED'],
    VIEWED: ['INTERESTED', 'APPLIED', 'DECLINED'],
    INTERESTED: ['APPLIED', 'DECLINED'],
    APPLIED: [],
    DECLINED: [],
}

function formatDate(dateString) {
    if (!dateString) return 'Дата не указана'

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return 'Дата не указана'

    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function formatDateTime(dateString) {
    if (!dateString) return null

    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return null

    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function canMoveToStatus(currentStatus, nextStatus) {
    return ALLOWED_TRANSITIONS[currentStatus]?.includes(nextStatus) || false
}

function RecommendationStatusBadge({ status }) {
    return (
        <span className={`recommendation-status ${STATUS_CLASS_NAMES[status] || ''}`}>
            {STATUS_LABELS[status] || getStatusLabelRu(status)}
        </span>
    )
}

export default function RecommendationsSection({
                                                   recommendations,
                                                   recommendationsTab,
                                                   setRecommendationsTab,
                                                   currentRecommendations,
                                                   networkingBlockedMessage,
                                                   isRecommendationsLoading,
                                                   onOpenCreateModal,
                                                   onOpenOpportunity,
                                                   onDeleteRecommendation,
                                                   onRefreshRecommendations,
                                               }) {
    const { toast } = useToast()
    const [updatingRecommendationId, setUpdatingRecommendationId] = useState(null)
    const isIncomingTab = recommendationsTab === 'incoming'

    const handleStatusUpdate = async (event, recommendation, nextStatus) => {
        event.stopPropagation()

        if (!canMoveToStatus(recommendation.status, nextStatus)) {
            return
        }

        try {
            setUpdatingRecommendationId(recommendation.id)
            await updateRecommendationStatus(recommendation.id, nextStatus)
            await onRefreshRecommendations()

            toast({
                title: 'Статус обновлён',
                description: 'Состояние рекомендации успешно изменено',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось изменить статус рекомендации',
                variant: 'destructive',
            })
        } finally {
            setUpdatingRecommendationId(null)
        }
    }

    const handleOpenRecommendation = async (recommendation) => {
        if (!recommendation?.opportunityId) {
            return
        }

        if (isIncomingTab && recommendation.status === 'NEW') {
            try {
                setUpdatingRecommendationId(recommendation.id)
                await updateRecommendationStatus(recommendation.id, 'VIEWED')
                await onRefreshRecommendations()
            } catch (error) {
                toast({
                    title: 'Ошибка',
                    description: error?.message || 'Не удалось отметить рекомендацию как просмотренную',
                    variant: 'destructive',
                })
            } finally {
                setUpdatingRecommendationId(null)
            }
        }

        onOpenOpportunity(recommendation.opportunityId)
    }

    return (
        <div className="seeker-recommendations">
            <div className="section-header section-header--space-between">
                <div className="section-header__title-wrap">
                    <h2>Рекомендации</h2>
                    <span className="section-count">
                        {(recommendations?.incoming?.length || 0) + (recommendations?.outgoing?.length || 0)}
                    </span>
                </div>

                <button
                    className="btn-primary-small"
                    onClick={onOpenCreateModal}
                    disabled={Boolean(networkingBlockedMessage)}
                >
                    Новая рекомендация
                </button>
            </div>

            <div className="dashboard-tabs dashboard-tabs--inner dashboard-tabs--stats">
                <button
                    type="button"
                    className={`dashboard-tabs__btn ${recommendationsTab === 'incoming' ? 'is-active' : ''}`}
                    onClick={() => setRecommendationsTab('incoming')}
                >
                    <span className="dashboard-tabs__label">Входящие</span>
                    <span className="dashboard-tabs__badge">{recommendations?.incoming?.length || 0}</span>
                </button>

                <button
                    type="button"
                    className={`dashboard-tabs__btn ${recommendationsTab === 'outgoing' ? 'is-active' : ''}`}
                    onClick={() => setRecommendationsTab('outgoing')}
                >
                    <span className="dashboard-tabs__label">Исходящие</span>
                    <span className="dashboard-tabs__badge">{recommendations?.outgoing?.length || 0}</span>
                </button>
            </div>

            {networkingBlockedMessage ? (
                <div className="empty-state">
                    <p>Рекомендации пока недоступны</p>
                    <span>{networkingBlockedMessage}</span>
                </div>
            ) : isRecommendationsLoading ? (
                <div className="dashboard-loading dashboard-loading--inner">
                    <div className="loading-spinner"></div>
                    <p>Загрузка рекомендаций...</p>
                </div>
            ) : currentRecommendations.length === 0 ? (
                <div className="empty-state">
                    <p>Пока нет рекомендаций</p>
                    <span>
                        {isIncomingTab
                            ? 'Входящие рекомендации появятся здесь'
                            : 'Отправленные рекомендации появятся здесь'}
                    </span>
                </div>
            ) : (
                <div className="recommendations-list">
                    {currentRecommendations.map((item) => {
                        const isUpdating = updatingRecommendationId === item.id
                        const viewedAt = formatDateTime(item.viewedAt)
                        const respondedAt = formatDateTime(item.respondedAt)

                        return (
                            <article
                                key={item.id}
                                className="recommendation-card"
                                onClick={() => handleOpenRecommendation(item)}
                            >
                                <div className="recommendation-card__header">
                                    <div className="recommendation-card__title-block">
                                        <h3>{item.opportunityTitle}</h3>
                                        <p className="recommendation-card__company">
                                            {item.companyName}
                                            {item.opportunityType ? ` · ${item.opportunityType}` : ''}
                                        </p>
                                    </div>

                                    <RecommendationStatusBadge status={item.status} />
                                </div>

                                <div className="recommendation-card__meta">
                                    <span>
                                        {isIncomingTab
                                            ? `От: ${item.fromApplicantName}`
                                            : `Кому: ${item.toApplicantName}`}
                                    </span>
                                    <span>Создана: {formatDate(item.createdAt)}</span>
                                </div>

                                {item.message && (
                                    <p className="recommendation-card__message">{item.message}</p>
                                )}

                                <div className="recommendation-card__timeline">
                                    <span className="recommendation-card__timeline-item">
                                        Просмотрена: {viewedAt || 'ещё нет'}
                                    </span>
                                    <span className="recommendation-card__timeline-item">
                                        Ответ: {respondedAt || 'ещё нет'}
                                    </span>
                                </div>

                                <div className="recommendation-card__actions">
                                    <button
                                        type="button"
                                        className="recommendation-btn recommendation-btn--primary"
                                        onClick={(event) => {
                                            event.stopPropagation()
                                            handleOpenRecommendation(item)
                                        }}
                                        disabled={isUpdating}
                                    >
                                        Перейти к вакансии
                                    </button>

                                    {isIncomingTab ? (
                                        <div className="recommendation-card__secondary-actions">
                                            {canMoveToStatus(item.status, 'VIEWED') && (
                                                <button
                                                    type="button"
                                                    className="recommendation-btn"
                                                    onClick={(event) => handleStatusUpdate(event, item, 'VIEWED')}
                                                    disabled={isUpdating}
                                                >
                                                    Отметить просмотренной
                                                </button>
                                            )}

                                            {canMoveToStatus(item.status, 'INTERESTED') && (
                                                <button
                                                    type="button"
                                                    className="recommendation-btn"
                                                    onClick={(event) => handleStatusUpdate(event, item, 'INTERESTED')}
                                                    disabled={isUpdating}
                                                >
                                                    Интересно
                                                </button>
                                            )}

                                            {canMoveToStatus(item.status, 'APPLIED') && (
                                                <button
                                                    type="button"
                                                    className="recommendation-btn"
                                                    onClick={(event) => handleStatusUpdate(event, item, 'APPLIED')}
                                                    disabled={isUpdating}
                                                >
                                                    Отметить как откликнулся
                                                </button>
                                            )}

                                            {canMoveToStatus(item.status, 'DECLINED') && (
                                                <button
                                                    type="button"
                                                    className="recommendation-btn recommendation-btn--danger"
                                                    onClick={(event) => handleStatusUpdate(event, item, 'DECLINED')}
                                                    disabled={isUpdating}
                                                >
                                                    Не интересно
                                                </button>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="recommendation-card__secondary-actions">
                                            <button
                                                type="button"
                                                className="recommendation-btn recommendation-btn--danger"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    onDeleteRecommendation(item.id)
                                                }}
                                                disabled={isUpdating}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </article>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
