import { useState, useEffect, useCallback, useMemo } from 'react'
import { useToast } from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import Textarea from '../../../components/Textarea'
import Label from '../../../components/Label'
import CustomSelect from '../../../components/CustomSelect'
import CustomCheckbox from '../../../components/CustomCheckbox'
import { getSessionUser, subscribeSessionChange } from '../../../utils/sessionStore'
import { createCurator } from '../../../api/admin'
import {
    getModerationDashboard,
    getModerationTasks,
    getModerationTaskDetail,
    approveModerationTask,
    rejectModerationTask,
    assignModerationTask,
    addModerationComment,
    cancelModerationTask,
    getEntityModerationHistory,
    TASK_TYPES,
    SEVERITY_OPTIONS,
    SORT_OPTIONS
} from '../../../api/moderation'
import {
    formatDate,
    getPriorityLabel,
    getPriorityClass,
    getStatusLabel,
    getStatusClass,
    getEntityTypeLabel,
    getTaskTypeLabel,
    getActionLabel,
    deepClone,
    buildChangedFieldsPatch,
    getEditableFieldsByEntityType,
    getPreviewFieldsByEntityType,
} from '../../../utils/moderationHelpers'
import '../DashboardBase.scss'
import './CuratorDashboard.scss'

import eyeIcon from '../../../assets/icons/eye.svg'

const STATUS_OPTIONS = [
    { value: '', label: 'Все статусы' },
    { value: 'OPEN', label: 'Открытые' },
    { value: 'IN_PROGRESS', label: 'В работе' },
    { value: 'APPROVED', label: 'Одобренные' },
    { value: 'REJECTED', label: 'Отклонённые' },
]

const PRIORITY_OPTIONS = [
    { value: '', label: 'Все приоритеты' },
    { value: 'LOW', label: 'Низкий' },
    { value: 'MEDIUM', label: 'Средний' },
    { value: 'HIGH', label: 'Высокий' },
]

