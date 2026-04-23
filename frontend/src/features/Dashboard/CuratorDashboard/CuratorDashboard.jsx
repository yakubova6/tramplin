import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { useToast } from '@/shared/hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Textarea from '@/shared/ui/Textarea'
import Label from '@/shared/ui/Label'
import CustomSelect from '@/shared/ui/CustomSelect'
import CustomCheckbox from '@/shared/ui/CustomCheckbox'
import { getSessionUser, subscribeSessionChange } from '@/shared/lib/utils/sessionStore'
import { createCurator } from '@/shared/api/admin'
import {
    getModerationDashboard,
    getModerationTasks,
    getModerationTaskDetail,
    approveModerationTask,
    rejectModerationTask,
    requestChangesModerationTask,
    assignModerationTask,
    addModerationComment,
    cancelModerationTask,
    getModerationEntityAttachments,
    uploadModerationTaskAttachment,
    deleteModerationTaskAttachment,
    getModerationTaskAttachmentDownloadUrl,
    createManualModerationTask,
    TASK_TYPES,
    TASK_STATUSES,
    ENTITY_TYPES,
    PRIORITIES,
    SEVERITY_OPTIONS,
    SORT_OPTIONS,
} from '@/shared/api/moderation'
import {
    formatDate,
    getPriorityLabel,
    getPriorityClass,
    getStatusLabel,
    getStatusClass,
    getEntityTypeLabel,
    getTaskTypeLabel,
    getActionLabel,
    getAttachmentRoleLabel,
    deepClone,
    buildChangedFieldsPatch,
    getEditableFieldsByEntityType,
    getPreviewFieldsByEntityType,
} from '@/shared/lib/utils/moderationHelpers'
import '../DashboardBase.scss'
import './CuratorDashboard.scss'
import CuratorTagsPage from './CuratorTagsPage'

import eyeIcon from '@/assets/icons/eye.svg'
import trashIcon from '@/assets/icons/trash.svg'

const EMPTY_FIELD_ISSUE = { field: '', message: '', code: '' }

const REQUEST_CHANGE_REASON_OPTIONS = [
    { value: 'REQUEST_CHANGES', label: 'Нужны правки' },
    { value: 'INCOMPLETE_DATA', label: 'Неполные данные' },
    { value: 'INVALID_DATA', label: 'Некорректные данные' },
    { value: 'MISSING_FILES', label: 'Не хватает файлов' },
]

const REJECT_REASON_OPTIONS = [
    { value: 'INVALID_DATA', label: 'Некорректные данные' },
    { value: 'POLICY_VIOLATION', label: 'Нарушение правил' },
    { value: 'DUPLICATE', label: 'Дубликат' },
    { value: 'NOT_RELEVANT', label: 'Неактуально' },
]

function getManualEntityIdHint(entityType) {
    switch (entityType) {
        case 'APPLICANT_PROFILE':
            return 'Укажите идентификатор профиля соискателя.'
        case 'EMPLOYER_PROFILE':
            return 'Укажите идентификатор профиля компании.'
        case 'EMPLOYER_VERIFICATION':
            return 'Укажите идентификатор заявки на верификацию.'
        case 'OPPORTUNITY':
            return 'Укажите идентификатор вакансии.'
        case 'TAG':
            return 'Укажите идентификатор тега.'
        default:
            return 'Укажите идентификатор записи, которую нужно проверить.'
    }
}

const MANUAL_TASK_DEFAULT = {
    entityType: 'APPLICANT_PROFILE',
    entityId: '',
    taskType: 'PROFILE_REVIEW',
    priority: 'MEDIUM',
    comment: '',
}

