import { useState } from 'react'
import { cancelOpportunityModerationTask, OPPORTUNITY_LABELS } from '@/shared/api/opportunities'
import { useToast } from '@/shared/hooks/use-toast'

const STATUS_CONFIG = {
    DRAFT: { color: 'gray', actions: ['edit', 'submit'] },
    PENDING_MODERATION: { color: 'yellow', actions: ['cancel_moderation', 'view'] },
    PUBLISHED: { color: 'green', actions: ['edit', 'close', 'archive'] },
    REJECTED: { color: 'red', actions: ['edit', 'return_to_draft'] },
    CLOSED: { color: 'gray', actions: ['archive'] },
    ARCHIVED: { color: 'gray', actions: [] },
    PLANNED: { color: 'blue', actions: ['edit', 'publish'] },
}

function OpportunityStatusManager({ opportunity, onStatusChange, onReturnToDraft }) {
    const { toast } = useToast()
    const [loading, setLoading] = useState(false)

    const handleCancelModeration = async () => {
        setLoading(true)
        try {
            await cancelOpportunityModerationTask(opportunity.id)

            toast({
                title: 'Модерация отменена',
                description: 'Публикация возвращена в черновики.',
            })
            await onStatusChange?.()

        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отменить модерацию',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const handleReturnToDraft = async () => {
        setLoading(true)
        try {
            await onReturnToDraft?.(opportunity.id)

            toast({
                title: 'Возвращено в черновики',
                description: 'Теперь вы можете отредактировать публикацию.',
            })
            await onStatusChange?.()

        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось вернуть в черновики',
                variant: 'destructive',
            })
        } finally {
            setLoading(false)
        }
    }

    const config = STATUS_CONFIG[opportunity.status] || STATUS_CONFIG.DRAFT
    const statusText = OPPORTUNITY_LABELS.status[opportunity.status] || opportunity.status

    const isActionAllowed = (action) => {
        return config.actions.includes(action)
    }

    return (
        <div className="opportunity-status-manager">
            <div className={`opportunity-status-manager__badge opportunity-status-manager__badge--${config.color}`}>
                <span className="opportunity-status-manager__text">{statusText}</span>
            </div>

            {opportunity.status === 'REJECTED' && opportunity.moderationComment && (
                <div className="opportunity-status-manager__feedback">
                    <div className="opportunity-status-manager__feedback-title">Причина отклонения</div>
                    <p className="opportunity-status-manager__feedback-text">{opportunity.moderationComment}</p>
                    {isActionAllowed('return_to_draft') && (
                        <button
                            className="opportunity-status-manager__button opportunity-status-manager__button--warning"
                            onClick={handleReturnToDraft}
                            disabled={loading}
                        >
                            {loading ? 'Загрузка...' : 'Вернуть на доработку'}
                        </button>
                    )}
                </div>
            )}

            {opportunity.status === 'PENDING_MODERATION' && (
                <div className="opportunity-status-manager__task">
                    <div className="opportunity-status-manager__task-info">
                        <span>Публикация на модерации</span>
                        {isActionAllowed('cancel_moderation') && (
                            <button
                                className="opportunity-status-manager__button opportunity-status-manager__button--small"
                                onClick={handleCancelModeration}
                                disabled={loading}
                            >
                                {loading ? 'Отмена...' : 'Отменить модерацию'}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {opportunity.status === 'PLANNED' && (
                <div className="opportunity-status-manager__planned">
                    <span>Мероприятие запланировано на {opportunity.eventDate ? new Date(opportunity.eventDate).toLocaleDateString() : 'не указана'}</span>
                </div>
            )}

            {opportunity.status === 'PUBLISHED' && opportunity.expiresAt && (
                <div className="opportunity-status-manager__expires">
                    <span>Действует до {new Date(opportunity.expiresAt).toLocaleDateString()}</span>
                </div>
            )}
        </div>
    )
}

export default OpportunityStatusManager