const ENTITY_TYPE_OPTIONS = [
    { value: '', label: 'Все типы' },
    { value: 'EMPLOYER_PROFILE', label: 'Профиль работодателя' },
    { value: 'EMPLOYER_VERIFICATION', label: 'Верификация компании' },
    { value: 'OPPORTUNITY', label: 'Вакансия/Возможность' },
    { value: 'TAG', label: 'Тег' },
]

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
                                    Было: {String(originalValue ?? '—')}
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
                            value={currentValue ?? ''}
                            onChange={(e) =>
                                onChange(
                                    field.key,
                                    field.type === 'number'
                                        ? (e.target.value === '' ? null : Number(e.target.value))
                                        : e.target.value
                                )
                            }
                        />
                        {isChanged && (
                            <div className="moderation-entity-editor__diff">
                                Было: {String(originalValue ?? '—')}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function PreviewBlock({ title, entityType, snapshot, draft = null }) {
    const fields = getPreviewFieldsByEntityType(entityType, snapshot)

    if (!fields.length) {
        return (
            <div className="task-detail-snapshot">
                <h4>{title}</h4>
                <pre className="snapshot-content">
                    {JSON.stringify(draft || snapshot || {}, null, 2)}
                </pre>
            </div>
        )
    }

    return (
        <div className="task-detail-snapshot">
            <h4>{title}</h4>
            <div className="snapshot-formatted">
                <div className="snapshot-fields">
                    {fields.map(([label, value]) => {
                        const draftValue = draft ? draft[label] : undefined
                        const isChanged = draft
                            ? JSON.stringify(value) !== JSON.stringify(draftValue)
                            : false

                        return (
                            <div key={label} className={`snapshot-field ${isChanged ? 'is-changed' : ''}`}>
                                <span className="field-label">{label}:</span>
                                <span className="field-value">{value || '—'}</span>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

function CuratorDashboard() {
    const [activeTab, setActiveTab] = useState('tasks')
    const [selectedTask, setSelectedTask] = useState(null)
    const [isLoading, setIsLoading] = useState(false)
    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const { toast } = useToast()

    const [filters, setFilters] = useState({
        status: '',
        taskType: '',
        entityType: '',
        priority: '',
        mine: false
    })
    const [pagination, setPagination] = useState({ page: 0, size: 20 })
    const [tasks, setTasks] = useState({ items: [], totalItems: 0, totalPages: 0 })
    const [dashboardStats, setDashboardStats] = useState(null)
    const [currentUser, setCurrentUser] = useState(null)

    const [historyFilters, setHistoryFilters] = useState({
        page: 0,
        size: 10,
        search: '',
        sort: 'createdAt,desc'
    })
    const [allHistory, setAllHistory] = useState([])
    const [historyTotalPages, setHistoryTotalPages] = useState(0)
    const [isHistoryLoading, setIsHistoryLoading] = useState(false)

    const [newCuratorEmail, setNewCuratorEmail] = useState('')
    const [newCuratorName, setNewCuratorName] = useState('')
    const [newCuratorPassword, setNewCuratorPassword] = useState('')
    const [isCreating, setIsCreating] = useState(false)

    const [approveComment, setApproveComment] = useState('')
    const [rejectComment, setRejectComment] = useState('')
    const [rejectReason, setRejectReason] = useState('')
    const [rejectSeverity, setRejectSeverity] = useState('NORMAL')
    const [isApproveModalOpen, setIsApproveModalOpen] = useState(false)
    const [isRejectModalOpen, setIsRejectModalOpen] = useState(false)

    const [newComment, setNewComment] = useState('')
    const [taskHistory, setTaskHistory] = useState([])

    const [isEditingEntity, setIsEditingEntity] = useState(false)
    const [entityDraft, setEntityDraft] = useState(null)

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
            const params = {
                page: pagination.page,
                size: pagination.size,
                status: filters.status || undefined,
                taskType: filters.taskType || undefined,
                entityType: filters.entityType || undefined,
                priority: filters.priority || undefined,
                mine: filters.mine || undefined
            }
            const data = await getModerationTasks(params)
            setTasks(data)
        } catch (error) {
            console.error('Failed to load tasks:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить задачи модерации',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }, [pagination, filters, toast])

    const loadAllHistory = useCallback(async () => {
        setIsHistoryLoading(true)
        try {
            const allTasksData = await getModerationTasks({
                page: 0,
                size: 100,
                search: historyFilters.search || undefined,
                sort: historyFilters.sort
            })

            let allActions = []

            for (const task of allTasksData.items || []) {
                try {
                    const history = await getEntityModerationHistory(task.entityType, task.entityId)
                    if (history && history.length > 0) {
                        const actionsWithTaskInfo = history.map(h => ({
                            ...h,
                            taskId: task.id,
                            taskType: task.taskType,
                            entityType: task.entityType,
                            entityId: task.entityId
                        }))
                        allActions.push(...actionsWithTaskInfo)
                    }
                } catch (err) {
                    console.warn(`Failed to load history for task ${task.id}:`, err)
                }
            }

            allActions.sort((a, b) => {
                const dateA = new Date(a.createdAt)
                const dateB = new Date(b.createdAt)
                return historyFilters.sort === 'createdAt,desc'
                    ? dateB - dateA
                    : dateA - dateB
            })

            const start = historyFilters.page * historyFilters.size
            const end = start + historyFilters.size
            const paginatedActions = allActions.slice(start, end)

            setAllHistory(paginatedActions)
            setHistoryTotalPages(Math.ceil(allActions.length / historyFilters.size))
        } catch (error) {
            console.error('Failed to load all history:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить историю',
                variant: 'destructive'
            })
        } finally {
            setIsHistoryLoading(false)
        }
    }, [historyFilters, toast])

    const loadTaskDetail = async (taskId) => {
        setIsLoading(true)
        try {
            const data = await getModerationTaskDetail(taskId)
            setSelectedTask(data)
            setEntityDraft(deepClone(data.createdSnapshot || {}))
            setIsEditingEntity(false)

            const history = await getEntityModerationHistory(data.entityType, data.entityId)
            setTaskHistory(history || [])
        } catch (error) {
            console.error('Failed to load task detail:', error)
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить детали задачи',
                variant: 'destructive'
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleOpenTask = async (taskId) => {
        await loadTaskDetail(taskId)
        setIsDetailOpen(true)
    }

    const handleAssignToMe = async (taskId) => {
        try {
            await assignModerationTask(taskId, {
                comment: 'Принято в работу'
            })
            toast({
                title: 'Задача назначена',
                description: 'Задача добавлена в ваши текущие'
            })
            loadTasks()
            if (selectedTask?.id === taskId) {
                await loadTaskDetail(taskId)
            }
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось назначить задачу',
                variant: 'destructive'
            })
        }
    }

    const handleEntityDraftChange = (key, value) => {
        setEntityDraft((prev) => ({
            ...(prev || {}),
            [key]: value,
        }))
    }

    const entityPatch = useMemo(() => {
        if (!selectedTask?.createdSnapshot || !entityDraft) return {}
        return buildChangedFieldsPatch(selectedTask.createdSnapshot, entityDraft)
    }, [selectedTask, entityDraft])

    const handleApprove = async () => {
        if (!selectedTask) return

        if (!approveComment.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Комментарий обязателен для заполнения',
                variant: 'destructive'
            })
            return
        }

        try {
            const payload = {
                comment: approveComment.trim(),
                reasonCode: 'APPROVED_BY_MODERATOR',
                applyPatch: entityPatch,
                notifyUser: true
            }

            await approveModerationTask(selectedTask.id, payload)

            toast({
                title: 'Задача одобрена',
                description: Object.keys(entityPatch).length > 0
                    ? 'Изменения применены и решение отправлено'
                    : 'Решение отправлено пользователю'
            })

            setIsApproveModalOpen(false)
            setApproveComment('')
            loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            console.error('Approve error:', error)
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось одобрить задачу',
                variant: 'destructive'
            })
        }
    }

    const handleReject = async () => {
        if (!selectedTask) return

        if (!rejectReason.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Причина отклонения обязательна для заполнения',
                variant: 'destructive'
            })
            return
        }

        if (!rejectComment.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Комментарий обязателен для заполнения',
                variant: 'destructive'
            })
            return
        }

        try {
            const payload = {
                comment: rejectComment.trim(),
                reasonCode: rejectReason.trim(),
                severity: rejectSeverity,
                notifyUser: true
            }

            await rejectModerationTask(selectedTask.id, payload)

            toast({
                title: 'Задача отклонена',
                description: 'Отказ отправлен пользователю'
            })

            setIsRejectModalOpen(false)
            setRejectComment('')
            setRejectReason('')
            setRejectSeverity('NORMAL')
            loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            console.error('Reject error:', error)
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отклонить задачу',
                variant: 'destructive'
            })
        }
    }

    const handleAddComment = async () => {
        if (!selectedTask || !newComment.trim()) return

        try {
            await addModerationComment(selectedTask.id, {
                text: newComment.trim()
            })
            toast({
                title: 'Комментарий добавлен',
                description: 'Комментарий сохранён'
            })
            setNewComment('')
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось добавить комментарий',
                variant: 'destructive'
            })
        }
    }

    const handleCancelTask = async () => {
        if (!selectedTask) return

        try {
            await cancelModerationTask(selectedTask.id)
            toast({
                title: 'Задача отменена',
                description: 'Задача больше не активна'
            })
            loadTasks()
            await loadTaskDetail(selectedTask.id)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отменить задачу',
                variant: 'destructive'
            })
        }
    }

    const handleCreateCurator = async () => {
        if (!newCuratorEmail.trim() || !newCuratorName.trim() || !newCuratorPassword.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Заполните все поля',
                variant: 'destructive'
            })
            return
        }

        if (newCuratorPassword.length < 8 || newCuratorPassword.length > 16) {
            toast({
                title: 'Ошибка',
                description: 'Пароль должен быть от 8 до 16 символов',
                variant: 'destructive'
            })
            return
        }

        setIsCreating(true)
        try {
            await createCurator({
                displayName: newCuratorName.trim(),
                email: newCuratorEmail.trim(),
                password: newCuratorPassword
            })
            toast({
                title: 'Куратор создан',
                description: `Куратор ${newCuratorName} успешно добавлен`
            })
            setNewCuratorEmail('')
            setNewCuratorName('')
            setNewCuratorPassword('')
        } catch (error) {
            console.error('Create curator error:', error)
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось создать куратора',
                variant: 'destructive'
            })
        } finally {
            setIsCreating(false)
        }
    }

    const handleHistorySearchChange = (e) => {
        setHistoryFilters(prev => ({ ...prev, search: e.target.value, page: 0 }))
    }

    const handleHistorySortChange = (value) => {
        setHistoryFilters(prev => ({ ...prev, sort: value, page: 0 }))
    }

    const goToHistoryPage = (newPage) => {
        setHistoryFilters(prev => ({ ...prev, page: newPage }))
    }

    const applyFilters = () => {
        setPagination(prev => ({ ...prev, page: 0 }))
        loadTasks()
    }

    const resetFilters = () => {
        setFilters({
            status: '',
            taskType: '',
            entityType: '',
            priority: '',
            mine: false
        })
        setPagination(prev => ({ ...prev, page: 0 }))
    }

    useEffect(() => {
        loadTasks()
        loadDashboardStats()
    }, [loadTasks, loadDashboardStats])

    useEffect(() => {
        loadTasks()
    }, [pagination.page])

    useEffect(() => {
        if (activeTab === 'history') {
            loadAllHistory()
        }
    }, [activeTab, historyFilters.page, historyFilters.search, historyFilters.sort, loadAllHistory])

    const isAdmin = currentUser?.role === 'ADMIN'
    const canModerateSelectedTask =
        selectedTask?.status === 'IN_PROGRESS' &&
        selectedTask?.assignee?.id === currentUser?.id

    return (
        <DashboardLayout title="Панель модерации" subtitle="Управление задачами и верификация">
            {dashboardStats && (
                <div className="moderation-stats">
                    <div className="stat-card">
                        <div className="stat-card__value">{dashboardStats.openCount || 0}</div>
                        <div className="stat-card__label">Открытых задач</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">{dashboardStats.inProgressCount || 0}</div>
                        <div className="stat-card__label">В работе</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-card__value">{dashboardStats.myInProgressCount || 0}</div>
                        <div className="stat-card__label">Мои задачи</div>
                    </div>
                </div>
            )}

            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'tasks' ? 'is-active' : ''}`} onClick={() => setActiveTab('tasks')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 12H15M9 16H15M17 21H7C5.9 21 5 20.1 5 19V5C5 3.9 5.9 3 7 3H12.6C12.8 3 13 3.1 13.1 3.2L18.8 8.9C18.9 9 19 9.2 19 9.4V19C19 20.1 18.1 21 17 21Z"/>
                        <path d="M13 3V9H19"/>
                    </svg>
                    Задачи
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'history' ? 'is-active' : ''}`} onClick={() => setActiveTab('history')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <circle cx="12" cy="12" r="10"/>
                        <polyline points="12 6 12 12 16 14"/>
                    </svg>
                    История
                </button>
                {isAdmin && (
                    <button className={`dashboard-tabs__btn ${activeTab === 'create' ? 'is-active' : ''}`} onClick={() => setActiveTab('create')}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M12 5v14M5 12h14" strokeLinecap="round"/>
                        </svg>
                        Создать куратора
                    </button>
                )}
            </div>

            <div className="dashboard-panel">
                {activeTab === 'tasks' && (
                    <>
                        <div className="moderation-filters">
                            <CustomSelect
                                value={filters.status}
                                onChange={(val) => setFilters(prev => ({ ...prev, status: val }))}
                                options={STATUS_OPTIONS}
                                placeholder="Статус"
                            />
                            <CustomSelect
                                value={filters.taskType}
                                onChange={(val) => setFilters(prev => ({ ...prev, taskType: val }))}
                                options={TASK_TYPES}
                                placeholder="Тип задачи"
                            />
                            <CustomSelect
                                value={filters.entityType}
                                onChange={(val) => setFilters(prev => ({ ...prev, entityType: val }))}
                                options={ENTITY_TYPE_OPTIONS}
                                placeholder="Тип сущности"
                            />
                            <CustomSelect
                                value={filters.priority}
                                onChange={(val) => setFilters(prev => ({ ...prev, priority: val }))}
                                options={PRIORITY_OPTIONS}
                                placeholder="Приоритет"
                            />
                            <CustomCheckbox
                                checked={filters.mine}
                                onChange={(val) => setFilters(prev => ({ ...prev, mine: val }))}
                                label="Мои задачи"
                            />
                            <div className="filter-actions">
                                <Button className="button--primary" onClick={applyFilters}>Применить</Button>
                                <Button className="button--ghost" onClick={resetFilters}>Сбросить</Button>
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
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <path d="M9 12H15M9 16H15M17 21H7C5.9 21 5 20.1 5 19V5C5 3.9 5.9 3 7 3H12.6C12.8 3 13 3.1 13.1 3.2L18.8 8.9C18.9 9 19 9.2 19 9.4V19C19 20.1 18.1 21 17 21Z"/>
                                        <path d="M13 3V9H19"/>
                                    </svg>
                                    <p>Нет задач для модерации</p>
                                    <span>Все задачи обработаны</span>
                                </div>
                            ) : (
                                <div className="tasks-list">
                                    {tasks.items.map(task => (
                                        <div key={task.id} className={`task-card ${getPriorityClass(task.priority)}`}>
                                            <div className="task-card__header">
                                                <div className="task-card__info">
                                                    <span className="task-type">{getTaskTypeLabel(task.taskType)}</span>
                                                    <span className={`task-status ${getStatusClass(task.status)}`}>
                                                        {getStatusLabel(task.status)}
                                                    </span>
                                                    <span className={`task-priority ${getPriorityClass(task.priority)}`}>
                                                        {getPriorityLabel(task.priority)}
                                                    </span>
                                                </div>
                                                <button
                                                    className="task-card__view"
                                                    onClick={() => handleOpenTask(task.id)}
                                                >
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
                                                {task.assignee && (
                                                    <span className="task-assignee">Модератор: {task.assignee.displayName}</span>
                                                )}
                                                {task.status === 'OPEN' && !task.assignee && (
                                                    <button
                                                        className="task-assign-btn"
                                                        onClick={() => handleAssignToMe(task.id)}
                                                    >
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
                                <button
                                    disabled={pagination.page === 0}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                                >
                                    ← Назад
                                </button>
                                <span>{pagination.page + 1} / {tasks.totalPages}</span>
                                <button
                                    disabled={pagination.page + 1 >= tasks.totalPages}
                                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                                >
                                    Вперёд →
                                </button>
                            </div>
                        )}
                    </>
                )}

                {activeTab === 'history' && (
                    <div className="moderation-history">
                        <div className="history-filters">
                            <div className="filter-group filter-group--search">
                                <label>Поиск по задаче</label>
                                <input
                                    type="text"
                                    value={historyFilters.search}
                                    onChange={handleHistorySearchChange}
                                    placeholder="ID задачи или название"
                                />
                            </div>
                            <div className="filter-group filter-group--sort">
                                <label>Сортировка</label>
                                <CustomSelect
                                    value={historyFilters.sort}
                                    onChange={handleHistorySortChange}
                                    options={SORT_OPTIONS}
                                />
                            </div>
                        </div>

                        <div className="history-list">
                            {isHistoryLoading ? (
                                <div className="loading-state">
                                    <div className="spinner"></div>
                                    <p>Загрузка истории...</p>
                                </div>
                            ) : allHistory.length === 0 ? (
                                <div className="empty-state">
                                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                        <circle cx="12" cy="12" r="10"/>
                                        <polyline points="12 6 12 12 16 14"/>
                                    </svg>
                                    <p>История модерации пуста</p>
                                    <span>Здесь будут отображаться все действия модераторов</span>
                                </div>
                            ) : (
                                <>
                                    {allHistory.map((item, index) => (
                                        <div key={`${item.taskId}-${item.id}-${index}`} className="history-item">
                                            <div className="history-item__header">
                                                <span className="history-action">{getActionLabel(item.action)}</span>
                                                <span className="history-date">{formatDate(item.createdAt)}</span>
                                            </div>
                                            <div className="history-item__body">
                                                <p><strong>Модератор:</strong> {item.actor?.displayName || 'Система'}</p>
                                                <p><strong>Задача:</strong> {getTaskTypeLabel(item.taskType)} (ID: {item.taskId})</p>
                                                <p><strong>Сущность:</strong> {getEntityTypeLabel(item.entityType)} #{item.entityId}</p>
                                                {item.payload?.comment && (
                                                    <p><strong>Комментарий:</strong> {item.payload.comment}</p>
                                                )}
                                                {item.payload?.text && (
                                                    <p><strong>Комментарий:</strong> {item.payload.text}</p>
                                                )}
                                                {item.payload?.reasonCode && (
                                                    <p><strong>Причина:</strong> {item.payload.reasonCode}</p>
                                                )}
                                                {item.payload?.severity && (
                                                    <p><strong>Severity:</strong> {item.payload.severity}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}

                                    {historyTotalPages > 1 && (
                                        <div className="pagination">
                                            <button
                                                disabled={historyFilters.page === 0}
                                                onClick={() => goToHistoryPage(historyFilters.page - 1)}
                                            >
                                                ← Назад
                                            </button>
                                            <span>{historyFilters.page + 1} / {historyTotalPages}</span>
                                            <button
                                                disabled={historyFilters.page + 1 >= historyTotalPages}
                                                onClick={() => goToHistoryPage(historyFilters.page + 1)}
                                            >
                                                Вперёд →
                                            </button>
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
                                <Input
                                    type="email"
                                    value={newCuratorEmail}
                                    onChange={(e) => setNewCuratorEmail(e.target.value)}
                                    placeholder="curator@example.com"
                                />
                            </div>
                            <div className="curator-create-form__field">
                                <Label>Имя <span className="required-star">*</span></Label>
                                <Input
                                    value={newCuratorName}
                                    onChange={(e) => setNewCuratorName(e.target.value)}
                                    placeholder="Иван Кураторов"
                                />
                            </div>
                            <div className="curator-create-form__field">
                                <Label>Пароль <span className="required-star">*</span></Label>
                                <Input
                                    type="password"
                                    value={newCuratorPassword}
                                    onChange={(e) => setNewCuratorPassword(e.target.value)}
                                    placeholder="•••••••• (8-16 символов)"
                                />
                                <span className="field-hint">Длина пароля: от 8 до 16 символов</span>
                            </div>
                            <Button
                                className="button--primary"
                                onClick={handleCreateCurator}
                                disabled={isCreating}
                            >
                                {isCreating ? 'Создание...' : 'Создать куратора'}
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {isDetailOpen && selectedTask && (
                <div className="modal-overlay" onClick={() => setIsDetailOpen(false)}>
                    <div className="modal-content moderation-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Детали задачи #{selectedTask.id}</h3>
                            <button className="modal-close" onClick={() => setIsDetailOpen(false)}>×</button>
                        </div>

                        <div className="modal-body">
                            <div className="task-detail-info">
                                <div className="info-row">
                                    <span className="info-label">Тип задачи:</span>
                                    <span className="info-value">{getTaskTypeLabel(selectedTask.taskType)}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Сущность:</span>
                                    <span className="info-value">{getEntityTypeLabel(selectedTask.entityType)}</span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Статус:</span>
                                    <span className={`info-value status-badge ${getStatusClass(selectedTask.status)}`}>
                                        {getStatusLabel(selectedTask.status)}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Приоритет:</span>
                                    <span className={`info-value priority-badge ${getPriorityClass(selectedTask.priority)}`}>
                                        {getPriorityLabel(selectedTask.priority)}
                                    </span>
                                </div>
                                <div className="info-row">
                                    <span className="info-label">Создано:</span>
                                    <span className="info-value">{formatDate(selectedTask.createdAt)}</span>
                                </div>
                                {selectedTask.assignee && (
                                    <div className="info-row">
                                        <span className="info-label">Модератор:</span>
                                        <span className="info-value">{selectedTask.assignee.displayName}</span>
                                    </div>
                                )}
                            </div>

                            <div className="moderation-entity-actions">
                                <Button
                                    className="button--ghost"
                                    onClick={() => setIsEditingEntity((prev) => !prev)}
                                >
                                    {isEditingEntity ? 'Скрыть редактор' : 'Исправить данные перед одобрением'}
                                </Button>
                            </div>

                            <PreviewBlock
                                title="Исходные данные"
                                entityType={selectedTask.entityType}
                                snapshot={selectedTask.createdSnapshot}
                            />

                            {selectedTask.currentEntityState &&
                                JSON.stringify(selectedTask.currentEntityState) !== JSON.stringify(selectedTask.createdSnapshot) && (
                                    <PreviewBlock
                                        title="Текущее состояние в системе"
                                        entityType={selectedTask.entityType}
                                        snapshot={selectedTask.currentEntityState}
                                    />
                                )}

                            {isEditingEntity && (
                                <div className="task-detail-snapshot">
                                    <h4>Редактор сущности</h4>
                                    <p className="moderation-editor-note">
                                        Здесь можно исправить данные заявки перед одобрением.
                                        Изменения применятся только после нажатия кнопки «Одобрить».
                                    </p>
                                    <EntityEditor
                                        entityType={selectedTask.entityType}
                                        originalSnapshot={selectedTask.createdSnapshot}
                                        draft={entityDraft}
                                        onChange={handleEntityDraftChange}
                                    />
                                </div>
                            )}

                            {isEditingEntity && (
                                <div className="task-detail-snapshot">
                                    <div className="moderation-editor-summary">
                                        Будет изменено полей: {Object.keys(entityPatch).length}
                                    </div>

                                    <details className="moderation-patch-details">
                                        <summary>Показать технический patch</summary>
                                        <pre className="snapshot-content">
                                            {JSON.stringify(entityPatch, null, 2)}
                                        </pre>
                                    </details>
                                </div>
                            )}

                            <div className="task-detail-history">
                                <h4>История действий</h4>
                                <div className="history-timeline">
                                    {taskHistory.map(item => (
                                        <div key={item.id} className="timeline-item">
                                            <div className="timeline-dot"></div>
                                            <div className="timeline-content">
                                                <div className="timeline-header">
                                                    <span className="timeline-action">{getActionLabel(item.action)}</span>
                                                    <span className="timeline-date">{formatDate(item.createdAt)}</span>
                                                </div>
                                                <p className="timeline-actor">{item.actor?.displayName || 'Система'}</p>
                                                {item.payload?.text && (
                                                    <p className="timeline-comment">{item.payload.text}</p>
                                                )}
                                                {item.payload?.comment && !item.payload?.text && (
                                                    <p className="timeline-comment">{item.payload.comment}</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="task-detail-comments">
                                <h4>Добавить комментарий</h4>
                                <Textarea
                                    rows={3}
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    placeholder="Напишите комментарий..."
                                    className="comment-textarea"
                                />
                                <Button
                                    className="button--primary"
                                    onClick={handleAddComment}
                                    disabled={!newComment.trim()}
                                >
                                    Отправить
                                </Button>
                            </div>
                        </div>

                        <div className="modal-footer">
                            {selectedTask.status === 'OPEN' && !selectedTask.assignee && (
                                <Button className="button--primary" onClick={() => handleAssignToMe(selectedTask.id)}>
                                    Взять в работу
                                </Button>
                            )}

                            {canModerateSelectedTask && (
                                <>
                                    <Button className="button--primary" onClick={() => setIsApproveModalOpen(true)}>
                                        Одобрить
                                    </Button>
                                    <Button className="button--danger" onClick={() => setIsRejectModalOpen(true)}>
                                        Отклонить
                                    </Button>
                                </>
                            )}

                            {selectedTask.status !== 'APPROVED' && selectedTask.status !== 'REJECTED' && selectedTask.status !== 'CANCELLED' && (
                                <Button className="button--ghost" onClick={handleCancelTask}>
                                    Отменить задачу
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {isApproveModalOpen && (
                <div className="modal-overlay" onClick={() => setIsApproveModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Одобрение задачи</h3>
                            <button className="modal-close" onClick={() => setIsApproveModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <Label>
                                    Комментарий <span className="required-star">*</span>
                                </Label>
                                <Textarea
                                    rows={3}
                                    value={approveComment}
                                    onChange={(e) => setApproveComment(e.target.value)}
                                    placeholder="Пояснение к решению..."
                                    className="moderation-full-width-textarea"
                                />
                                <p className="moderation-editor-note">
                                    Исправления из редактора будут применены после одобрения.
                                </p>
                            </div>

                            <div className="moderation-editor-summary">
                                Изменено полей: {Object.keys(entityPatch).length}
                            </div>

                            <details className="moderation-patch-details">
                                <summary>Показать технические данные</summary>
                                <pre className="snapshot-content">
                                    {JSON.stringify(entityPatch, null, 2)}
                                </pre>
                            </details>
                        </div>
                        <div className="modal-footer">
                            <Button
                                className="button--primary"
                                onClick={handleApprove}
                                disabled={!approveComment.trim()}
                            >
                                Подтвердить
                            </Button>
                            <Button className="button--ghost"
                                    onClick={() => setIsApproveModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}

            {isRejectModalOpen && (
                <div className="modal-overlay" onClick={() => setIsRejectModalOpen(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Отклонение задачи</h3>
                            <button className="modal-close" onClick={() => setIsRejectModalOpen(false)}>×</button>
                        </div>
                        <div className="modal-body">
                            <div className="modal-field">
                                <label>Причина отклонения <span className="required-star">*</span></label>
                                <input
                                    type="text"
                                    value={rejectReason}
                                    onChange={(e) => setRejectReason(e.target.value)}
                                    placeholder="INVALID_DATA, VIOLATION..."
                                />
                            </div>
                            <div className="modal-field">
                                <label>Комментарий <span className="required-star">*</span></label>
                                <textarea
                                    rows={3}
                                    value={rejectComment}
                                    onChange={(e) => setRejectComment(e.target.value)}
                                    placeholder="Пояснение причины отказа..."
                                />
                            </div>
                            <div className="modal-field">
                                <label>Severity <span className="required-star">*</span></label>
                                <CustomSelect
                                    value={rejectSeverity}
                                    onChange={setRejectSeverity}
                                    options={SEVERITY_OPTIONS}
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <Button
                                className="button--danger"
                                onClick={handleReject}
                                disabled={!rejectReason.trim() || !rejectComment.trim() || !rejectSeverity}
                            >
                                Отклонить
                            </Button>
                            <Button className="button--ghost" onClick={() => setIsRejectModalOpen(false)}>Отмена</Button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default CuratorDashboard