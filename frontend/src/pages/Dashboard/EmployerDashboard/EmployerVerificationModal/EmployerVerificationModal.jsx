import { useEffect, useMemo, useRef } from 'react'
import TrashIcon from '@/assets/icons/trash.svg'
import { createLinkRow } from '../employerDashboard.helpers'
import Textarea from '@/components/Textarea'
import './EmployerVerificationModal.scss'

const METHOD_META = {
    CORPORATE_EMAIL: {
        title: 'Корпоративная почта',
        badge: 'Быстро',
        description:
            'Подойдет, если у вас есть корпоративная почта на домене компании. Это самый простой способ для большинства работодателей.',
    },
    TIN: {
        title: 'ИНН',
        badge: 'Надежно',
        description:
            'Используется ИНН из реквизитов компании. Удобно, если реквизиты уже заполнены и не требуется вручную добавлять данные.',
    },
    PROFESSIONAL_LINKS: {
        title: 'Профессиональные ссылки',
        badge: 'Альтернатива',
        description:
            'Добавьте ссылки на официальный сайт, страницу компании, соцсети или карьерные площадки, где можно подтвердить принадлежность к организации.',
    },
}

const VERIFICATION_STATUS_META = {
    NOT_STARTED: {
        title: 'Верификация не начата',
        description: 'Заполните данные и отправьте заявку на верификацию компании.',
        toneClassName: 'is-not-started',
        shortLabel: 'Не начата',
    },
    PENDING: {
        title: 'Заявка отправлена',
        description:
            'Заявка создана и ожидает проверки. После создания заявки можно прикрепить подтверждающие файлы.',
        toneClassName: 'is-pending',
        shortLabel: 'Отправлена',
    },
    IN_PROGRESS: {
        title: 'Заявка в обработке',
        description:
            'Модератор уже работает с заявкой. Если идентификатор заявки доступен, можно добавить подтверждающие файлы.',
        toneClassName: 'is-pending',
        shortLabel: 'В обработке',
    },
    UNDER_REVIEW: {
        title: 'Заявка на проверке',
        description:
            'Заявка находится на рассмотрении. Если идентификатор заявки доступен, можно прикрепить дополнительные материалы.',
        toneClassName: 'is-pending',
        shortLabel: 'На проверке',
    },
    APPROVED: {
        title: 'Верификация одобрена',
        description: 'Компания успешно прошла верификацию.',
        toneClassName: 'is-approved',
        shortLabel: 'Одобрена',
    },
    REJECTED: {
        title: 'Нужна доработка',
        description: 'Заявка была отклонена. Исправьте данные и отправьте её повторно.',
        toneClassName: 'is-rejected',
        shortLabel: 'Нужна доработка',
    },
    REVOKED: {
        title: 'Верификация отозвана',
        description: 'Необходимо повторно пройти верификацию компании.',
        toneClassName: 'is-rejected',
        shortLabel: 'Отозвана',
    },
}