function toLocalDateTimeValue(value) {
    if (!value) return ''
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return ''
    const pad = (part) => String(part).padStart(2, '0')
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function toApiDateTime(value) {
    if (!value) return undefined
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return undefined
    return date.toISOString()
}

function getCurrentUserId(user) {
    return user?.id ?? user?.userId ?? null
}

function normalizeAction(action) {
    return String(action || '').trim().toUpperCase().replace(/-/g, '_')
}

function hasTaskAction(task, expectedAction) {
    const actions = Array.isArray(task?.availableActions) ? task.availableActions.map(normalizeAction) : []
    const expected = normalizeAction(expectedAction)

    if (!actions.length) return false
    if (actions.includes(expected)) return true

    const aliases = {
        REQUEST_CHANGES: ['REQUESTED_CHANGES'],
        COMMENT: ['COMMENTED', 'ADD_COMMENT'],
        ASSIGN: ['ASSIGN_TO_ME', 'TAKE_IN_WORK'],
        CANCEL: ['CLOSE'],
    }

    return (aliases[expected] || []).some((alias) => actions.includes(alias))
}

function buildFieldDiffRows(originalSnapshot = {}, draft = {}, entityType) {
    const fieldDefinitions = getEditableFieldsByEntityType(entityType)
    const patch = buildChangedFieldsPatch(originalSnapshot, draft)

    return Object.keys(patch).map((key) => {
        const fieldDefinition = fieldDefinitions.find((item) => item.key === key)
        return {
            key,
            label: fieldDefinition?.label || key,
            before: originalSnapshot?.[key],
            after: draft?.[key],
        }
    })
}

function renderDiffValue(value) {
    if (value === null || value === undefined || value === '') return '—'
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет'
    if (Array.isArray(value)) return value.length ? JSON.stringify(value) : '—'
    if (typeof value === 'object') {
        if (value?.name) return String(value.name)
        if (value?.cityName) return String(value.cityName)
        if (value?.title) return String(value.title)
        if (value?.label) return String(value.label)

        try {
            return JSON.stringify(value)
        } catch {
            return '—'
        }
    }
    return String(value)
}

function getEditableInputValue(value, type) {
    if (value === null || value === undefined) return ''

    if (type === 'number') {
        return typeof value === 'number' ? String(value) : ''
    }

    if (typeof value === 'object') {
        if (value?.name) return String(value.name)
        if (value?.cityName) return String(value.cityName)
        if (value?.title) return String(value.title)
        if (value?.label) return String(value.label)
        return ''
    }

    return String(value)
}

function EntityEditor({ entityType, originalSnapshot, draft, onChange }) {
    const fields = getEditableFieldsByEntityType(entityType)

    if (!fields.length) {
        return (
            <div className="moderation-entity-editor__empty">
                Для этого типа сущности редактирование пока не настроено.
            </div>
        )
    }

    return (
        <div className="moderation-entity-editor">
            {fields.map((field) => {
                const originalValue = originalSnapshot?.[field.key]
                const currentValue = draft?.[field.key]
                const isChanged = JSON.stringify(originalValue) !== JSON.stringify(currentValue)

                if (field.type === 'textarea') {
                    return (
                        <div key={field.key} className={`moderation-entity-editor__field ${isChanged ? 'is-changed' : ''}`}>
                            <Label>{field.label}</Label>
                            <Textarea
                                rows={4}
                                value={currentValue ?? ''}
                                onChange={(e) => onChange(field.key, e.target.value)}
                            />
                            {isChanged && (
                                <div className="moderation-entity-editor__diff">
                                    Было: {renderDiffValue(originalValue)}
                                </div>
                            )}
                        </div>
                    )
                }

                if (field.type === 'boolean') {
                    return (
                        <div key={field.key} className={`moderation-entity-editor__field ${isChanged ? 'is-changed' : ''}`}>
                            <CustomCheckbox
                                checked={Boolean(currentValue)}
                                onChange={(val) => onChange(field.key, val)}
                                label={field.label}
                            />
                            {isChanged && (
                                <div className="moderation-entity-editor__diff">
                                    Было: {originalValue ? 'Да' : 'Нет'}
                                </div>
                            )}
                        </div>
                    )
                }

                return (
                    <div key={field.key} className={`moderation-entity-editor__field ${isChanged ? 'is-changed' : ''}`}>
                        <Label>{field.label}</Label>
                        <Input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={getEditableInputValue(currentValue, field.type)}
                            onChange={(e) =>
                                onChange(
                                    field.key,
                                    field.type === 'number'
                                        ? (e.target.value === '' ? null : Number(e.target.value))
                                        : e.target.value,
                                )
                            }
                        />
                        {isChanged && (
                            <div className="moderation-entity-editor__diff">
                                Было: {renderDiffValue(originalValue)}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function PreviewBlock({
                          title,
                          entityType,
                          snapshot,
                          draft = null,
                          compareSnapshot = null,
                          highlightAll = false,
                      }) {
    const fields = getPreviewFieldsByEntityType(entityType, snapshot)

    return (
        <div className="task-detail-snapshot">
            <h4>{title ? title : null}</h4>
            <div className="snapshot-formatted">
                <div className="snapshot-fields">
                    {fields.map((field) => {
                        const draftValue = draft ? draft?.[field.key] : undefined
                        const isChangedInDraft = draft
                            ? JSON.stringify(snapshot?.[field.key]) !== JSON.stringify(draftValue)
                            : false
                        const isChangedByComparison = compareSnapshot
                            ? JSON.stringify(snapshot?.[field.key]) !== JSON.stringify(compareSnapshot?.[field.key])
                            : highlightAll
                        const isChanged = isChangedInDraft || isChangedByComparison

                        return (
                            <div key={field.key} className={`snapshot-field ${isChanged ? 'is-changed' : ''}`}>
                                <span className="field-label">{field.label}:</span>
                                <span className="field-value">
                  {isChangedInDraft ? renderDiffValue(draftValue) : renderDiffValue(field.value)}
                </span>
                            </div>
                        )
                    })}
                </div>
            </div>

            {!fields.length && (
                <pre className="snapshot-content">{JSON.stringify(draft || snapshot || {}, null, 2)}</pre>
            )}
        </div>
    )
}


function isImageAttachmentMediaType(mediaType) {
    return typeof mediaType === 'string' && mediaType.toLowerCase().startsWith('image/')
}

function AttachmentList({
                            title,
                            description,
                            attachments,
                            onOpen,
                            onDelete,
                            allowDelete = false,
                            emptyText,
                        }) {
    return (
        <div className="task-detail-snapshot">
            <div className="moderation-section-header moderation-section-header--attachments">
                <div>
                    <h4>{title ? title : null}</h4>
                    {description && <p className="moderation-section-hint">{description}</p>}
                </div>
            </div>

            {!attachments?.length ? (
                <div className="moderation-attachments__empty">{emptyText}</div>
            ) : (
                <div className="moderation-attachments moderation-attachments--compact">
                    {attachments.map((attachment) => {
                        const fileName = attachment.originalFileName || attachment.file?.originalFileName || 'Файл'
                        const fileId = attachment.fileId || attachment.file?.fileId
                        const attachmentId = attachment.id || attachment.attachmentId
                        const mediaType = attachment.mediaType || attachment.file?.mediaType
                        const sizeBytes = attachment.sizeBytes || attachment.file?.sizeBytes
                        const role = attachment.attachmentRole

                        return (
                            <div key={`${attachmentId}-${fileId}`} className="moderation-attachment-card moderation-attachment-card--compact">
                                <div className="moderation-attachment-card__main">
                                    <div className="moderation-attachment-card__title">{fileName}</div>
                                    <div className="moderation-attachment-card__meta">
                                        <span>{getAttachmentRoleLabel(role)}</span>
                                        {mediaType && <span>{mediaType}</span>}
                                        {typeof sizeBytes === 'number' && <span>{Math.round(sizeBytes / 1024)} КБ</span>}
                                        {isImageAttachmentMediaType(mediaType) && <span>Изображение</span>}
                                    </div>
                                </div>

                                <div className="moderation-attachment-card__actions">
                                    {onOpen && (
                                        <Button className="button--ghost" onClick={() => onOpen(attachment)}>
                                            Открыть
                                        </Button>
                                    )}
                                    {allowDelete && onDelete && (
                                        <button
                                            type="button"
                                            className="attachment-icon-button attachment-icon-button--danger"
                                            aria-label={`Удалить файл ${fileName}`}
                                            title="Удалить файл"
                                            onClick={() => onDelete(attachment)}
                                        >
                                            <img src={trashIcon} alt="" aria-hidden="true" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

function CuratorDashboard() {
    const { toast } = useToast()
    const [activeTab, setActiveTab] = useState('tasks')
    const [selectedTask, setSelectedTask] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [dashboardStats, setDashboardStats] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)
    const [tasks, setTasks] = useState({ items: [], totalItems: 0, totalPages: 0 })
    const [pagination, setPagination] = useState({ page: 0, size: 20 })
    const [entityAttachments, setEntityAttachments] = useState([])
    const [taskHistory, setTaskHistory] = useState([])
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)
    const [allHistory, setAllHistory] = useState([])
    const [historyTotalPages, setHistoryTotalPages] = useState(0)
    const [isEditingEntity, setIsEditingEntity] = useState(false)
    const [entityDraft, setEntityDraft] = useState(null)
    const [uploadingAttachment, setUploadingAttachment] = useState(false)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [imagePreview, setImagePreview] = useState(null)

    const [filters, setFilters] = useState({
        status: '',
        taskType: '',
        entityType: '',
        priority: '',
        assigneeUserId: '',
        mine: false,
        createdFrom: '',
        createdTo: '',
        sort: 'createdAt,desc',
    })

    const [historyFilters, setHistoryFilters] = useState({
        page: 0,
        size: 10,
        search: '',
        sort: 'createdAt,desc',
    })
    const [debouncedHistorySearch, setDebouncedHistorySearch] = useState('')

    const [approveComment, setApproveComment] = useState('')
    const [rejectComment, setRejectComment] = useState('')
    const [rejectReason, setRejectReason] = useState('')
    const [rejectSeverity, setRejectSeverity] = useState('NORMAL')
    const [requestChangesComment, setRequestChangesComment] = useState('')
    const [requestChangesReason, setRequestChangesReason] = useState('REQUEST_CHANGES')
    const [notifyUserAboutChanges, setNotifyUserAboutChanges] = useState(true)
    const [fieldIssues, setFieldIssues] = useState([{ ...EMPTY_FIELD_ISSUE }])
    const [newComment, setNewComment] = useState('')
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)
    const [isRequestChangesModalOpen, setIsRequestChangesModalOpen] = useState(false)
    const [isManualTaskModalOpen, setIsManualTaskModalOpen] = useState(false)
    const [manualTaskForm, setManualTaskForm] = useState(MANUAL_TASK_DEFAULT)

    const [newCuratorEmail, setNewCuratorEmail] = useState('')
    const [newCuratorName, setNewCuratorName] = useState('')
    const [newCuratorPassword, setNewCuratorPassword] = useState('')
    const [isCreating, setIsCreating] = useState(false)
    const historyTaskDetailsCacheRef = useRef(new Map())
    const detailModalBodyRef = useRef(null)
    const entityEditorRef = useRef(null)

    useEffect(() => {
        setCurrentUser(getSessionUser())
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setCurrentUser(nextUser)
        })
        return unsubscribe
    }, [])

    const loadDashboardStats = useCallback(async () => {
        try {
            const stats = await getModerationDashboard()
            setDashboardStats(stats)
        } catch (error) {
            console.error('Failed to load dashboard stats:', error)
        }
    }, [])

    const loadTasks = useCallback(async () => {
        setIsLoading(true)
        try {
            const data = await getModerationTasks({
                page: pagination.page,
                size: pagination.size,
                status: filters.status || undefined,
                taskType: filters.taskType || undefined,
                entityType: filters.entityType || undefined,
                priority: filters.priority || undefined,
                assigneeUserId: filters.assigneeUserId ? Number(filters.assigneeUserId) : undefined,
                mine: filters.mine || undefined,
                createdFrom: toApiDateTime(filters.createdFrom),
                createdTo: toApiDateTime(filters.createdTo),
                sort: filters.sort || undefined,
            })
            setTasks(data)
        } catch (error) {
            console.error('Failed to load tasks:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить задачи модерации',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [filters, pagination.page, pagination.size, toast])

    const loadTaskDetail = useCallback(async (taskId) => {
        setIsLoading(true)
        setIsDetailLoading(true)
        try {
            const data = await getModerationTaskDetail(taskId)
            setSelectedTask(data)
            setEntityDraft(deepClone(data.createdSnapshot || {}))
            setIsEditingEntity(false)

            const [attachments] = await Promise.all([
                getModerationEntityAttachments(data.entityType, data.entityId).catch(() => []),
            ])

            setTaskHistory(Array.isArray(data?.history) ? data.history : [])
            setEntityAttachments(attachments || [])
            return data
        } catch (error) {
            console.error('Failed to load task detail:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить детали задачи',
                variant: 'destructive',
            })
            return null
        } finally {
            setIsLoading(false)
            setIsDetailLoading(false)
        }
    }, [toast])

    const loadAllHistory = useCallback(async () => {
        setIsHistoryLoading(true)
        try {
            const response = await getModerationTasks({
                page: historyFilters.page,
                size: historyFilters.size,
                sort: historyFilters.sort,
            })
            const pageTasks = response.items || []
            const missingTaskIds = pageTasks
                .map((task) => task.id)
                .filter((id) => !historyTaskDetailsCacheRef.current.has(id))

            if (missingTaskIds.length) {
                const detailResults = await Promise.all(
                    missingTaskIds.map((taskId) =>
                        getModerationTaskDetail(taskId)
                            .then((detail) => ({ ok: true, detail }))
                            .catch((error) => ({ ok: false, taskId, error })),
                    ),
                )

                detailResults.forEach((result) => {
                    if (result.ok) {
                        historyTaskDetailsCacheRef.current.set(result.detail.id, result.detail)
                    } else {
                        console.warn(`Failed to load detail for task ${result.taskId}`, result.error)
                    }
                })
            }

            let mergedHistory = pageTasks.flatMap((task) => {
                const detail = historyTaskDetailsCacheRef.current.get(task.id)
                const history = Array.isArray(detail?.history) ? detail.history : []

                return history.map((item) => ({
                    ...item,
                    taskType: task.taskType,
                    entityType: task.entityType,
                    entityId: task.entityId,
                    taskId: task.id,
                }))
            })

            const search = debouncedHistorySearch.trim().toLowerCase()
            if (search) {
                mergedHistory = mergedHistory.filter((item) => {
                    const haystack = [
                        item.taskId,
                        item.entityId,
                        item.action,
                        item.actor?.displayName,
                        item.payload?.comment,
                        item.payload?.text,
                        item.payload?.reasonCode,
                        item.entityType,
                        item.taskType,
                    ]
                        .filter(Boolean)
                        .join(' ')
                        .toLowerCase()
                    return haystack.includes(search)
                })
            }

            mergedHistory.sort((a, b) => {
                const dateA = new Date(a.createdAt)
                const dateB = new Date(b.createdAt)
                return historyFilters.sort === 'createdAt,asc' ? dateA - dateB : dateB - dateA
            })

            setAllHistory(mergedHistory)
            setHistoryTotalPages(response.totalPages || 0)
        } catch (error) {
            console.error('Failed to load all history:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить историю модерации',
                variant: 'destructive',
            })
        } finally {
            setIsHistoryLoading(false)
        }
    }, [debouncedHistorySearch, historyFilters.page, historyFilters.size, historyFilters.sort, toast])

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedHistorySearch(historyFilters.search)
        }, 350)
        return () => window.clearTimeout(timeoutId)
    }, [historyFilters.search])

    useEffect(() => {
        loadTasks()
        loadDashboardStats()
    }, [loadTasks, loadDashboardStats])

    useEffect(() => {
        if (activeTab === 'history') {
            loadAllHistory()
        }
    }, [activeTab, loadAllHistory])

    useEffect(() => {
        const handleEscape = (event) => {
            if (event.key !== 'Escape') return

            if (isManualTaskModalOpen) {
                setIsManualTaskModalOpen(false)
                return
            }

            if (isRequestChangesModalOpen) {
                setIsRequestChangesModalOpen(false)
                return
            }

            if (isRejectModalOpen) {
                setIsRejectModalOpen(false)
                return
            }

            if (isApproveModalOpen) {
                setIsApproveModalOpen(false)
                return
            }

            if (isDetailOpen) {
                setIsDetailOpen(false)
            }
        }

        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [
        isApproveModalOpen,
        isDetailOpen,
        imagePreview,
        isManualTaskModalOpen,
        isRejectModalOpen,
        isRequestChangesModalOpen,
    ])

    useEffect(() => {
        const shouldLock =
            isDetailOpen ||
            isApproveModalOpen ||
            isRejectModalOpen ||
            isRequestChangesModalOpen ||
            isManualTaskModalOpen ||
            Boolean(imagePreview)

        document.documentElement.classList.toggle('is-lock', shouldLock)
        return () => {
            document.documentElement.classList.remove('is-lock')
        }
    }, [
        imagePreview,
        isApproveModalOpen,
        isDetailOpen,
        isManualTaskModalOpen,
        isRejectModalOpen,
        isRequestChangesModalOpen,
    ])

    const handleOpenTask = async (taskId) => {
        dismissActiveOverlayUi()
        setIsDetailOpen(true)
        setIsDetailLoading(true)
        setSelectedTask({ id: taskId })

        const task = await loadTaskDetail(taskId)
        if (!task) {
            setIsDetailOpen(false)
        }
    }

    const handleAssignToMe = async (taskId) => {
        try {
            await assignModerationTask(taskId, { comment: 'Принято в работу' })
            toast({ title: 'Задача назначена', description: 'Задача добавлена в ваши текущие' })
            await loadTasks()
            if (selectedTask?.id === taskId) {
                await loadTaskDetail(taskId)
            }
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось назначить задачу',
                variant: 'destructive',
            })
        }
    }

    const handleEntityDraftChange = (key, value) => {
        setEntityDraft((prev) => ({ ...(prev || {}), [key]: value }))
    }

    const scrollToEntityEditorStart = useCallback(() => {
        requestAnimationFrame(() => {
            const editor = entityEditorRef.current
            if (!editor) return

            editor.scrollIntoView({
                behavior: 'smooth',
                block: 'start',
                inline: 'nearest',
            })
        })
    }, [])

    const entityPatch = useMemo(() => {
        if (!selectedTask?.createdSnapshot || !entityDraft) return {}
        return buildChangedFieldsPatch(selectedTask.createdSnapshot, entityDraft)
    }, [entityDraft, selectedTask])

    const fieldDiffRows = useMemo(
        () => buildFieldDiffRows(selectedTask?.createdSnapshot || {}, entityDraft || {}, selectedTask?.entityType),
        [entityDraft, selectedTask],
    )

    const handleApprove = async () => {
        if (!selectedTask) return
        if (!approveComment.trim()) {
            toast({ title: 'Ошибка', description: 'Комментарий обязателен', variant: 'destructive' })
            return
        }

        try {
            await approveModerationTask(selectedTask.id, {
                comment: approveComment.trim(),
                reasonCode: 'APPROVED_BY_MODERATOR',
                applyPatch: entityPatch,
                notifyUser: true,
            })

            toast({
                title: 'Задача одобрена',
                description: Object.keys(entityPatch).length
                    ? 'Патч применён и решение сохранено'
                    : 'Решение отправлено пользователю',
            })

            setIsApproveModalOpen(false)
            setApproveComment('')
            await loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось одобрить задачу',
                variant: 'destructive',
            })
        }
    }

    const handleReject = async () => {
        if (!selectedTask) return
        if (!rejectReason.trim() || !rejectComment.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполните причину и комментарий',
                variant: 'destructive',
            })
            return
        }

        try {
            await rejectModerationTask(selectedTask.id, {
                comment: rejectComment.trim(),
                reasonCode: rejectReason.trim(),
                severity: rejectSeverity,
                notifyUser: true,
            })

            toast({ title: 'Задача отклонена', description: 'Отказ отправлен пользователю' })
            setIsRejectModalOpen(false)
            setRejectComment('')
            setRejectReason('')
            setRejectSeverity('NORMAL')
            await loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отклонить задачу',
                variant: 'destructive',
            })
        }
    }

    const handleRequestChanges = async () => {
        if (!selectedTask) return

        const preparedIssues = fieldIssues
            .map((item) => ({
                field: item.field.trim(),
                message: item.message.trim(),
                code: item.code.trim(),
            }))
            .filter((item) => item.field && item.message)

        if (!requestChangesComment.trim()) {
            toast({ title: 'Ошибка', description: 'Комментарий обязателен', variant: 'destructive' })
            return
        }

        if (!requestChangesReason.trim()) {
            toast({ title: 'Ошибка', description: 'Укажите код причины', variant: 'destructive' })
            return
        }

        if (!preparedIssues.length) {
            toast({
                title: 'Ошибка',
                description: 'Добавь хотя бы одну проблему по полю',
                variant: 'destructive',
            })
            return
        }

        try {
            await requestChangesModerationTask(selectedTask.id, {
                comment: requestChangesComment.trim(),
                reasonCode: requestChangesReason.trim(),
                fieldIssues: preparedIssues,
                notifyUser: notifyUserAboutChanges,
            })

            toast({ title: 'Запрос на правки отправлен', description: 'Пользователь увидит замечания по полям' })
            setIsRequestChangesModalOpen(false)
            setRequestChangesComment('')
            setRequestChangesReason('REQUEST_CHANGES')
            setNotifyUserAboutChanges(true)
            setFieldIssues([{ ...EMPTY_FIELD_ISSUE }])
            await loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось запросить правки',
                variant: 'destructive',
            })
        }
    }

    const handleAddComment = async () => {
        if (!selectedTask || !newComment.trim()) return
        try {
            await addModerationComment(selectedTask.id, { text: newComment.trim() })
            toast({ title: 'Комментарий добавлен', description: 'Комментарий сохранён' })
            setNewComment('')
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось добавить комментарий',
                variant: 'destructive',
            })
        }
    }

    const handleCancelTask = async () => {
        if (!selectedTask) return
        try {
            await cancelModerationTask(selectedTask.id)
            toast({ title: 'Задача отменена', description: 'Задача больше не активна' })
            await loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отменить задачу',
                variant: 'destructive',
            })
        }
    }

    const handleTaskAttachmentUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file || !selectedTask) return

        setUploadingAttachment(true)
        try {
            await uploadModerationTaskAttachment(selectedTask.id, file)
            toast({ title: 'Файл загружен', description: 'Вложение добавлено к задаче' })
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось загрузить файл',
                variant: 'destructive',
            })
        } finally {
            event.target.value = ''
            setUploadingAttachment(false)
        }
    }

    const handleDeleteTaskAttachment = async (attachment) => {
        if (!selectedTask) return
        try {
            await deleteModerationTaskAttachment(selectedTask.id, attachment.id || attachment.attachmentId)
            toast({ title: 'Вложение удалено', description: 'Файл удалён из задачи' })
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось удалить вложение',
                variant: 'destructive',
            })
        }
    }

    const handleOpenTaskAttachment = async (attachment) => {
        if (!selectedTask) return
        try {
            const response = await getModerationTaskAttachmentDownloadUrl(selectedTask.id, attachment.fileId)
            if (response?.url) {
                window.open(response.url, '_blank', 'noopener,noreferrer')
            }
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось получить ссылку на скачивание',
                variant: 'destructive',
            })
        }
    }


    const handleOpenEntityAttachment = async (attachment) => {
        if (!selectedTask) return
        try {
            const response = await getModerationTaskAttachmentDownloadUrl(selectedTask.id, attachment.fileId)
            if (response?.url) {
                window.open(response.url, '_blank', 'noopener,noreferrer')
                return
            }

            throw new Error('Ссылка на файл не получена')
        } catch (error) {
            toast({
                title: 'Не удалось открыть файл сущности',
                description: error.message || 'Этот файл не поддерживает открытие через API вложений задачи',
                variant: 'destructive',
            })
        }
    }

    const handleDeleteEntityAttachment = async (attachment) => {
        if (!selectedTask) return
        try {
            await deleteModerationTaskAttachment(selectedTask.id, attachment.id || attachment.attachmentId)
            toast({
                title: 'Запрос отправлен',
                description: 'Если backend поддерживает это вложение как вложение задачи, файл будет удалён.',
            })
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Не удалось удалить файл сущности',
                description: error.message || 'Этот файл не поддерживает удаление через API вложений задачи',
                variant: 'destructive',
            })
        }
    }

    const updateFieldIssue = (index, key, value) => {
        setFieldIssues((prev) => prev.map((item, itemIndex) => (itemIndex === index ? { ...item, [key]: value } : item)))
    }

    const addFieldIssue = () => {
        setFieldIssues((prev) => [...prev, { ...EMPTY_FIELD_ISSUE }])
    }

    const removeFieldIssue = (index) => {
        setFieldIssues((prev) => (prev.length === 1 ? prev : prev.filter((_, itemIndex) => itemIndex !== index)))
    }

    const handleManualTaskCreate = async () => {
        if (!manualTaskForm.entityId || !manualTaskForm.comment.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполни идентификатор сущности и комментарий',
                variant: 'destructive',
            })
            return
        }

        try {
            const createdTask = await createManualModerationTask({
                ...manualTaskForm,
                entityId: Number(manualTaskForm.entityId),
            })
            toast({ title: 'Ручная задача создана', description: `Задача #${createdTask.id} успешно создана` })
            setIsManualTaskModalOpen(false)
            setManualTaskForm(MANUAL_TASK_DEFAULT)
            await loadTasks()
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.code === 'moderated_entity_not_found' ? 'Сущность не найдена. Проверьте, что указан ID самой сущности, а не ID пользователя.' : error.message || 'Не удалось создать ручную задачу',
                variant: 'destructive',
            })
        }
    }

    const handleCreateCurator = async () => {
        if (!newCuratorEmail.trim() || !newCuratorName.trim() || !newCuratorPassword.trim()) {
            toast({ title: 'Ошибка', description: 'Заполните все поля', variant: 'destructive' })
            return
        }
        if (newCuratorPassword.length < 8 || newCuratorPassword.length > 16) {
            toast({ title: 'Ошибка', description: 'Пароль должен быть от 8 до 16 символов', variant: 'destructive' })
            return
        }

        setIsCreating(true)
        try {
            await createCurator({
                displayName: newCuratorName.trim(),
                email: newCuratorEmail.trim(),
                password: newCuratorPassword,
            })
            toast({ title: 'Куратор создан', description: `Куратор ${newCuratorName} успешно добавлен` })
            setNewCuratorEmail('')
            setNewCuratorName('')
            setNewCuratorPassword('')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось создать куратора',
                variant: 'destructive',
            })
        } finally {
            setIsCreating(false)
        }
    }

    const resetFilters = () => {
        setFilters({
            status: '',
            taskType: '',
            entityType: '',
            priority: '',
            assigneeUserId: '',
            mine: false,
            createdFrom: '',
            createdTo: '',
            sort: 'createdAt,desc',
        })
        setPagination((prev) => ({ ...prev, page: 0 }))
    }

    const isAdmin = currentUser?.role === 'ADMIN'
    const currentUserId = getCurrentUserId(currentUser)

    const modalOverlayMouseDownRef = useRef(false)
    const modalOverlayMouseUpRef = useRef(false)

    const dismissActiveOverlayUi = useCallback(() => {
        if (typeof document !== 'undefined' && document.activeElement && typeof document.activeElement.blur === 'function') {
            document.activeElement.blur()
        }
    }, [])

    const getOverlayHandlers = useCallback((closeFn) => ({
        onMouseDown: (event) => {
            modalOverlayMouseDownRef.current = event.target === event.currentTarget
            modalOverlayMouseUpRef.current = false
        },
        onMouseUp: (event) => {
            modalOverlayMouseUpRef.current = event.target === event.currentTarget
        },
        onClick: (event) => {
            const shouldClose =
                event.target === event.currentTarget &&
                modalOverlayMouseDownRef.current &&
                modalOverlayMouseUpRef.current

            modalOverlayMouseDownRef.current = false
            modalOverlayMouseUpRef.current = false

            if (shouldClose) {
                closeFn()
            }
        },
    }), [])

    const openDetailModal = useCallback((task) => {
        dismissActiveOverlayUi()
        setSelectedTask(task)
        setIsDetailOpen(true)
    }, [dismissActiveOverlayUi])

    const closeDetailModal = useCallback(() => {
        setIsDetailOpen(false)
    }, [])

    const canTakeTaskFromDetail = hasTaskAction(selectedTask, 'ASSIGN')
    const canApproveTask = hasTaskAction(selectedTask, 'APPROVE')
    const canRejectTask = hasTaskAction(selectedTask, 'REJECT')
    const canRequestChanges = hasTaskAction(selectedTask, 'REQUEST_CHANGES')
    const canCommentTask = hasTaskAction(selectedTask, 'COMMENT') || Boolean(selectedTask)
    const canCancelTask = hasTaskAction(selectedTask, 'CANCEL')
    const canUploadAttachments = Boolean(selectedTask)
    const canEditEntity = canApproveTask && selectedTask?.assignee?.id === currentUserId
    const detailActionsCount = [
        canTakeTaskFromDetail,
        canApproveTask,
        canRequestChanges,
        canRejectTask,
        canCancelTask,
    ].filter(Boolean).length
    const detailFooterClassName = [
        'modal-footer',
        'modal-footer--wrap',
        'modal-footer--detail-actions',
        detailActionsCount === 3 && canCancelTask ? 'modal-footer--detail-actions-has-cancel-row' : '',
    ].filter(Boolean).join(' ')
    const statsCards = [
        {
            key: 'open',
            label: 'Открытых задач',
            value: dashboardStats?.openCount,
        },
        {
            key: 'in-progress',
            label: 'В работе',
            value: dashboardStats?.inProgressCount,
        },
        {
            key: 'mine',
            label: 'Мои задачи',
            value: dashboardStats?.myInProgressCount,
        },
    ]

    return (
        <DashboardLayout title="Панель модерации" subtitle="Управление задачами и верификация">
            <div className="moderation-stats">
                {statsCards.map((item) => (
                    <div key={item.key} className="stat-card">
                        <div className="stat-card__value">{Number.isFinite(item.value) ? item.value : '—'}</div>
                        <div className="stat-card__label">{item.label}</div>
                    </div>
                ))}
            </div>

            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'tasks' ? 'is-active' : ''}`} onClick={() => setActiveTab('tasks')}>
                    Задачи
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'history' ? 'is-active' : ''}`} onClick={() => setActiveTab('history')}>
                    История
                </button>
                {isAdmin && (
                    <button className={`dashboard-tabs__btn ${activeTab === 'create' ? 'is-active' : ''}`} onClick={() => setActiveTab('create')}>
                        Создать куратора
                    </button>
                )}
                <button className={`dashboard-tabs__btn ${activeTab === 'tags' ? 'is-active' : ''}`} onClick={() => setActiveTab('tags')}>
                    Теги
                </button>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'tasks' && (
                    <>
                        <div className="moderation-filters moderation-filters--extended">
                            <div className="moderation-filters__section moderation-filters__section--main">
                                <div className="moderation-filter-input">
                                    <Label>Статус</Label>
                                    <CustomSelect value={filters.status} onChange={(value) => setFilters((prev) => ({ ...prev, status: value }))} options={TASK_STATUSES} placeholder="Все статусы" />
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Тип задачи</Label>
                                    <CustomSelect value={filters.taskType} onChange={(value) => setFilters((prev) => ({ ...prev, taskType: value }))} options={TASK_TYPES} placeholder="Все типы задач" />
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Тип сущности</Label>
                                    <CustomSelect value={filters.entityType} onChange={(value) => setFilters((prev) => ({ ...prev, entityType: value }))} options={ENTITY_TYPES} placeholder="Все типы сущностей" />
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Приоритет</Label>
                                    <CustomSelect value={filters.priority} onChange={(value) => setFilters((prev) => ({ ...prev, priority: value }))} options={PRIORITIES} placeholder="Все приоритеты" />
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>ID назначенного куратора</Label>
                                    <Input value={filters.assigneeUserId} onChange={(e) => setFilters((prev) => ({ ...prev, assigneeUserId: e.target.value }))} placeholder="Например, 12" />
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Сортировка</Label>
                                    <CustomSelect value={filters.sort} onChange={(value) => setFilters((prev) => ({ ...prev, sort: value }))} options={SORT_OPTIONS} placeholder="Выберите сортировку" />
                                </div>
                            </div>

                            <div className="moderation-filters__section moderation-filters__section--dates">
                                <div className="moderation-filter-input">
                                    <Label>Создано от</Label>
                                    <Input type="datetime-local" value={filters.createdFrom}
                                           onChange={(e) => setFilters((prev) => ({
                                               ...prev,
                                               createdFrom: e.target.value
                                           }))}/>
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Создано до</Label>
                                    <Input type="datetime-local" value={filters.createdTo}
                                           onChange={(e) => setFilters((prev) => ({
                                               ...prev,
                                               createdTo: e.target.value
                                           }))}/>
                                </div>

                                <div className="moderation-filter-input">
                                    <Label>Быстрый фильтр</Label>
                                    <CustomSelect
                                        value={filters.mine ? 'mine' : 'all'}
                                        onChange={(value) => setFilters((prev) => ({...prev, mine: value === 'mine'}))}
                                        options={[
                                            {value: 'all', label: 'Все задачи'},
                                            {value: 'mine', label: 'Только мои задачи'}
                                        ]}
                                    />
                                </div>
                            </div>

                            <div className="filter-actions filter-actions--filters">
                                <Button className="button--ghost" onClick={resetFilters}>Сбросить</Button>
                                <Button className="button--ghost" onClick={() => {
                                    dismissActiveOverlayUi();
                                    setIsManualTaskModalOpen(true)
                                }}>Создать задачу</Button>
                            </div>
                        </div>

                        <div className="moderation-tasks">
                            {isLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Загрузка задач...</p>
                                </div>
                            ) : tasks.items?.length === 0 ? (
                                <div className="empty-state">
                                    <p>Нет задач для модерации</p>
                                    <span>Все задачи обработаны</span>
                                </div>
                            ) : (
                                <div className="tasks-list">
                                    {tasks.items.map((task) => (
                                        <div key={task.id} className={`task-card ${getPriorityClass(task.priority)} ${getStatusClass(task.status)}`}>
                                            <div className="task-card__header">
                                                <div className="task-card__info">
                                                    <span className="task-type">{getTaskTypeLabel(task.taskType)}</span>
                                                    <span className={`task-status ${getStatusClass(task.status)}`}>{getStatusLabel(task.status)}</span>
                                                    <span className={`task-priority ${getPriorityClass(task.priority)}`}>{getPriorityLabel(task.priority)}</span>
                                                </div>
                                                <button className="task-card__view" onClick={() => handleOpenTask(task.id)}>
                                                    <img src={eyeIcon} alt="" className="icon" />
                                                    <span>Просмотр</span>
                                                </button>
                                            </div>
                                            <div className="task-card__body">
                                                <h4>{getEntityTypeLabel(task.entityType)}</h4>
                                                <p className="task-id">ID: {task.entityId}</p>
                                                <p className="task-snapshot">{task.snapshotSummary || 'Нет описания'}</p>
                                            </div>
                                            <div className="task-card__footer">
                                                <span className="task-date">{formatDate(task.createdAt)}</span>
                                                {task.assignee && <span className="task-assignee">Модератор: {task.assignee.displayName}</span>}
                                                {task.status === 'OPEN' && !task.assignee && (
                                                    <button className="task-assign-btn" onClick={() => handleAssignToMe(task.id)}>
                                                        Взять в работу
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {tasks.totalPages > 1 && (
                            <div className="pagination">
                                <button disabled={pagination.page === 0} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}>← Назад</button>
                                <span>{pagination.page + 1} / {tasks.totalPages}</span>
                                <button disabled={pagination.page + 1 >= tasks.totalPages} onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}>Вперёд →</button>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="moderation-history">
                        <div className="history-filters">
                            <div className="filter-group filter-group--search">
                                <label>Поиск</label>
                                <input type="text" value={historyFilters.search} onChange={(e) => setHistoryFilters((prev) => ({ ...prev, search: e.target.value, page: 0 }))} placeholder="ID, действие, комментарий" />
                            </div>
                            <div className="filter-group filter-group--sort">
                                <label>Сортировка</label>
                                <CustomSelect value={historyFilters.sort} onChange={(value) => setHistoryFilters((prev) => ({ ...prev, sort: value, page: 0 }))} options={SORT_OPTIONS} />
                            </div>
                        </div>

                        <div className="history-list">
                            {isHistoryLoading ? (
                                <div className="loading-state"><div className="spinner"></div><p>Загрузка истории...</p></div>
                            ) : allHistory.length === 0 ? (
                                <div className="empty-state"><p>История модерации пуста</p></div>
                            ) : (
                                <>
                                    {allHistory.map((item, index) => (
                                        <div key={`${item.taskId}-${item.id}-${index}`} className="history-item history-item--compact">
                                            <div className="history-item__header">
                                                <span className="history-action">{getActionLabel(item.action)}</span>
                                                <span className="history-date">{formatDate(item.createdAt)}</span>
                                            </div>
                                            <div className="history-item__body">
                                                <div className="history-item__chips">
                                                    <span className="history-chip">Задача #{item.taskId}</span>
                                                    <span className="history-chip">{getTaskTypeLabel(item.taskType)}</span>
                                                    <span className="history-chip">{getEntityTypeLabel(item.entityType)} #{item.entityId}</span>
                                                </div>
                                                <p><strong>Модератор:</strong> {item.actor?.displayName || 'Система'}</p>
                                                {item.payload?.comment && <p><strong>Комментарий:</strong> {item.payload.comment}</p>}
                                                {item.payload?.text && <p><strong>Комментарий:</strong> {item.payload.text}</p>}
                                                {item.payload?.reasonCode && <p><strong>Причина:</strong> {item.payload.reasonCode}</p>}
                                            </div>
                                        </div>
                                    ))}

                                    {historyTotalPages > 1 && (
                                        <div className="pagination">
                                            <button disabled={historyFilters.page === 0} onClick={() => setHistoryFilters((prev) => ({ ...prev, page: prev.page - 1 }))}>← Назад</button>
                                            <span>{historyFilters.page + 1} / {historyTotalPages}</span>
                                            <button disabled={historyFilters.page + 1 >= historyTotalPages} onClick={() => setHistoryFilters((prev) => ({ ...prev, page: prev.page + 1 }))}>Вперёд →</button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'create' && currentUser?.role === 'ADMIN' && (
                    <div className="curator-card">
                        <h3>Создать куратора</h3>
                        <div className="curator-create-form">
                            <div className="curator-create-form__field">
                                <Label>Email <span className="required-star">*</span></Label>
                                <Input type="email" value={newCuratorEmail} onChange={(e) => setNewCuratorEmail(e.target.value)} placeholder="curator@example.com" />
                            </div>
                            <div className="curator-create-form__field">
                                <Label>Имя <span className="required-star">*</span></Label>
                                <Input value={newCuratorName} onChange={(e) => setNewCuratorName(e.target.value)} placeholder="Иван Кураторов" />
                            </div>
                            <div className="curator-create-form__field">
                                <Label>Пароль <span className="required-star">*</span></Label>
                                <Input type="password" value={newCuratorPassword} onChange={(e) => setNewCuratorPassword(e.target.value)} placeholder="•••••••• (8-16 символов)" />
                                <span className="field-hint">Длина пароля: от 8 до 16 символов</span>
                            </div>
                            <Button className="button--primary" onClick={handleCreateCurator} disabled={isCreating}>
                                {isCreating ? 'Создание...' : 'Создать куратора'}
                            </Button>
                        </div>
                    </div>
                )}

                {activeTab === 'tags' && <CuratorTagsPage />}
            </div>

            {isDetailOpen && (
                <div className="modal-overlay" {...getOverlayHandlers(closeDetailModal)}>
                    <div className="modal-content moderation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Детали задачи #{selectedTask.id}</h3>
                            <button className="modal-close" onClick={closeDetailModal}>×</button>
                        </div>

                        <div className="modal-body" ref={detailModalBodyRef}>
                            {isDetailLoading || !selectedTask?.entityType ? (
                                <div className="task-detail-skeleton">
                                    <div className="skeleton skeleton--title"></div>
                                    <div className="skeleton-grid">
                                        <div className="skeleton skeleton--row"></div>
                                        <div className="skeleton skeleton--row"></div>
                                        <div className="skeleton skeleton--row"></div>
                                        <div className="skeleton skeleton--row"></div>
                                    </div>
                                    <div className="skeleton skeleton--card"></div>
                                    <div className="skeleton skeleton--card"></div>
                                    <div className="skeleton skeleton--card"></div>
                                </div>
                            ) : (
                                <>
                                    <div className="task-detail-info">
                                        <div className="info-row"><span className="info-label">Тип задачи:</span><span className="info-value">{getTaskTypeLabel(selectedTask.taskType)}</span></div>
                                        <div className="info-row"><span className="info-label">Сущность:</span><span className="info-value">{getEntityTypeLabel(selectedTask.entityType)}</span></div>
                                        <div className="info-row"><span className="info-label">Статус:</span><span className={`info-value status-badge ${getStatusClass(selectedTask.status)}`}>{getStatusLabel(selectedTask.status)}</span></div>
                                        <div className="info-row"><span className="info-label">Приоритет:</span><span className={`info-value priority-badge ${getPriorityClass(selectedTask.priority)}`}>{getPriorityLabel(selectedTask.priority)}</span></div>
                                        <div className="info-row"><span className="info-label">Создано:</span><span className="info-value">{formatDate(selectedTask.createdAt)}</span></div>
                                        {selectedTask.assignee && <div className="info-row"><span className="info-label">Модератор:</span><span className="info-value">{selectedTask.assignee.displayName}</span></div>}
                                        {Array.isArray(selectedTask.availableActions) && (
                                            <div className="info-row info-row--stacked">
                                                <span className="info-label">Доступные действия:</span>
                                                <div className="history-item__chips">
                                                    {selectedTask.availableActions.map((action) => (
                                                        <span key={action} className="history-chip">{action}</span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {canEditEntity && (
                                        <div className="moderation-entity-actions">
                                            <Button
                                                className="button--ghost"
                                                onClick={() =>
                                                    setIsEditingEntity((prev) => {
                                                        const next = !prev
                                                        if (next) {
                                                            scrollToEntityEditorStart()
                                                        }
                                                        return next
                                                    })
                                                }
                                            >
                                                {isEditingEntity ? 'Скрыть редактор' : 'Исправить данные перед одобрением'}
                                            </Button>
                                        </div>
                                    )}

                                    <PreviewBlock
                                        title="Исходные данные"
                                        entityType={selectedTask.entityType}
                                        snapshot={selectedTask.createdSnapshot}
                                        draft={isEditingEntity ? entityDraft : null}
                                        compareSnapshot={selectedTask.currentEntityState || null}
                                        highlightAll={!selectedTask.currentEntityState}
                                    />
                                    {selectedTask.currentEntityState && JSON.stringify(selectedTask.currentEntityState) !== JSON.stringify(selectedTask.createdSnapshot) && (
                                        <PreviewBlock title="Актуальные данные сейчас" entityType={selectedTask.entityType} snapshot={selectedTask.currentEntityState} />
                                    )}

                                    {isEditingEntity && (
                                        <div className="task-detail-snapshot" ref={entityEditorRef}>
                                            <h4>Редактор сущности</h4>
                                            <p className="moderation-editor-note">Здесь можно скорректировать данные перед одобрением. Изменения применятся только после подтверждения.</p>
                                            <EntityEditor entityType={selectedTask.entityType} originalSnapshot={selectedTask.createdSnapshot} draft={entityDraft} onChange={handleEntityDraftChange} />
                                        </div>
                                    )}

                                    {isEditingEntity && (
                                        <div className="task-detail-snapshot moderation-editor-block">
                                            <div className="moderation-editor-summary">Будет изменено полей: {Object.keys(entityPatch).length}</div>
                                            {!fieldDiffRows.length ? (
                                                <div className="moderation-attachments__empty">Изменений пока нет.</div>
                                            ) : (
                                                <div className="moderation-diff-list">
                                                    {fieldDiffRows.map((row) => (
                                                        <div key={row.key} className="moderation-diff-row">
                                                            <div className="moderation-diff-row__label">{row.label}</div>
                                                            <div className="moderation-diff-row__values">
                                                                <div><span>Было:</span> {renderDiffValue(row.before)}</div>
                                                                <div><span>Станет:</span> {renderDiffValue(row.after)}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <details className="moderation-patch-details">
                                                <summary>Показать технические изменения</summary>
                                                <pre className="snapshot-content">{JSON.stringify(entityPatch, null, 2)}</pre>
                                            </details>
                                        </div>
                                    )}

                                    <div className="task-detail-snapshot">
                                        <div className="moderation-section-header">
                                            <div>
                                                <h4>Добавить файл к задаче</h4>
                                                <p className="moderation-section-hint">Здесь можно прикрепить пояснения, скриншоты и другие материалы именно по этой задаче модерации.</p>
                                            </div>
                                            {canUploadAttachments && (
                                                <label className="moderation-upload-button">
                                                    <input type="file" onChange={handleTaskAttachmentUpload} disabled={uploadingAttachment} hidden />
                                                    <span>{uploadingAttachment ? 'Загрузка...' : 'Загрузить файл'}</span>
                                                </label>
                                            )}
                                        </div>
                                    </div>

                                    <details className="moderation-accordion" open>
                                        <summary className="moderation-accordion__summary">
                                            <span>Файлы задачи</span>
                                            <span className="moderation-accordion__meta">{selectedTask.attachments?.length || 0}</span>
                                        </summary>
                                        <div className="moderation-accordion__body">
                                            <AttachmentList
                                                title={null}
                                                description="Эти файлы относятся только к текущей задаче модерации и не являются файлами записи."
                                                attachments={selectedTask.attachments}
                                                onOpen={handleOpenTaskAttachment}
                                                onDelete={handleDeleteTaskAttachment}
                                                allowDelete={true}
                                                emptyText="У задачи пока нет вложений."
                                            />
                                        </div>
                                    </details>

                                    <details className="moderation-accordion">
                                        <summary className="moderation-accordion__summary">
                                            <span>Файлы сущности</span>
                                            <span className="moderation-accordion__meta">{entityAttachments.length}</span>
                                        </summary>
                                        <div className="moderation-accordion__body">
                                            <AttachmentList
                                                title={null}
                                                description="Здесь показываются файлы, которые уже прикреплены к записи: например, резюме, логотип, медиа или документы верификации."
                                                attachments={entityAttachments}
                                                emptyText="У этой записи пока нет файлов."
                                            />
                                        </div>
                                    </details>

                                    <details className="moderation-accordion">
                                        <summary className="moderation-accordion__summary">
                                            <span>История действий</span>
                                            <span className="moderation-accordion__meta">{taskHistory.length}</span>
                                        </summary>
                                        <div className="moderation-accordion__body">
                                            <div className="task-detail-history">
                                                {!taskHistory.length ? (
                                                    <div className="moderation-empty-state">История по этой задаче пока пуста.</div>
                                                ) : (
                                                    <div className="history-timeline">
                                                        {taskHistory.map((item) => (
                                                            <div key={item.id} className="timeline-item timeline-item--compact">
                                                                <div className="timeline-dot"></div>
                                                                <div className="timeline-content">
                                                                    <div className="timeline-header">
                                                                        <span className="timeline-action">{getActionLabel(item.action)}</span>
                                                                        <span className="timeline-date">{formatDate(item.createdAt)}</span>
                                                                    </div>
                                                                    <p className="timeline-actor">{item.actor?.displayName || 'Система'}</p>
                                                                    {item.payload?.text && <p className="timeline-comment">{item.payload.text}</p>}
                                                                    {item.payload?.comment && !item.payload?.text && <p className="timeline-comment">{item.payload.comment}</p>}
                                                                    {Array.isArray(item.payload?.fieldIssues) && item.payload.fieldIssues.length > 0 && (
                                                                        <div className="moderation-field-issues-preview">
                                                                            {item.payload.fieldIssues.map((issue, index) => (
                                                                                <div key={`${issue.field}-${index}`} className="moderation-field-issue-pill">
                                                                                    <strong>{issue.field}</strong>: {issue.message}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </details>

                                    <div className="task-detail-snapshot">
                                        <h4>Подготовленные изменения</h4>
                                        {!isEditingEntity ? (
                                            <div className="moderation-empty-state">Изменения пока не подготовлены. Откройте редактор, чтобы сравнить и скорректировать данные перед одобрением.</div>
                                        ) : !fieldDiffRows.length ? (
                                            <div className="moderation-empty-state">Изменений пока нет.</div>
                                        ) : null}
                                    </div>

                                    {canCommentTask && (
                                        <div className="task-detail-comments">
                                            <h4>Добавить комментарий</h4>
                                            <Textarea rows={3} value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Напишите комментарий..." className="comment-textarea" />
                                            <Button className="button--outline" onClick={handleAddComment} disabled={!newComment.trim()}>Отправить</Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        <div className={detailFooterClassName}>
                            {canTakeTaskFromDetail && (
                                <Button className="button--primary" onClick={() => handleAssignToMe(selectedTask.id)}>Взять в работу</Button>
                            )}
                            {canApproveTask && (
                                <Button className="button--primary" onClick={() => { dismissActiveOverlayUi(); setIsApproveModalOpen(true) }}>Одобрить</Button>
                            )}
                            {canRequestChanges && (
                                <Button className="button--ghost" onClick={() => { dismissActiveOverlayUi(); setIsRequestChangesModalOpen(true) }}>Запросить правки</Button>
                            )}
                            {canRejectTask && (
                                <Button className="button--danger" onClick={() => { dismissActiveOverlayUi(); setIsRejectModalOpen(true) }}>Отклонить</Button>
                            )}
                            {canCancelTask && (
                                <Button className="button--ghost button--cancel-task" onClick={handleCancelTask}>Отменить задачу</Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {imagePreview && (
                <div className="modal-overlay" {...getOverlayHandlers(() => setImagePreview(null))}>
                    <div className="modal-content moderation-image-preview-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Предпросмотр файла</h3>
                            <button className="modal-close" onClick={() => setImagePreview(null)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="moderation-image-preview">
                                <img src={imagePreview.url} alt={imagePreview.fileName} className="moderation-image-preview__image" />
                            </div>
                            <div className="moderation-image-preview__footer">
                                <div className="moderation-image-preview__name">{imagePreview.fileName}</div>
                                <Button className="button--ghost" onClick={() => window.open(imagePreview.url, '_blank', 'noopener,noreferrer')}>Открыть в новой вкладке</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isApproveModalOpen && (
                <div className="modal-overlay" {...getOverlayHandlers(() => setIsApproveModalOpen(false))}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Одобрение задачи</h3>
                            <button className="modal-close" onClick={() => setIsApproveModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body modal-body--form">
                            <div className="modal-field modal-field--full">
                                <Label>Комментарий <span className="required-star">*</span></Label>
                                <Textarea rows={3} value={approveComment} onChange={(e) => setApproveComment(e.target.value)} placeholder="Пояснение к решению..." className="moderation-full-width-textarea" />
                                <p className="moderation-editor-note">Исправления из редактора будут применены после одобрения.</p>
                            </div>

                            <div className="moderation-editor-summary">Изменено полей: {Object.keys(entityPatch).length}</div>

                            <details className="moderation-patch-details">
                                <summary>Показать технические данные</summary>
                                <pre className="snapshot-content">{JSON.stringify(entityPatch, null, 2)}</pre>
                            </details>
                        </div>
                        <div className="modal-footer modal-footer--wrap">
                            <Button className="button--primary" onClick={handleApprove} disabled={!approveComment.trim()}>Подтвердить</Button>
                            <Button className="button--ghost" onClick={() => setIsApproveModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}

            {isRejectModalOpen && (
                <div className="modal-overlay" {...getOverlayHandlers(() => setIsRejectModalOpen(false))}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Отклонение задачи</h3>
                            <button className="modal-close" onClick={() => setIsRejectModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body modal-body--form">
                            <div className="manual-task-form-grid">
                                <div className="modal-field">
                                    <Label>Причина <span className="required-star">*</span></Label>
                                    <CustomSelect value={rejectReason} onChange={setRejectReason} options={REJECT_REASON_OPTIONS} placeholder="Выберите причину" />
                                </div>

                                <div className="modal-field">
                                    <Label>Уровень важности <span className="required-star">*</span></Label>
                                    <CustomSelect value={rejectSeverity} onChange={setRejectSeverity} options={SEVERITY_OPTIONS} />
                                </div>

                                <div className="modal-field modal-field--full">
                                    <Label>Комментарий <span className="required-star">*</span></Label>
                                    <Textarea rows={3} value={rejectComment} onChange={(e) => setRejectComment(e.target.value)} placeholder="Пояснение причины отказа..." />
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer modal-footer--wrap">
                            <Button className="button--danger" onClick={handleReject} disabled={!rejectReason.trim() || !rejectComment.trim()}>Отклонить</Button>
                            <Button className="button--ghost" onClick={() => setIsRejectModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}

            {isRequestChangesModalOpen && (
                <div className="modal-overlay" {...getOverlayHandlers(() => setIsRequestChangesModalOpen(false))}>
                    <div className="modal-content moderation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Запросить правки</h3>
                            <button className="modal-close" onClick={() => setIsRequestChangesModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body modal-body--form">
                            <div className="manual-task-form-grid">
                                <div className="modal-field">
                                    <Label>Причина <span className="required-star">*</span></Label>
                                    <CustomSelect value={requestChangesReason} onChange={setRequestChangesReason} options={REQUEST_CHANGE_REASON_OPTIONS} placeholder="Выберите причину" />
                                </div>

                                <div className="modal-field modal-field--full">
                                    <Label>Комментарий <span className="required-star">*</span></Label>
                                    <Textarea rows={3} value={requestChangesComment} onChange={(e) => setRequestChangesComment(e.target.value)} placeholder="Что именно нужно исправить" />
                                </div>

                                <div className="modal-field modal-field--full">
                                    <CustomCheckbox checked={notifyUserAboutChanges} onChange={setNotifyUserAboutChanges} label="Уведомить пользователя" />
                                </div>
                            </div>

                            <div className="moderation-field-issues">
                                <div className="moderation-section-header moderation-section-header--stack">
                                    <div>
                                        <h4>Что нужно исправить</h4>
                                        <p className="moderation-section-hint">Добавь замечания по каждому полю отдельно, чтобы пользователю было проще внести правки.</p>
                                    </div>
                                    <Button className="button--ghost" onClick={addFieldIssue}>Добавить замечание</Button>
                                </div>

                                {fieldIssues.map((issue, index) => (
                                    <div key={index} className="moderation-field-issue-card">
                                        <div className="moderation-field-issue-card__top">
                                            <div className="moderation-field-issue-card__index">Замечание #{index + 1}</div>
                                            <Button className="button--danger button--compact" onClick={() => removeFieldIssue(index)} disabled={fieldIssues.length === 1}>Удалить</Button>
                                        </div>
                                        <div className="moderation-field-issue-card__grid">
                                            <div className="modal-field">
                                                <Label>Поле</Label>
                                                <Input value={issue.field} onChange={(e) => updateFieldIssue(index, 'field', e.target.value)} placeholder="Например, название компании" />
                                            </div>
                                            <div className="modal-field">
                                                <Label>Код причины</Label>
                                                <CustomSelect
                                                    value={issue.code || ''}
                                                    onChange={(value) => updateFieldIssue(index, 'code', value)}
                                                    options={REQUEST_CHANGE_REASON_OPTIONS.filter((item) => item.value)}
                                                    placeholder="Выберите код причины"
                                                />
                                            </div>
                                        </div>
                                        <div className="modal-field">
                                            <Label>Сообщение</Label>
                                            <Textarea rows={3} value={issue.message} onChange={(e) => updateFieldIssue(index, 'message', e.target.value)} placeholder="Что нужно исправить в поле" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                        <div className="modal-footer modal-footer--wrap">
                            <Button className="button--primary" onClick={handleRequestChanges}>Отправить на правки</Button>
                            <Button className="button--ghost" onClick={() => setIsRequestChangesModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}

            {isManualTaskModalOpen && (
                <div className="modal-overlay" {...getOverlayHandlers(() => setIsManualTaskModalOpen(false))}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Создать ручную задачу</h3>
                            <button className="modal-close" onClick={() => setIsManualTaskModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body modal-body--form">
                            <div className="manual-task-form-grid">
                                <div className="modal-field">
                                    <Label>Тип записи <span className="required-star">*</span></Label>
                                    <CustomSelect value={manualTaskForm.entityType} onChange={(value) => setManualTaskForm((prev) => ({ ...prev, entityType: value }))} options={ENTITY_TYPES.filter((item) => item.value)} />
                                    <p className="modal-field__hint modal-field__hint--placeholder">.</p>
                                </div>
                                <div className="modal-field">
                                    <Label>ID записи <span className="required-star">*</span></Label>
                                    <Input className="input--without-number-arrows" type="number" value={manualTaskForm.entityId} onChange={(e) => setManualTaskForm((prev) => ({ ...prev, entityId: e.target.value }))} placeholder="Например, 123" />
                                    <p className="modal-field__hint">Укажите ID самой записи. Для профиля соискателя нужен ID профиля, а не ID пользователя.</p>
                                </div>
                                <div className="modal-field">
                                    <Label>Тип задачи <span className="required-star">*</span></Label>
                                    <CustomSelect value={manualTaskForm.taskType} onChange={(value) => setManualTaskForm((prev) => ({ ...prev, taskType: value }))} options={TASK_TYPES.filter((item) => item.value)} />
                                    <p className="modal-field__hint modal-field__hint--placeholder">.</p>
                                </div>
                                <div className="modal-field">
                                    <Label>Приоритет <span className="required-star">*</span></Label>
                                    <CustomSelect value={manualTaskForm.priority} onChange={(value) => setManualTaskForm((prev) => ({ ...prev, priority: value }))} options={PRIORITIES.filter((item) => item.value)} />
                                    <p className="modal-field__hint modal-field__hint--placeholder">.</p>
                                </div>
                                <div className="modal-field modal-field--full">
                                    <Label>Комментарий <span className="required-star">*</span></Label>
                                    <Textarea rows={3} value={manualTaskForm.comment} onChange={(e) => setManualTaskForm((prev) => ({ ...prev, comment: e.target.value }))} placeholder="Почему задача создаётся вручную" />
                                    <p className="modal-field__hint modal-field__hint--placeholder">.</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer modal-footer--wrap">
                            <Button className="button--primary" onClick={handleManualTaskCreate}>Создать</Button>
                            <Button className="button--ghost" onClick={() => setIsManualTaskModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default CuratorDashboard
