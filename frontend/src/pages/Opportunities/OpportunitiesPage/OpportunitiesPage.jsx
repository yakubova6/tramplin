import { useEffect, useMemo, useState, useCallback } from 'react'
import { Link, useLocation } from 'wouter'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import CustomSelect from '../../../components/CustomSelect'
import Navbar from '../../../layouts/Navbar'
import YandexOpportunityMap from '../../../components/Map/YandexOpportunityMap'
import { useToast } from '../../../hooks/use-toast'
import {
    listOpportunityMap,
    listOpportunities,
    listTags,
    OPPORTUNITY_LABELS
} from '../../../api/opportunities'
import {
    addToSaved,
    removeFromSaved,
    applyToOpportunity,
    getSeekerSaved,
} from '../../../utils/profileApi'
import './OpportunitiesPage.scss'

// Импорт SVG иконок из папки assets
import locationIcon from '../../../assets/icons/location.svg'
import briefcaseIcon from '../../../assets/icons/briefcase.svg'
import companyIcon from '../../../assets/icons/company.svg'

const PAGE_LIMIT = 12
const MAP_SIDE_LIMIT = 8

const TYPE_OPTIONS = [
    { value: '', label: 'Любой тип' },
    { value: 'VACANCY', label: 'Вакансии' },
    { value: 'INTERNSHIP', label: 'Стажировки' },
    { value: 'EVENT', label: 'Мероприятия' },
    { value: 'MENTORING', label: 'Менторские программы' },
]

const FORMAT_OPTIONS = [
    { value: '', label: 'Любой формат' },
    { value: 'OFFICE', label: 'Офис' },
    { value: 'HYBRID', label: 'Гибрид' },
    { value: 'REMOTE', label: 'Удалённо' },
    { value: 'ONLINE', label: 'Онлайн' },
]

function formatMoney(from, to, currency) {
    if (from == null && to == null) return 'По договорённости'
    const values = []
    if (from != null) values.push(`от ${Number(from).toLocaleString('ru-RU')}`)
    if (to != null) values.push(`до ${Number(to).toLocaleString('ru-RU')}`)
    return `${values.join(' ')} ${currency || ''}`.trim()
}

function getCurrentUser() {
    try {
        const stored = localStorage.getItem('tramplin_current_user')
        return stored ? JSON.parse(stored) : null
    } catch {
        return null
    }
}

// User-specific storage keys
function getStorageKey(key) {
    const user = getCurrentUser()
    if (!user || !user.userId) return key
    return `${key}_user_${user.userId}`
}

function setStorageSet(key, setValue) {
    const storageKey = getStorageKey(key)
    localStorage.setItem(storageKey, JSON.stringify(Array.from(setValue)))
}

function getStorageSet(key) {
    const storageKey = getStorageKey(key)
    try {
        const raw = localStorage.getItem(storageKey)
        if (!raw) return new Set()
        return new Set(JSON.parse(raw))
    } catch {
        return new Set()
    }
}

// ========== DEBOUNCE HOOK ==========
function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

