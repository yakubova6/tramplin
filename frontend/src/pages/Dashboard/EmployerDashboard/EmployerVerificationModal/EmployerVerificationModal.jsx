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
        description: 'Заполните данные компании и отправьте заявку на верификацию.',
        toneClassName: 'is-not-started',
        shortLabel: 'Не начата',
        statusLabel: 'Не начата',
    },
    PENDING: {
        title: 'Заявка отправлена',
        description: 'Заявка создана и ожидает проверки. После создания заявки можно прикрепить подтверждающие файлы.',
        toneClassName: 'is-pending',
        shortLabel: 'Отправлена',
        statusLabel: 'Отправлена',
    },
    IN_PROGRESS: {
        title: 'Заявка в обработке',
        description: 'Модератор уже работает с заявкой. При необходимости можно добавить подтверждающие файлы.',
        toneClassName: 'is-pending',
        shortLabel: 'В обработке',
        statusLabel: 'В обработке',
    },
    UNDER_REVIEW: {
        title: 'Заявка на проверке',
        description: 'Заявка находится на рассмотрении. При необходимости можно прикрепить дополнительные материалы.',
        toneClassName: 'is-pending',
        shortLabel: 'На проверке',
        statusLabel: 'На проверке',
    },
    APPROVED: {
        title: 'Верификация одобрена',
        description: 'Компания успешно прошла верификацию. Теперь вы можете публиковать вакансии и мероприятия.',
        toneClassName: 'is-approved',
        shortLabel: 'Одобрена',
        statusLabel: 'Одобрена',
    },
    REJECTED: {
        title: 'Нужна доработка',
        description: 'Заявка была отклонена. Исправьте данные и отправьте её повторно.',
        toneClassName: 'is-rejected',
        shortLabel: 'Нужна доработка',
        statusLabel: 'Нужна доработка',
    },
    REVOKED: {
        title: 'Верификация отозвана',
        description: 'Необходимо повторно пройти верификацию компании.',
        toneClassName: 'is-rejected',
        shortLabel: 'Отозвана',
        statusLabel: 'Отозвана',
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
                                       isVerificationSubmitting = false,
                                       onUploadVerificationAttachment,
                                       onCancelVerificationModerationTask,
                                       profileVerificationStatus = 'NOT_STARTED',
                                       onOpenAttachment,
                                       onDeleteAttachment,
                                       isDeletingAttachment = false,
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
    const employerUserId = currentVerification?.employerUserId ?? null

    const persistedMethod = String(
        currentVerification?.verificationMethod ||
        verificationData?.verificationMethod ||
        'TIN'
    ).toUpperCase()

    const currentMethod = METHOD_META[persistedMethod] ? persistedMethod : 'TIN'
    const currentMeta = METHOD_META[currentMethod] || METHOD_META.TIN

    const normalizedLinkRows = useMemo(() => {
        return Array.isArray(verificationLinkRows) && verificationLinkRows.length > 0
            ? verificationLinkRows
            : [createLinkRow()]
    }, [verificationLinkRows])

    const isActiveVerification = ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(
        verificationStatus
    )
    const isApprovedVerification = verificationStatus === 'APPROVED'
    const canResubmitVerification = ['REJECTED', 'REVOKED', 'NOT_STARTED'].includes(
        verificationStatus
    )

    const isRejectedVerification = verificationStatus === 'REJECTED'
    const isRevokedVerification = verificationStatus === 'REVOKED'

    const isReadonlyForm = isActiveVerification || isApprovedVerification

    const canUploadAttachments =
        hasVerificationId &&
        ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(verificationStatus)

    const hasModerationTask = Boolean(
        verificationModerationTask?.exists || verificationModerationTask?.taskId
    )

    const moderationTaskLabel = hasModerationTask ? 'Создана' : 'Не создана'

    const showCancelModerationButton =
        hasVerificationId &&
        hasModerationTask &&
        isActiveVerification &&
        typeof onCancelVerificationModerationTask === 'function'

    const shouldShowSubmitButton = canResubmitVerification && !isActiveVerification && !isApprovedVerification

    const submitButtonText = useMemo(() => {
        if (isRejectedVerification || isRevokedVerification) {
            return 'Отправить повторно'
        }
        if (verificationStatus === 'NOT_STARTED') {
            return 'Отправить заявку'
        }
        return 'Отправить заявку'
    }, [isRejectedVerification, isRevokedVerification, verificationStatus])

    if (!isOpen) return null

    const updateMethod = (method) => {
        if (isReadonlyForm) return

        setVerificationData((prev) => ({
            ...prev,
            verificationMethod: method,
        }))
    }

    const updateField = (field, value) => {
        if (isReadonlyForm) return

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
        if (isReadonlyForm) return
        setVerificationLinkRows((prev) => [...prev, createLinkRow()])
    }

    const handleRemoveLinkRow = (id) => {
        if (isReadonlyForm) return

        setVerificationLinkRows((prev) => {
            const nextRows = prev.filter((row) => row.id !== id)
            return nextRows.length > 0 ? nextRows : [createLinkRow()]
        })
    }

    const handleChangeLinkRow = (id, field, value) => {
        if (isReadonlyForm) return

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

        if (file.type !== 'application/pdf') {
            alert('Можно загружать только PDF файлы')
            event.target.value = ''
            return
        }

        if (file.size > 20 * 1024 * 1024) {
            alert('Размер файла не должен превышать 20 МБ')
            event.target.value = ''
            return
        }

        try {
            await onUploadVerificationAttachment?.(file)
        } finally {
            event.target.value = ''
        }
    }

    const handleOpenAttachment = (file) => {
        const fileData = file?.file || file
        const fileId = fileData?.fileId || file?.fileId
        const verificationId = file?.entityId // entityId = 42 (ID верификации)
        const ownerUserId = fileData?.ownerUserId

        console.log('File data:', { fileId, verificationId, ownerUserId })

        if (verificationId && fileId) {
            const downloadUrl = `/api/employer/verifications/${verificationId}/attachments/${fileId}`
            console.log('Attempting to open via verification endpoint:', downloadUrl)
            window.open(downloadUrl, '_blank', 'noopener,noreferrer')
            return
        }

        if (ownerUserId && fileId) {
            const downloadUrl = `/api/profile/employer/${ownerUserId}/files/${fileId}`
            console.log('Attempting to open via profile endpoint:', downloadUrl)
            window.open(downloadUrl, '_blank', 'noopener,noreferrer')
            return
        }

        alert('Не удалось открыть файл')
    }

    const handleDeleteAttachment = (file) => {
        const fileId = file?.fileId || file?.file?.fileId || file?.id
        if (fileId && onDeleteAttachment) {
            onDeleteAttachment(fileId, file)
        }
    }

    const getAttachmentKey = (file, index) => {
        const fileId = file?.fileId || file?.file?.fileId || file?.id
        const attachmentId = file?.attachmentId
        const fileName =
            file?.file?.originalFileName ||
            file?.originalFileName ||
            file?.fileName ||
            file?.name ||
            ''

        if (fileId && attachmentId) {
            return `file_${fileId}_att_${attachmentId}`
        }
        if (fileId) {
            return `file_${fileId}_idx_${index}`
        }
        if (attachmentId) {
            return `att_${attachmentId}_idx_${index}`
        }
        return `temp_${fileName}_${index}`
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
                                {verificationStatusMeta.statusLabel}
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
                                    {verificationStatusMeta.statusLabel}
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

                    {!isReadonlyForm && (
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
                                        className="input input--disabled"
                                        type="text"
                                        value={companyInn || verificationData?.inn || ''}
                                        placeholder="ИНН берется из реквизитов компании"
                                        readOnly
                                        disabled
                                    />
                                    <div className="employer-verification-modal__helper">
                                        Для верификации по ИНН используется значение из реквизитов
                                        компании. Изменить его можно в разделе с реквизитами.
                                    </div>
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

                    {isReadonlyForm && (
                        <div className="employer-verification-modal__selected-card">
                            <div className="employer-verification-modal__selected-card-top">
                                <span className="employer-verification-modal__selected-card-title">
                                    Текущий способ верификации
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
                            accept=".pdf,application/pdf"
                            hidden
                            onChange={handleAttachmentChange}
                        />

                        {!hasVerificationId && verificationStatus === 'NOT_STARTED' && (
                            <div className="employer-verification-modal__helper">
                                Сначала отправьте заявку на верификацию, затем можно будет прикрепить файлы.
                            </div>
                        )}

                        {isRejectedVerification && (
                            <div className="employer-verification-modal__helper">
                                Предыдущая заявка отклонена. Исправьте данные и отправьте новую заявку повторно.
                                После создания новой заявки можно будет прикрепить файлы.
                            </div>
                        )}

                        {isRevokedVerification && (
                            <div className="employer-verification-modal__helper">
                                Верификация отозвана. Пройдите верификацию заново.
                                После создания новой заявки можно будет прикрепить файлы.
                            </div>
                        )}

                        {hasVerificationId &&
                            verificationAttachments.length === 0 &&
                            canUploadAttachments && (
                                <div className="employer-verification-modal__helper">
                                    Пока нет прикреплённых файлов. Добавьте подтверждающие документы (PDF до 20 МБ).
                                </div>
                            )}

                        {verificationAttachments.length > 0 && (
                            <div className="employer-verification-modal__attachments">
                                <div className="employer-verification-modal__attachments-title">
                                    Прикреплённые файлы ({verificationAttachments.length}):
                                </div>
                                {verificationAttachments.map((file, index) => {
                                    const attachmentKey = getAttachmentKey(file, index)
                                    const fileId = file?.fileId || file?.file?.fileId || file?.id
                                    const fileName =
                                        file?.file?.originalFileName ||
                                        file?.originalFilename ||
                                        file?.originalFileName ||
                                        file?.fileName ||
                                        file?.name ||
                                        `Файл ${index + 1}`

                                    const ownerUserId = file?.file?.ownerUserId || employerUserId
                                    const canOpen = Boolean(fileId && ownerUserId)
                                    const canDelete = Boolean(fileId && !isDeletingAttachment && canUploadAttachments)

                                    return (
                                        <div
                                            key={attachmentKey}
                                            className="employer-verification-modal__attachment"
                                        >
                                            <div className="employer-verification-modal__attachment-info">
                                                <div
                                                    className="employer-verification-modal__attachment-name"
                                                    onClick={() => canOpen && handleOpenAttachment(file)}
                                                    style={{ cursor: canOpen ? 'pointer' : 'default' }}
                                                    role={canOpen ? 'button' : undefined}
                                                    tabIndex={canOpen ? 0 : undefined}
                                                >
                                                    {fileName}
                                                </div>
                                            </div>
                                            <div className="employer-verification-modal__attachment-actions">
                                                {canDelete && (
                                                    <button
                                                        type="button"
                                                        className="employer-verification-modal__attachment-delete"
                                                        onClick={() => handleDeleteAttachment(file)}
                                                        aria-label="Удалить файл"
                                                        disabled={isDeletingAttachment}
                                                    >
                                                        <img
                                                            src={TrashIcon}
                                                            alt=""
                                                            className="employer-verification-modal__icon"
                                                        />
                                                    </button>
                                                )}
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
                            disabled={isVerificationSubmitting}
                        >
                            {isVerificationSubmitting ? 'Отправка...' : submitButtonText}
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default EmployerVerificationModal