function EmployerVerificationModal({
                                       isOpen,
                                       verificationData,
                                       setVerificationData,
                                       verificationLinkRows,
                                       setVerificationLinkRows,
                                       onSubmit,
                                       onClose,
                                       userEmail = '',
                                       companyInn = '',
                                       currentVerification = null,
                                       verificationModerationTask = null,
                                       verificationAttachments = [],
                                       isVerificationAttachmentUploading = false,
                                       onUploadVerificationAttachment,
                                       onCancelVerificationModerationTask,
                                       profileVerificationStatus = 'NOT_STARTED',
                                   }) {
    const overlayMouseDownStartedOutsideRef = useRef(false)
    const attachmentInputRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return

        const handleKeyDown = (event) => {
            if (event.key === 'Escape') {
                onClose()
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        document.body.style.overflow = 'hidden'

        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [isOpen, onClose])

    const currentMethod = String(verificationData?.verificationMethod || 'TIN').toUpperCase()
    const currentMeta = METHOD_META[currentMethod] || METHOD_META.TIN

    const normalizedLinkRows = useMemo(() => {
        return Array.isArray(verificationLinkRows) && verificationLinkRows.length > 0
            ? verificationLinkRows
            : [createLinkRow()]
    }, [verificationLinkRows])

    const verificationStatus = String(
        currentVerification?.status ||
        currentVerification?.verificationStatus ||
        profileVerificationStatus ||
        'NOT_STARTED'
    ).toUpperCase()

    const verificationStatusMeta =
        VERIFICATION_STATUS_META[verificationStatus] || VERIFICATION_STATUS_META.NOT_STARTED

    const verificationId = currentVerification?.id ?? null
    const hasVerificationId = Boolean(verificationId)

    const canUploadAttachments =
        hasVerificationId &&
        ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(verificationStatus)

    const canResubmitVerification = ['REJECTED', 'REVOKED'].includes(verificationStatus)

    const isReadonlyVerificationState =
        hasVerificationId &&
        ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW', 'APPROVED'].includes(verificationStatus)

    const shouldShowSubmitButton = !isReadonlyVerificationState || canResubmitVerification

    const hasModerationTask = Boolean(
        verificationModerationTask?.exists || verificationModerationTask?.taskId
    )

    const moderationTaskLabel = hasModerationTask ? 'Создана' : 'Не создана'

    const showCancelModerationButton =
        hasVerificationId &&
        hasModerationTask &&
        ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(verificationStatus) &&
        typeof onCancelVerificationModerationTask === 'function'

    const shouldShowPendingWithoutIdHint =
        !hasVerificationId &&
        ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(verificationStatus)

    if (!isOpen) return null

    const updateMethod = (method) => {
        setVerificationData((prev) => ({
            ...prev,
            verificationMethod: method,
        }))
    }

    const updateField = (field, value) => {
        setVerificationData((prev) => ({
            ...prev,
            [field]: value,
        }))
    }

    const handleOverlayMouseDown = (event) => {
        overlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget
    }

    const handleOverlayMouseUp = (event) => {
        const endedOutside = event.target === event.currentTarget

        if (overlayMouseDownStartedOutsideRef.current && endedOutside) {
            onClose()
        }

        overlayMouseDownStartedOutsideRef.current = false
    }

    const handleAddLinkRow = () => {
        setVerificationLinkRows((prev) => [...prev, createLinkRow()])
    }

    const handleRemoveLinkRow = (id) => {
        setVerificationLinkRows((prev) => {
            const nextRows = prev.filter((row) => row.id !== id)
            return nextRows.length > 0 ? nextRows : [createLinkRow()]
        })
    }

    const handleChangeLinkRow = (id, field, value) => {
        setVerificationLinkRows((prev) =>
            prev.map((row) =>
                row.id === id
                    ? {
                        ...row,
                        [field]: value,
                    }
                    : row
            )
        )
    }

    const handlePickAttachment = () => {
        if (!canUploadAttachments || isVerificationAttachmentUploading) return
        attachmentInputRef.current?.click()
    }

    const handleAttachmentChange = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            await onUploadVerificationAttachment?.(file)
        } finally {
            event.target.value = ''
        }
    }

    return (
        <div
            className="employer-verification-modal"
            onMouseDown={handleOverlayMouseDown}
            onMouseUp={handleOverlayMouseUp}
        >
            <div
                className="employer-verification-modal__dialog"
                role="dialog"
                aria-modal="true"
                aria-labelledby="employer-verification-modal-title"
            >
                <div className="employer-verification-modal__header">
                    <div className="employer-verification-modal__header-content">
                        <h2
                            id="employer-verification-modal-title"
                            className="employer-verification-modal__title"
                        >
                            Верификация компании
                        </h2>
                        <p className="employer-verification-modal__subtitle">
                            Выберите способ подтверждения, который удобнее для вашей компании
                        </p>
                    </div>

                    <button
                        type="button"
                        className="employer-verification-modal__close"
                        onClick={onClose}
                        aria-label="Закрыть"
                    >
                        ×
                    </button>
                </div>

                <div className="employer-verification-modal__body">
                    <div
                        className={`employer-verification-modal__status-card ${verificationStatusMeta.toneClassName}`}
                    >
                        <div className="employer-verification-modal__status-card-head">
                            <span className="employer-verification-modal__status-card-label">
                                Статус заявки
                            </span>

                            <span className="employer-verification-modal__status-badge">
                                {verificationStatusMeta.shortLabel}
                            </span>
                        </div>

                        <div className="employer-verification-modal__status-card-title">
                            {verificationStatusMeta.title}
                        </div>

                        <p className="employer-verification-modal__status-card-description">
                            {verificationStatusMeta.description}
                        </p>

                        <div className="employer-verification-modal__status-grid">
                            <div className="employer-verification-modal__status-item">
                                <span className="employer-verification-modal__status-item-label">
                                    ID заявки
                                </span>
                                <span className="employer-verification-modal__status-item-value">
                                    {hasVerificationId ? verificationId : '—'}
                                </span>
                            </div>

                            <div className="employer-verification-modal__status-item">
                                <span className="employer-verification-modal__status-item-label">
                                    Статус
                                </span>
                                <span className="employer-verification-modal__status-item-value">
                                    {verificationStatusMeta.shortLabel}
                                </span>
                            </div>

                            <div className="employer-verification-modal__status-item">
                                <span className="employer-verification-modal__status-item-label">
                                    Задача модерации
                                </span>
                                <span className="employer-verification-modal__status-item-value">
                                    {moderationTaskLabel}
                                </span>
                            </div>
                        </div>

                        {shouldShowPendingWithoutIdHint && (
                            <div className="employer-verification-modal__helper">
                                Заявка уже существует, но API не вернул её идентификатор. Пока id не
                                получен, прикрепление файлов недоступно.
                            </div>
                        )}

                        {showCancelModerationButton && (
                            <div className="employer-verification-modal__status-actions">
                                <button
                                    type="button"
                                    className="button button--ghost employer-verification-modal__status-button"
                                    onClick={onCancelVerificationModerationTask}
                                >
                                    Отменить задачу модерации
                                </button>
                            </div>
                        )}
                    </div>

                    {!isReadonlyVerificationState && (
                        <>
                            <div className="employer-verification-modal__methods">
                                {Object.entries(METHOD_META).map(([method, meta]) => {
                                    const isActive = currentMethod === method

                                    return (
                                        <button
                                            key={method}
                                            type="button"
                                            className={`employer-verification-modal__method ${isActive ? 'is-active' : ''}`}
                                            onClick={() => updateMethod(method)}
                                        >
                                            <span className="employer-verification-modal__method-title">
                                                {meta.title}
                                            </span>
                                        </button>
                                    )
                                })}
                            </div>

                            <div className="employer-verification-modal__selected-card">
                                <div className="employer-verification-modal__selected-card-top">
                                    <span className="employer-verification-modal__selected-card-title">
                                        Выбранный способ
                                    </span>
                                    <span className="employer-verification-modal__selected-card-badge">
                                        {currentMeta.badge}
                                    </span>
                                </div>

                                <div className="employer-verification-modal__selected-method">
                                    {currentMeta.title}
                                </div>

                                <p className="employer-verification-modal__selected-description">
                                    {currentMeta.description}
                                </p>
                            </div>

                            {currentMethod === 'CORPORATE_EMAIL' && (
                                <div className="employer-verification-modal__section">
                                    <label className="label">Корпоративная почта</label>
                                    <input
                                        className="input"
                                        type="email"
                                        value={verificationData?.corporateEmail || ''}
                                        placeholder={userEmail || 'company@domain.com'}
                                        onChange={(event) =>
                                            updateField('corporateEmail', event.target.value)
                                        }
                                    />
                                </div>
                            )}

                            {currentMethod === 'TIN' && (
                                <div className="employer-verification-modal__section">
                                    <label className="label">ИНН</label>
                                    <input
                                        className="input"
                                        type="text"
                                        value={verificationData?.inn || companyInn || ''}
                                        placeholder="Введите ИНН"
                                        onChange={(event) => updateField('inn', event.target.value)}
                                    />
                                </div>
                            )}

                            {currentMethod === 'PROFESSIONAL_LINKS' && (
                                <div className="employer-verification-modal__section">
                                    <div className="employer-verification-modal__section-head">
                                        <label className="label">Профессиональные ссылки</label>

                                        <button
                                            type="button"
                                            className="employer-verification-modal__add-link"
                                            onClick={handleAddLinkRow}
                                        >
                                            Добавить ссылку
                                        </button>
                                    </div>

                                    <div className="employer-verification-modal__links">
                                        {normalizedLinkRows.map((row) => (
                                            <div
                                                key={row.id}
                                                className="employer-verification-modal__link-row"
                                            >
                                                <input
                                                    className="input"
                                                    type="text"
                                                    value={row.title || ''}
                                                    placeholder="Название площадки"
                                                    onChange={(event) =>
                                                        handleChangeLinkRow(
                                                            row.id,
                                                            'title',
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                <input
                                                    className="input"
                                                    type="url"
                                                    value={row.url || ''}
                                                    placeholder="https://..."
                                                    onChange={(event) =>
                                                        handleChangeLinkRow(
                                                            row.id,
                                                            'url',
                                                            event.target.value
                                                        )
                                                    }
                                                />

                                                <button
                                                    type="button"
                                                    className="employer-verification-modal__icon-button"
                                                    onClick={() => handleRemoveLinkRow(row.id)}
                                                    aria-label="Удалить ссылку"
                                                >
                                                    <img
                                                        src={TrashIcon}
                                                        alt=""
                                                        className="employer-verification-modal__icon"
                                                    />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="employer-verification-modal__section">
                                <label className="label">Комментарий</label>
                                <Textarea
                                    value={verificationData?.submittedComment || ''}
                                    placeholder="При необходимости добавьте комментарий для модератора"
                                    rows={3}
                                    onChange={(event) =>
                                        updateField('submittedComment', event.target.value)
                                    }
                                />
                            </div>
                        </>
                    )}

                    <div className="employer-verification-modal__section">
                        <div className="employer-verification-modal__section-head">
                            <label className="label">Файлы к заявке</label>

                            {canUploadAttachments && (
                                <button
                                    type="button"
                                    className="button button--ghost employer-verification-modal__footer-button"
                                    onClick={handlePickAttachment}
                                    disabled={isVerificationAttachmentUploading}
                                >
                                    {isVerificationAttachmentUploading ? 'Загрузка...' : 'Добавить файл'}
                                </button>
                            )}
                        </div>

                        <input
                            ref={attachmentInputRef}
                            type="file"
                            hidden
                            onChange={handleAttachmentChange}
                        />

                        {!hasVerificationId && verificationStatus === 'NOT_STARTED' && (
                            <div className="employer-verification-modal__helper">
                                Сначала отправьте заявку на верификацию, затем можно будет прикрепить
                                файлы.
                            </div>
                        )}

                        {!hasVerificationId &&
                            ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(verificationStatus) && (
                                <div className="employer-verification-modal__helper">
                                    Заявка уже создана, но её id пока недоступен. Пока фронт не получил
                                    идентификатор, прикрепить файл нельзя.
                                </div>
                            )}

                        {hasVerificationId && verificationAttachments.length === 0 && (
                            <div className="employer-verification-modal__helper">
                                Пока нет прикреплённых файлов.
                            </div>
                        )}

                        {verificationAttachments.length > 0 && (
                            <div className="employer-verification-modal__attachments">
                                {verificationAttachments.map((file, index) => {
                                    const attachmentKey =
                                        file?.attachmentId ||
                                        file?.id ||
                                        file?.fileId ||
                                        file?.url ||
                                        `${index}`

                                    const fileName =
                                        file?.file?.originalFileName ||
                                        file?.originalFilename ||
                                        file?.originalFileName ||
                                        file?.fileName ||
                                        file?.name ||
                                        `Файл ${index + 1}`

                                    return (
                                        <div
                                            key={attachmentKey}
                                            className="employer-verification-modal__attachment"
                                        >
                                            <div className="employer-verification-modal__attachment-name">
                                                {fileName}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <div className="employer-verification-modal__footer">
                    <button
                        type="button"
                        className="button button--ghost employer-verification-modal__footer-button"
                        onClick={onClose}
                    >
                        Закрыть
                    </button>

                    {shouldShowSubmitButton && (
                        <button
                            type="button"
                            className="button employer-verification-modal__footer-button"
                            onClick={onSubmit}
                        >
                            {canResubmitVerification ? 'Отправить повторно' : 'Отправить заявку'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EmployerVerificationModal