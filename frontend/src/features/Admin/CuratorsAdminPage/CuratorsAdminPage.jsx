import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'wouter'
import DashboardLayout from '../../Dashboard/DashboardLayout'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Label from '@/shared/ui/Label'
import Textarea from '@/shared/ui/Textarea'
import { useToast } from '@/shared/hooks/use-toast'
import {
    getCuratorDetail,
    getCurators,
    updateCuratorAccess,
} from '@/shared/api/admin'
import '../../Dashboard/DashboardBase.scss'
import './CuratorsAdminPage.scss'

const PAGE_SIZE = 12
const SEARCH_DEBOUNCE_MS = 500

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => window.clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

function formatDateTime(value, fallback = '—') {
    if (!value) return fallback

    const date = new Date(value)

    if (Number.isNaN(date.getTime())) return fallback

    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

function getRoleLabel(role) {
    if (role === 'ADMIN') return 'Администратор'
    if (role === 'CURATOR') return 'Куратор'
    if (role === 'EMPLOYER') return 'Работодатель'
    if (role === 'APPLICANT') return 'Соискатель'
    return role || '—'
}

function getAccessLabel(isActive) {
    return isActive ? 'Активен' : 'Отключён'
}

function getTwoFactorLabel(enabled) {
    return enabled ? 'Включена' : 'Выключена'
}

function getStatValue(value) {
    return typeof value === 'number' ? value : 0
}

function CuratorsAdminPage() {
    const { toast } = useToast()

    const [search, setSearch] = useState('')
    const [appliedSearch, setAppliedSearch] = useState('')
    const [page, setPage] = useState(0)

    const [curators, setCurators] = useState([])
    const [total, setTotal] = useState(0)
    const [isListLoading, setIsListLoading] = useState(true)

    const [isDetailOpen, setIsDetailOpen] = useState(false)
    const [isDetailLoading, setIsDetailLoading] = useState(false)
    const [selectedCurator, setSelectedCurator] = useState(null)

    const [accessForm, setAccessForm] = useState({
        active: true,
        reason: '',
    })
    const [isSavingAccess, setIsSavingAccess] = useState(false)

    const debouncedSearch = useDebounce(search.trim(), SEARCH_DEBOUNCE_MS)
    const totalPages = Math.ceil(total / PAGE_SIZE)
    const hasSearchValue = Boolean(search.trim() || appliedSearch)

    const applyDetailState = useCallback((detail) => {
        setSelectedCurator(detail)
        setAccessForm({
            active: Boolean(detail?.isActive),
            reason: detail?.deactivationReason || '',
        })
    }, [])

    const loadCurators = useCallback(async () => {
        setIsListLoading(true)

        try {
            const response = await getCurators({
                limit: PAGE_SIZE,
                offset: page * PAGE_SIZE,
                search: appliedSearch,
            })

            setCurators(response?.items || [])
            setTotal(response?.total || 0)
        } catch (error) {
            console.error('[CuratorsAdminPage] Failed to load curators:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить список кураторов',
                variant: 'destructive',
            })
        } finally {
            setIsListLoading(false)
        }
    }, [appliedSearch, page, toast])

    const loadCuratorDetail = useCallback(async (curatorId, { openModal = false } = {}) => {
        if (openModal) {
            setIsDetailOpen(true)
        }

        setIsDetailLoading(true)
        setSelectedCurator(null)

        try {
            const detail = await getCuratorDetail(curatorId)
            applyDetailState(detail)
            return detail
        } catch (error) {
            console.error('[CuratorsAdminPage] Failed to load curator detail:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить данные куратора',
                variant: 'destructive',
            })

            if (openModal) {
                setIsDetailOpen(false)
            }

            return null
        } finally {
            setIsDetailLoading(false)
        }
    }, [applyDetailState, toast])

    useEffect(() => {
        setPage(0)
        setAppliedSearch((prev) => (
            prev === debouncedSearch ? prev : debouncedSearch
        ))
    }, [debouncedSearch])

    useEffect(() => {
        loadCurators()
    }, [loadCurators])

    useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape' && isDetailOpen && !isSavingAccess) {
                setIsDetailOpen(false)
                setIsDetailLoading(false)
            }
        }

        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
    }, [isDetailOpen, isSavingAccess])

    useEffect(() => {
        document.documentElement.classList.toggle('is-lock', isDetailOpen)
        return () => document.documentElement.classList.remove('is-lock')
    }, [isDetailOpen])

    const detailFields = useMemo(() => {
        if (!selectedCurator) return []

        return [
            { label: 'Email', value: selectedCurator.email || '—' },
            { label: 'Роль', value: getRoleLabel(selectedCurator.role) },
            { label: '2FA', value: getTwoFactorLabel(selectedCurator.twoFactorEnabled) },
            { label: 'Последний вход', value: formatDateTime(selectedCurator.lastLoginAt, 'Никогда') },
            { label: 'Статус доступа', value: getAccessLabel(selectedCurator.isActive) },
            { label: 'Отключён', value: formatDateTime(selectedCurator.deactivatedAt) },
            { label: 'Кем отключён', value: selectedCurator.deactivatedByUserId || '—' },
            { label: 'Причина отключения', value: selectedCurator.deactivationReason || '—' },
        ]
    }, [selectedCurator])

    const statsCards = useMemo(() => {
        const stats = selectedCurator?.stats || {}

        return [
            {
                label: 'Открытые назначенные',
                value: getStatValue(stats.openAssignedCount),
            },
            {
                label: 'В работе',
                value: getStatValue(stats.inProgressCount),
            },
            {
                label: 'Одобрено',
                value: getStatValue(stats.approvedCount),
            },
            {
                label: 'Отклонено',
                value: getStatValue(stats.rejectedCount),
            },
            {
                label: 'Отменено',
                value: getStatValue(stats.cancelledCount),
            },
            {
                label: 'Последнее действие',
                value: formatDateTime(stats.lastModerationActionAt),
            },
        ]
    }, [selectedCurator])

    const canManageAccess = selectedCurator?.role === 'CURATOR'
    const accessStatusChanged =
        selectedCurator && accessForm.active !== selectedCurator.isActive
    const canSubmitAccess =
        Boolean(canManageAccess && accessStatusChanged) &&
        (accessForm.active || accessForm.reason.trim().length > 0)

    const handleSearchReset = () => {
        setSearch('')
        setAppliedSearch('')
        setPage(0)
    }

    const handleOpenDetail = async (curatorId) => {
        await loadCuratorDetail(curatorId, { openModal: true })
    }

    const handleCloseDetail = () => {
        if (isSavingAccess) return

        setIsDetailOpen(false)
        setIsDetailLoading(false)
    }

    const handleAccessToggle = (nextActive) => {
        setAccessForm((prev) => ({
            active: nextActive,
            reason: nextActive ? '' : prev.reason,
        }))
    }

    const handleSaveAccess = async () => {
        if (!selectedCurator) return

        if (!accessForm.active && !accessForm.reason.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Укажите причину деактивации',
                variant: 'destructive',
            })
            return
        }

        try {
            setIsSavingAccess(true)

            const response = await updateCuratorAccess(selectedCurator.id, {
                active: accessForm.active,
                reason: accessForm.active ? undefined : accessForm.reason.trim(),
            })

            applyDetailState(response)
            await loadCurators()

            toast({
                title: accessForm.active ? 'Доступ восстановлен' : 'Доступ отключён',
                description: accessForm.active
                    ? 'Куратор снова может входить в систему'
                    : 'Все активные сессии куратора завершены',
            })
        } catch (error) {
            console.error('[CuratorsAdminPage] Failed to update curator access:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось изменить доступ куратора',
                variant: 'destructive',
            })
        } finally {
            setIsSavingAccess(false)
        }
    }

    return (
        <DashboardLayout
            title="Управление кураторами"
            subtitle="Список кураторов, детали учётной записи и управление доступом"
            hideHeaderActions
        >
            <div className="admin-curators-page">
                <Link href="/curator" className="admin-curators-page__back">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18L9 12L15 6" />
                    </svg>
                    <span>Назад</span>
                </Link>

                <div className="dashboard-panel">
                    <div className="admin-curators-page__toolbar">
                        <div className="admin-curators-page__search-field">
                            <Label htmlFor="curatorSearch">Поиск</Label>
                            <Input
                                id="curatorSearch"
                                name="curatorSearch"
                                type="text"
                                placeholder="Имя или email"
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                            />
                        </div>
                    </div>

                    {!isListLoading && (
                        <div className="admin-curators-page__summary">
                            <div className="admin-curators-page__summary-meta">
                                <span>Всего кураторов: {total}</span>
                                {appliedSearch && (
                                    <span>Фильтр: «{appliedSearch}»</span>
                                )}
                            </div>

                            <div className="admin-curators-page__summary-actions">
                                {hasSearchValue && (
                                    <button
                                        type="button"
                                        className="admin-curators-page__summary-reset"
                                        onClick={handleSearchReset}
                                    >
                                        Сбросить фильтры
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {isListLoading ? (
                        <div className="loading-state">
                            <div className="spinner"></div>
                            <p>Загрузка списка кураторов...</p>
                        </div>
                    ) : curators.length === 0 ? (
                        <div className="empty-state">
                            <p>Кураторы не найдены</p>
                            <span>Попробуйте изменить строку поиска или сбросить фильтры.</span>
                        </div>
                    ) : (
                        <>
                            <div className="admin-curators-page__grid">
                                {curators.map((curator) => (
                                    <article className="curator-card-item" key={curator.id}>
                                        <div className="curator-card-item__header">
                                            <div className="curator-card-item__identity">
                                                <h3>{curator.displayName || 'Без имени'}</h3>
                                                <p>{curator.email}</p>
                                            </div>

                                            <span
                                                className={`curator-card-item__badge ${curator.isActive ? 'is-active' : 'is-inactive'}`}
                                            >
                                                {getAccessLabel(curator.isActive)}
                                            </span>
                                        </div>

                                        <dl className="curator-card-item__facts">
                                            <div>
                                                <dt>Роль</dt>
                                                <dd>{getRoleLabel(curator.role)}</dd>
                                            </div>
                                            <div>
                                                <dt>2FA</dt>
                                                <dd>{getTwoFactorLabel(curator.twoFactorEnabled)}</dd>
                                            </div>
                                            <div>
                                                <dt>Последний вход</dt>
                                                <dd>{formatDateTime(curator.lastLoginAt, 'Никогда')}</dd>
                                            </div>
                                        </dl>

                                        <div className="curator-card-item__actions">
                                            <Button
                                                className="button--ghost"
                                                onClick={() => handleOpenDetail(curator.id)}
                                            >
                                                Подробнее
                                            </Button>
                                        </div>
                                    </article>
                                ))}
                            </div>

                            {totalPages > 1 && (
                                <div className="pagination">
                                    <button
                                        type="button"
                                        disabled={page === 0}
                                        onClick={() => setPage((prev) => prev - 1)}
                                    >
                                        ← Назад
                                    </button>
                                    <span>{page + 1} / {totalPages}</span>
                                    <button
                                        type="button"
                                        disabled={page + 1 >= totalPages}
                                        onClick={() => setPage((prev) => prev + 1)}
                                    >
                                        Вперёд →
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {isDetailOpen && (
                    <div className="modal-overlay" onClick={handleCloseDetail}>
                        <div
                            className="modal-content admin-curators-page__modal"
                            onClick={(event) => event.stopPropagation()}
                        >
                            <div className="modal-header">
                                <h3>Детали куратора</h3>
                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={handleCloseDetail}
                                >
                                    ×
                                </button>
                            </div>

                            <div className="modal-body">
                                {isDetailLoading || !selectedCurator ? (
                                    <div className="loading-state loading-state--compact">
                                        <div className="spinner"></div>
                                        <p>Загрузка деталей куратора...</p>
                                    </div>
                                ) : (
                                    <>
                                        <section className="curator-detail-card">
                                            <div className="curator-detail-card__header">
                                                <div className="curator-detail-card__identity">
                                                    <h4>{selectedCurator.displayName || 'Без имени'}</h4>
                                                    <p>{selectedCurator.email}</p>
                                                </div>

                                                <span
                                                    className={`curator-card-item__badge ${selectedCurator.isActive ? 'is-active' : 'is-inactive'}`}
                                                >
                                                    {getAccessLabel(selectedCurator.isActive)}
                                                </span>
                                            </div>

                                            <div className="curator-detail-card__grid">
                                                {detailFields.map((item) => (
                                                    <div className="curator-detail-card__field" key={item.label}>
                                                        <span>{item.label}</span>
                                                        <strong>{item.value}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        <section className="curator-detail-section">
                                            <div className="curator-detail-section__header">
                                                <div>
                                                    <h4>Статистика модерации</h4>
                                                </div>
                                            </div>

                                            <div className="curator-stats-grid">
                                                {statsCards.map((item) => (
                                                    <div className="curator-stats-grid__item" key={item.label}>
                                                        <span>{item.label}</span>
                                                        <strong>{item.value}</strong>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {canManageAccess && (
                                            <section className="curator-detail-section">
                                                <div className="curator-detail-section__header">
                                                    <div>
                                                        <h4>Управление доступом</h4>
                                                        <p>
                                                            При отключении доступа все активные сессии куратора будут завершены.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="curator-access-switch">
                                                    <button
                                                        type="button"
                                                        className={`curator-access-switch__button ${accessForm.active ? 'is-active' : ''}`}
                                                        onClick={() => handleAccessToggle(true)}
                                                    >
                                                        Активен
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`curator-access-switch__button ${!accessForm.active ? 'is-active is-danger' : ''}`}
                                                        onClick={() => handleAccessToggle(false)}
                                                    >
                                                        Отключить доступ
                                                    </button>
                                                </div>

                                                {!accessForm.active && (
                                                    <div className="curator-access-form">
                                                        <Label htmlFor="deactivationReason">
                                                            Причина деактивации
                                                            <span className="required-star"> *</span>
                                                        </Label>
                                                        <Textarea
                                                            id="deactivationReason"
                                                            rows={4}
                                                            value={accessForm.reason}
                                                            onChange={(event) =>
                                                                setAccessForm((prev) => ({
                                                                    ...prev,
                                                                    reason: event.target.value,
                                                                }))
                                                            }
                                                            placeholder="Например: временная блокировка по запросу администратора"
                                                        />
                                                    </div>
                                                )}
                                            </section>
                                        )}
                                    </>
                                )}
                            </div>

                            {!isDetailLoading && selectedCurator && (
                                <div className="modal-footer">
                                    {canManageAccess && (
                                        <Button
                                            className="button--primary"
                                            onClick={handleSaveAccess}
                                            disabled={!canSubmitAccess || isSavingAccess}
                                        >
                                            {isSavingAccess ? 'Сохраняем...' : 'Сохранить изменения'}
                                        </Button>
                                    )}
                                    <Button
                                        className="button--ghost"
                                        onClick={handleCloseDetail}
                                        disabled={isSavingAccess}
                                    >
                                        Закрыть
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default CuratorsAdminPage