function OpportunitiesPage() {
    const [, navigate] = useLocation()
    const { toast } = useToast()
    const [viewMode, setViewMode] = useState('map')
    const [filters, setFilters] = useState({
        search: '',
        skillsQuery: '',
        type: '',
        format: '',
    })
    const [salaryRange, setSalaryRange] = useState({ from: '', to: '' })
    const [selectedTags, setSelectedTags] = useState([])
    const [page, setPage] = useState(0)
    const [total, setTotal] = useState(0)
    const [opportunities, setOpportunities] = useState([])
    const [mapPoints, setMapPoints] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [focusedOpportunityId, setFocusedOpportunityId] = useState(null)
    const [tags, setTags] = useState([])

    const [favoriteCompanies, setFavoriteCompanies] = useState(() => getStorageSet('favorite_companies'))
    const [favoriteOpportunities, setFavoriteOpportunities] = useState(() => getStorageSet('favorite_opportunities'))

    const currentUser = useMemo(() => getCurrentUser(), [])
    const isApplicant = currentUser?.role === 'APPLICANT'

    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

    // Debounce для поиска
    const debouncedSearch = useDebounce(filters.search, 500)
    const debouncedSkills = useDebounce(filters.skillsQuery, 500)

    const syncFavoriteOpportunities = useCallback(async () => {
        if (!currentUser) {
            const emptySet = new Set()
            setFavoriteOpportunities(emptySet)
            setStorageSet('favorite_opportunities', emptySet)
            return
        }

        try {
            const saved = await getSeekerSaved()
            const next = new Set(saved.map((item) => item.id))
            setFavoriteOpportunities(next)
            setStorageSet('favorite_opportunities', next)
        } catch (syncError) {
            console.error('Failed to sync favorites:', syncError)
        }
    }, [currentUser])

    const queryParams = useMemo(() => {
        const params = {
            limit: PAGE_LIMIT,
            offset: page * PAGE_LIMIT,
            search: `${debouncedSearch} ${debouncedSkills}`.trim(),
            type: filters.type,
            workFormat: filters.format,
            sortBy: 'PUBLISHED_AT',
            sortDirection: 'DESC',
        }

        if (salaryRange.from) {
            params.salaryFrom = Number(salaryRange.from)
        }
        if (salaryRange.to) {
            params.salaryTo = Number(salaryRange.to)
        }
        if (selectedTags.length > 0) {
            params.tagIds = selectedTags
        }

        return params
    }, [debouncedSearch, debouncedSkills, filters.type, filters.format, page, salaryRange, selectedTags])

    // Загрузка тегов
    useEffect(() => {
        listTags('TECH')
            .then((data) => {
                setTags(data || [])
            })
            .catch((err) => {
                console.error('Error loading tags:', err)
                setTags([])
            })
    }, [])

    // Синхронизация избранного при открытии страницы
    useEffect(() => {
        syncFavoriteOpportunities()
    }, [syncFavoriteOpportunities])

    // Слушаем обновления избранного с других страниц
    useEffect(() => {
        const handleFavoritesUpdated = async () => {
            await syncFavoriteOpportunities()
        }

        const handleStorage = (event) => {
            const storageKey = getStorageKey('favorite_opportunities')
            if (event.key === storageKey) {
                setFavoriteOpportunities(getStorageSet('favorite_opportunities'))
            }
        }

        window.addEventListener('favorites-updated', handleFavoritesUpdated)
        window.addEventListener('storage', handleStorage)

        return () => {
            window.removeEventListener('favorites-updated', handleFavoritesUpdated)
            window.removeEventListener('storage', handleStorage)
        }
    }, [syncFavoriteOpportunities])

    // Загрузка данных
    useEffect(() => {
        let mounted = true

        async function loadData() {
            setIsLoading(true)
            setError('')

            try {
                const [listData, mapData] = await Promise.all([
                    listOpportunities(queryParams),
                    listOpportunityMap({ ...queryParams, limit: 100, offset: 0 }),
                ])

                if (!mounted) return

                setOpportunities(listData?.items || [])
                setTotal(listData?.total || 0)
                setMapPoints(mapData?.items || [])
            } catch (requestError) {
                if (!mounted) return
                setError(requestError?.message || 'Не удалось загрузить вакансии')
            } finally {
                if (mounted) setIsLoading(false)
            }
        }

        loadData()
        return () => {
            mounted = false
        }
    }, [queryParams])

    const mapSideOpportunities = useMemo(() => {
        return [...opportunities]
            .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
            .slice(0, MAP_SIDE_LIMIT)
    }, [opportunities])

    const toggleCompanyFavorite = (companyName) => {
        const next = new Set(favoriteCompanies)
        if (next.has(companyName)) next.delete(companyName)
        else next.add(companyName)
        setFavoriteCompanies(next)
        setStorageSet('favorite_companies', next)

        toast({
            title: next.has(companyName) ? 'Компания добавлена в избранное' : 'Компания удалена из избранного',
            description: next.has(companyName) ? 'Вакансии этой компании будут выделены на карте' : '',
        })
    }

    const toggleOpportunityFavorite = async (opportunity) => {
        const isFavorite = favoriteOpportunities.has(opportunity.id)

        if (!currentUser) {
            toast({
                title: 'Требуется авторизация',
                description: 'Войдите в аккаунт, чтобы добавить в избранное',
                variant: 'destructive'
            })
            setTimeout(() => navigate('/auth/login'), 1500)
            return
        }

        try {
            if (isFavorite) {
                await removeFromSaved(opportunity.id)

                const next = new Set(favoriteOpportunities)
                next.delete(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next)

                toast({
                    title: 'Удалено из избранного',
                    description: `"${opportunity.title}" удалено из избранного`,
                })
            } else {
                await addToSaved(opportunity.id)

                const next = new Set(favoriteOpportunities)
                next.add(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next)

                toast({
                    title: 'Добавлено в избранное',
                    description: `"${opportunity.title}" сохранено в избранное`,
                })
            }
        } catch (error) {
            console.error('Favorite error:', error)

            if (error.message?.includes('already exists') || error.message?.includes('duplicate')) {
                const next = new Set(favoriteOpportunities)
                next.add(opportunity.id)
                setFavoriteOpportunities(next)
                setStorageSet('favorite_opportunities', next)

                toast({
                    title: 'В избранном',
                    description: `"${opportunity.title}" уже в избранном`,
                })
                return
            }

            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось изменить избранное',
                variant: 'destructive'
            })
        }
    }

    const handleShowOnMap = (id) => {
        setViewMode('map')
        setFocusedOpportunityId(null)
        setTimeout(() => {
            setFocusedOpportunityId(id)
        }, 100)
    }

    const handleApply = async (opportunity) => {
        if (!currentUser) {
            toast({
                title: 'Требуется авторизация',
                description: 'Войдите в аккаунт, чтобы откликнуться',
                variant: 'destructive'
            })
            setTimeout(() => navigate('/auth/login'), 1500)
            return
        }

        if (!isApplicant) {
            toast({
                title: 'Доступ ограничен',
                description: 'Отклик доступен только для роли соискателя',
                variant: 'destructive'
            })
            return
        }

        try {
            await applyToOpportunity(opportunity.id)
            toast({
                title: 'Отклик отправлен',
                description: `Ваш отклик на "${opportunity.title}" успешно отправлен`,
                variant: 'default'
            })
        } catch (applyError) {
            console.error('Apply error:', applyError)

            if (applyError.message?.includes('already') || applyError.message?.includes('уже')) {
                toast({
                    title: 'Уже откликались',
                    description: 'Вы уже откликались на эту возможность',
                    variant: 'destructive'
                })
                return
            }

            toast({
                title: 'Ошибка',
                description: applyError.message || 'Не удалось отправить отклик',
                variant: 'destructive'
            })
        }
    }

    const goToPage = (newPage) => {
        setPage(newPage)
        if (viewMode === 'list') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
        }
    }

    // ========== ОБРАБОТЧИКИ ДЛЯ ФИЛЬТРОВ ==========
    const handleSearchChange = (e) => {
        setPage(0)
        setFilters((prev) => ({ ...prev, search: e.target.value }))
    }

    const handleSkillsChange = (e) => {
        setPage(0)
        setFilters((prev) => ({ ...prev, skillsQuery: e.target.value }))
    }

    const handleTypeChange = (value) => {
        setPage(0)
        setFilters((prev) => ({ ...prev, type: value }))
    }

    const handleFormatChange = (value) => {
        setPage(0)
        setFilters((prev) => ({ ...prev, format: value }))
    }

    const handleSalaryFromChange = (e) => {
        setPage(0)
        setSalaryRange({ ...salaryRange, from: e.target.value })
    }

    const handleSalaryToChange = (e) => {
        setPage(0)
        setSalaryRange({ ...salaryRange, to: e.target.value })
    }

    const handleTagClick = (tagId) => {
        setPage(0)
        setSelectedTags((prev) =>
            prev.includes(tagId)
                ? prev.filter((id) => id !== tagId)
                : [...prev, tagId]
        )
    }

    return (
        <div className="opportunities-page">
            <Navbar />

            <header className="opportunities-page__hero">
                <div className="container opportunities-page__hero-inner">
                    <h1>Твой карьерный трамплин в IT</h1>
                    <p>Находи стажировки, вакансии и карьерные события. Смотри на карте и в ленте карточек.</p>

                    <div className="opportunities-page__search-bar">
                        <Input
                            value={filters.search}
                            onChange={handleSearchChange}
                            placeholder="Поиск по компании, названию, описанию"
                        />
                        <Input
                            value={filters.skillsQuery}
                            onChange={handleSkillsChange}
                            placeholder="Навыки"
                        />
                        <CustomSelect
                            value={filters.type}
                            onChange={handleTypeChange}
                            options={TYPE_OPTIONS}
                        />
                        <CustomSelect
                            value={filters.format}
                            onChange={handleFormatChange}
                            options={FORMAT_OPTIONS}
                        />
                    </div>

                    <div className="opportunities-page__salary-filter">
                        <div className="salary-filter__title">Зарплата</div>
                        <div className="salary-filter__inputs">
                            <Input
                                type="number"
                                value={salaryRange.from}
                                onChange={handleSalaryFromChange}
                                placeholder="от"
                                className="salary-input"
                            />
                            <span className="salary-separator">—</span>
                            <Input
                                type="number"
                                value={salaryRange.to}
                                onChange={handleSalaryToChange}
                                placeholder="до"
                                className="salary-input"
                            />
                            <span className="salary-currency">₽</span>
                        </div>
                    </div>

                    {tags.length > 0 && (
                        <div className="opportunities-page__tag-list">
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={`opportunities-page__tag ${selectedTags.includes(tag.id) ? 'is-active' : ''}`}
                                    onClick={() => handleTagClick(tag.id)}
                                >
                                    #{tag.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </header>

            <main className="container opportunities-page__main">
                <section className="opportunities-page__toolbar">
                    <h2>Найдено возможностей: {total}</h2>
                    <div className="opportunities-page__view-switcher">
                        <button className={viewMode === 'map' ? 'is-active' : ''} onClick={() => setViewMode('map')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                                <circle cx="12" cy="10" r="3" />
                            </svg>
                            <span>На карте</span>
                        </button>
                        <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="8" y1="6" x2="21" y2="6" />
                                <line x1="8" y1="12" x2="21" y2="12" />
                                <line x1="8" y1="18" x2="21" y2="18" />
                                <line x1="3" y1="6" x2="3.01" y2="6" />
                                <line x1="3" y1="12" x2="3.01" y2="12" />
                                <line x1="3" y1="18" x2="3.01" y2="18" />
                            </svg>
                            <span>Списком</span>
                        </button>
                    </div>
                </section>

                {error && <p className="opportunities-page__error">{error}</p>}
                {isLoading && <p className="opportunities-page__state">Загрузка...</p>}

                {!isLoading && !error && opportunities.length === 0 && (
                    <div className="opportunities-page__empty">
                        <h3>Ничего не найдено</h3>
                        <p>Попробуй изменить фильтры и параметры поиска.</p>
                    </div>
                )}

                {!isLoading && !error && opportunities.length > 0 && (
                    <section className="opportunities-page__content">
                        {viewMode === 'map' ? (
                            <div className="opportunities-page__map-layout">
                                <div className="opportunities-page__map-side-list">
                                    {mapSideOpportunities.map((item) => (
                                        <article key={item.id} className="opportunities-page__compact-card">
                                            <div className="opportunities-page__compact-header">
                                                <h3>{item.title}</h3>
                                                <button
                                                    type="button"
                                                    className={`opportunities-page__fav-star ${favoriteOpportunities.has(item.id) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleOpportunityFavorite(item)}
                                                >
                                                    ★
                                                </button>
                                            </div>
                                            <p className="opportunities-page__company">
                                                <img src={companyIcon} alt="" className="icon" />
                                                <span>{item.companyName}</span>
                                                <button
                                                    type="button"
                                                    className={`opportunities-page__company-fav ${favoriteCompanies.has(item.companyName) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleCompanyFavorite(item.companyName)}
                                                >
                                                    ★
                                                </button>
                                            </p>
                                            <div className="opportunities-page__compact-meta">
                                                <span className="opportunities-page__badge">
                                                    {OPPORTUNITY_LABELS.type[item.type] || 'Возможность'}
                                                </span>
                                                <span className="opportunities-page__badge">
                                                    {OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat}
                                                </span>
                                            </div>
                                            <p className="opportunities-page__salary">
                                                <img src={briefcaseIcon} alt="" className="icon" />
                                                <span>{formatMoney(item.salaryFrom, item.salaryTo, item.salaryCurrency)}</span>
                                            </p>
                                            <p className="opportunities-page__short-desc">{item.shortDescription}</p>
                                            <div className="opportunities-page__compact-actions">
                                                <button
                                                    type="button"
                                                    className="opportunities-page__map-btn"
                                                    onClick={() => handleShowOnMap(item.id)}
                                                >
                                                    <img src={locationIcon} alt="" className="icon" />
                                                    <span>Показать на карте</span>
                                                </button>
                                                <Link href={`/opportunities/${item.id}`}>
                                                    <button type="button" className="opportunities-page__detail-btn">
                                                        <span>Подробнее</span>
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                            <path d="M9 18L15 12L9 6" />
                                                        </svg>
                                                    </button>
                                                </Link>
                                            </div>
                                        </article>
                                    ))}
                                    {total > MAP_SIDE_LIMIT && (
                                        <div className="opportunities-page__map-pagination">
                                            <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M15 18L9 12L15 6" />
                                                </svg>
                                            </button>
                                            <span>{page + 1} / {totalPages}</span>
                                            <button type="button" onClick={() => goToPage(page + 1)} disabled={page + 1 >= totalPages}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M9 18L15 12L9 6" />
                                                </svg>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="opportunities-page__map-wrap">
                                    <YandexOpportunityMap
                                        points={mapPoints}
                                        favoriteCompanies={favoriteCompanies}
                                        focusedOpportunityId={focusedOpportunityId}
                                        onOpenCard={(id) => {
                                            setFocusedOpportunityId(id)
                                        }}
                                        isDetailPage={false}
                                    />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="opportunities-page__cards-grid">
                                    {opportunities.map((item) => (
                                        <article key={item.id} className="opportunities-page__card">
                                            <div className="opportunities-page__card-header">
                                                <div className="opportunities-page__card-badges">
                                                    <span className="opportunities-page__badge opportunities-page__badge--type">
                                                        {OPPORTUNITY_LABELS.type[item.type] || item.type}
                                                    </span>
                                                    <span className="opportunities-page__badge">
                                                        {OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat}
                                                    </span>
                                                </div>
                                                <button
                                                    type="button"
                                                    className={`opportunities-page__fav-star ${favoriteOpportunities.has(item.id) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleOpportunityFavorite(item)}
                                                >
                                                    ★
                                                </button>
                                            </div>
                                            <h3>{item.title}</h3>
                                            <p className="opportunities-page__company">
                                                <img src={companyIcon} alt="" className="icon" />
                                                <span>{item.companyName}</span>
                                                <button
                                                    type="button"
                                                    className={`opportunities-page__company-fav ${favoriteCompanies.has(item.companyName) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleCompanyFavorite(item.companyName)}
                                                >
                                                    ★
                                                </button>
                                            </p>
                                            <p className="opportunities-page__salary">
                                                <img src={briefcaseIcon} alt="" className="icon" />
                                                <span>{formatMoney(item.salaryFrom, item.salaryTo, item.salaryCurrency)}</span>
                                            </p>
                                            <p className="opportunities-page__desc">{item.shortDescription}</p>
                                            <div className="opportunities-page__card-footer">
                                                <button
                                                    type="button"
                                                    className="opportunities-page__map-link"
                                                    onClick={() => handleShowOnMap(item.id)}
                                                >
                                                    <img src={locationIcon} alt="" className="icon" />
                                                    <span>На карту</span>
                                                </button>
                                                <div className="opportunities-page__card-actions">
                                                    {isApplicant && (
                                                        <Button className="button--primary" onClick={() => handleApply(item)}>
                                                            Откликнуться
                                                        </Button>
                                                    )}
                                                    <Link href={`/opportunities/${item.id}`}>
                                                        <Button className="button--outline">Подробнее</Button>
                                                    </Link>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                                <div className="opportunities-page__pagination">
                                    <button type="button" onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 18L9 12L15 6" />
                                        </svg>
                                        <span>Назад</span>
                                    </button>
                                    <span>{page + 1} / {totalPages}</span>
                                    <button type="button" onClick={() => goToPage(page + 1)} disabled={page + 1 >= totalPages}>
                                        <span>Вперёд</span>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M9 18L15 12L9 6" />
                                        </svg>
                                    </button>
                                </div>
                            </>
                        )}
                    </section>
                )}
            </main>
        </div>
    )
}

export default OpportunitiesPage