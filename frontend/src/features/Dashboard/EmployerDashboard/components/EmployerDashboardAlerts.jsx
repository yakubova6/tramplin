import { useEffect, useMemo, useState } from 'react'
import Button from '@/shared/ui/Button'

const STORAGE_KEY = 'employer_dashboard_dismissed_alerts'

function normalizeStatus(value, fallback = 'unknown') {
    return String(value || fallback).trim().toLowerCase()
}

function buildDismissKey(profileStatus, verificationStatus) {
    return `public:${profileStatus}|verification:${verificationStatus}`
}

function EmployerDashboardAlerts({
                                     publicProfileStatus,
                                     verificationStatus,
                                     canOpenPublicProfile = false,
                                     publicProfileUrl = '',
                                     onOpenPublicProfile,
                                     onOpenVerification,
                                 }) {
    const normalizedPublicStatus = normalizeStatus(publicProfileStatus, 'draft')
    const normalizedVerificationStatus = normalizeStatus(verificationStatus, 'not_started')

    const [dismissedKeys, setDismissedKeys] = useState(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY)
            return raw ? JSON.parse(raw) : []
        } catch {
            return []
        }
    })

    const dismissKey = useMemo(
        () => buildDismissKey(normalizedPublicStatus, normalizedVerificationStatus),
        [normalizedPublicStatus, normalizedVerificationStatus],
    )

    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(dismissedKeys))
        } catch {
            //
        }
    }, [dismissedKeys])

    const dismissAlert = () => {
        setDismissedKeys((prev) => (prev.includes(dismissKey) ? prev : [...prev, dismissKey]))
    }

    const isDismissed = dismissedKeys.includes(dismissKey)

    const alert = useMemo(() => {
        if (normalizedVerificationStatus === 'pending') {
            return {
                tone: 'pending',
                title: 'Верификация компании на проверке',
                text: 'Пока заявка рассматривается, публикация новых карточек временно ограничена. Дождитесь результата проверки — повторно отправлять данные не нужно.',
            }
        }

        if (normalizedVerificationStatus === 'rejected') {
            return {
                tone: 'revision',
                title: 'Верификация требует доработки',
                text: 'Проверьте замечания модератора и отправьте верификацию повторно удобным способом: через корпоративную почту, ИНН или профессиональные ссылки.',
                actionLabel: 'Пройти верификацию',
                onAction: onOpenVerification,
            }
        }

        if (normalizedVerificationStatus === 'not_started') {
            return {
                tone: 'draft',
                title: 'Подтвердите компанию',
                text: 'После верификации компании вам будет проще публиковать карточки и проходить модерацию. Выберите удобный способ подтверждения.',
                actionLabel: 'Начать верификацию',
                onAction: onOpenVerification,
            }
        }

        if (normalizedPublicStatus === 'approved') {
            return {
                tone: 'approved',
                title: 'Публичный профиль одобрен',
                text: 'Публичная версия профиля доступна пользователям платформы.',
                actionLabel: canOpenPublicProfile ? 'Открыть профиль' : '',
                actionVariant: 'success',
                onAction:
                    onOpenPublicProfile ||
                    (publicProfileUrl
                        ? () => {
                            window.open(publicProfileUrl, '_blank', 'noopener,noreferrer')
                        }
                        : undefined),
                closable: true,
            }
        }

        if (normalizedPublicStatus === 'revision') {
            return {
                tone: 'revision',
                title: 'Публичный профиль требует доработки',
                text: 'Исправьте замечания модератора и отправьте профиль на повторную проверку. После одобрения профиль снова станет доступен пользователям.',
            }
        }

        if (normalizedPublicStatus === 'pending') {
            return {
                tone: 'info',
                title: 'Публичный профиль на модерации',
                text: 'Мы проверяем текущую версию профиля. После завершения модерации статус обновится автоматически.',
            }
        }

        return null
    }, [
        canOpenPublicProfile,
        normalizedPublicStatus,
        normalizedVerificationStatus,
        onOpenPublicProfile,
        onOpenVerification,
        publicProfileUrl,
    ])

    if (!alert) return null
    if (alert.closable && isDismissed) return null

    return (
        <div className="employer-dashboard__alerts">
            <div className={`employer-dashboard__alert employer-dashboard__alert--${alert.tone}`}>
                <div className="employer-dashboard__alert-body">
                    <div className="employer-dashboard__alert-title">{alert.title}</div>
                    <div className="employer-dashboard__alert-text">{alert.text}</div>
                </div>

                <div className="employer-dashboard__alert-actions">
                    {alert.actionLabel && alert.onAction && (
                        <Button
                            className={`employer-dashboard__alert-button${
                                alert.actionVariant === 'success' ? ' employer-dashboard__alert-button--success' : ''
                            }`}
                            onClick={alert.onAction}
                        >
                            {alert.actionLabel}
                        </Button>
                    )}

                    {alert.closable && (
                        <button
                            type="button"
                            className="employer-dashboard__alert-close"
                            onClick={dismissAlert}
                            aria-label="Закрыть подсказку"
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EmployerDashboardAlerts