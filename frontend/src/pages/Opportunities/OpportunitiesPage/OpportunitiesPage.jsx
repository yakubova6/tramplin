import { useEffect, useMemo, useState } from 'react'
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
    applyToOpportunity,
    OPPORTUNITY_LABELS
} from '../../../api/opportunities'
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

function setStorageSet(key, setValue) {
    localStorage.setItem(key, JSON.stringify(Array.from(setValue)))
}

function getStorageSet(key) {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return new Set()
        return new Set(JSON.parse(raw))
    } catch {
        return new Set()
    }
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

    const [favoriteCompanies, setFavoriteCompanies] = useState(() => getStorageSet('tramplin_favorite_companies'))
    const [favoriteOpportunities, setFavoriteOpportunities] = useState(() => getStorageSet('tramplin_favorite_opportunities'))

    const currentUser = useMemo(() => getCurrentUser(), [])
    const isApplicant = currentUser?.role === 'APPLICANT'

    const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT))

    const queryParams = useMemo(() => {
        const params = {
            limit: PAGE_LIMIT,
            offset: page * PAGE_LIMIT,
            search: `${filters.search} ${filters.skillsQuery}`.trim(),
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
    }, [filters, page, salaryRange, selectedTags])

    // Загрузка тегов
    useEffect(() => {
        console.log('[Debug] Loading tags...')
        listTags('TECH')
            .then((data) => {
                console.log('[Debug] Tags loaded:', data)
                setTags(data || [])
            })
            .catch((err) => {
                console.error('[Debug] Error loading tags:', err)
                setTags([])
            })
    }, [])

    // Загрузка данных
    useEffect(() => {
        let mounted = true

        async function loadData() {
            setIsLoading(true)
            setError('')

            try {
                console.log('[Debug] Loading opportunities with params:', queryParams)
                const [listData, mapData] = await Promise.all([
                    listOpportunities(queryParams),
                    listOpportunityMap({ ...queryParams, limit: 100, offset: 0 }),
                ])

                if (!mounted) return

                console.log('[Debug] Opportunities loaded:', listData?.items?.length || 0, 'items')
                console.log('[Debug] Map points loaded:', mapData?.items?.length || 0, 'points')

                setOpportunities(listData?.items || [])
                setTotal(listData?.total || 0)
                setMapPoints(mapData?.items || [])
            } catch (requestError) {
                if (!mounted) return
                console.error('[Debug] Load error:', requestError)
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
        setStorageSet('tramplin_favorite_companies', next)
    }

    const toggleOpportunityFavorite = (id) => {
        const next = new Set(favoriteOpportunities)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        setFavoriteOpportunities(next)
        setStorageSet('tramplin_favorite_opportunities', next)
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
                description: 'Ваш отклик успешно отправлен работодателю',
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
                            onChange={(event) => {
                                setPage(0)
                                setFilters((prev) => ({ ...prev, search: event.target.value }))
                            }}
                            placeholder="Поиск по компании, названию, описанию"
                        />
                        <Input
                            value={filters.skillsQuery}
                            onChange={(event) => {
                                setPage(0)
                                setFilters((prev) => ({ ...prev, skillsQuery: event.target.value }))
                            }}
                            placeholder="Навыки и теги"
                        />
                        <CustomSelect
                            value={filters.type}
                            onChange={(value) => {
                                setPage(0)
                                setFilters((prev) => ({ ...prev, type: value }))
                            }}
                            options={TYPE_OPTIONS}
                        />
                        <CustomSelect
                            value={filters.format}
                            onChange={(value) => {
                                setPage(0)
                                setFilters((prev) => ({ ...prev, format: value }))
                            }}
                            options={FORMAT_OPTIONS}
                        />
                    </div>

                    {/* Фильтр по зарплате */}
                    <div className="opportunities-page__salary-filter">
                        <div className="salary-filter__title">Зарплата</div>
                        <div className="salary-filter__inputs">
                            <Input
                                type="number"
                                value={salaryRange.from}
                                onChange={(e) => {
                                    setPage(0)
                                    setSalaryRange({ ...salaryRange, from: e.target.value })
                                }}
                                placeholder="от"
                                className="salary-input"
                            />
                            <span className="salary-separator">—</span>
                            <Input
                                type="number"
                                value={salaryRange.to}
                                onChange={(e) => {
                                    setPage(0)
                                    setSalaryRange({ ...salaryRange, to: e.target.value })
                                }}
                                placeholder="до"
                                className="salary-input"
                            />
                            <span className="salary-currency">₽</span>
                        </div>
                    </div>

                    {/* Теги */}
                    {tags.length > 0 && (
                        <div className="opportunities-page__tag-list">
                            {tags.map((tag) => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    className={`opportunities-page__tag ${selectedTags.includes(tag.id) ? 'is-active' : ''}`}
                                    onClick={() => {
                                        setPage(0)
                                        setSelectedTags((prev) =>
                                            prev.includes(tag.id)
                                                ? prev.filter((id) => id !== tag.id)
                                                : [...prev, tag.id]
                                        )
                                    }}
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
                                                    className={`opportunities-page__fav-star ${favoriteOpportunities.has(item.id) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleOpportunityFavorite(item.id)}
                                                >
                                                    ★
                                                </button>
                                            </div>
                                            <p className="opportunities-page__company">
                                                <img src={companyIcon} alt="" className="icon" />
                                                <span>{item.companyName}</span>
                                                <button
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
                                                <button className="opportunities-page__map-btn" onClick={() => handleShowOnMap(item.id)}>
                                                    <img src={locationIcon} alt="" className="icon" />
                                                    <span>Показать на карте</span>
                                                </button>
                                                <Link href={`/opportunities/${item.id}`}>
                                                    <button className="opportunities-page__detail-btn">
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
                                            <button onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M15 18L9 12L15 6" />
                                                </svg>
                                            </button>
                                            <span>{page + 1} / {totalPages}</span>
                                            <button onClick={() => goToPage(page + 1)} disabled={page + 1 >= totalPages}>
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
                                                    className={`opportunities-page__fav-star ${favoriteOpportunities.has(item.id) ? 'is-favorite' : ''}`}
                                                    onClick={() => toggleOpportunityFavorite(item.id)}
                                                >
                                                    ★
                                                </button>
                                            </div>
                                            <h3>{item.title}</h3>
                                            <p className="opportunities-page__company">
                                                <img src={companyIcon} alt="" className="icon" />
                                                <span>{item.companyName}</span>
                                                <button
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
                                                <button className="opportunities-page__map-link" onClick={() => handleShowOnMap(item.id)}>
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
                                    <button onClick={() => goToPage(page - 1)} disabled={page === 0}>
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <path d="M15 18L9 12L15 6" />
                                        </svg>
                                        <span>Назад</span>
                                    </button>
                                    <span>{page + 1} / {totalPages}</span>
                                    <button onClick={() => goToPage(page + 1)} disabled={page + 1 >= totalPages}>
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