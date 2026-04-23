import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'wouter'
import DashboardLayout from '../Dashboard/DashboardLayout'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import CustomCheckbox from '@/shared/ui/CustomCheckbox'
import { useToast } from '@/shared/hooks/use-toast'
import { searchCities } from '@/shared/api/profile'
import { listTags } from '@/shared/api/opportunities'
import { searchApplicantProfiles } from '@/shared/api/applicantSearch'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import userAvatarIcon from '@/assets/icons/user-avatar.svg'
import './ApplicantSearchPage.scss'

const DEFAULT_LIMIT = 12
const INPUT_DEBOUNCE_MS = 250

function useDebounce(value, delay) {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timerId = window.setTimeout(() => {
            setDebouncedValue(value)
        }, delay)

        return () => window.clearTimeout(timerId)
    }, [value, delay])

    return debouncedValue
}

function createDefaultFilters() {
    return {
        cityId: null,
        cityName: '',
        skillTagIds: [],
        interestTagIds: [],
        openToWork: false,
        openToEvents: false,
        search: '',
    }
}

function getDashboardPathByRole(role) {
    if (role === 'EMPLOYER') return '/employer'
    if (role === 'CURATOR' || role === 'ADMIN') return '/curator'
    return '/seeker'
}

function mergeUniqueTags(...tagGroups) {
    const tagMap = new Map()

    tagGroups
        .flat()
        .filter(Boolean)
        .forEach((tag) => {
            if (!tag?.id || tagMap.has(tag.id)) return
            tagMap.set(tag.id, tag)
        })

    return Array.from(tagMap.values()).sort((left, right) =>
        String(left.name || '').localeCompare(String(right.name || ''), 'ru')
    )
}

function toggleTagId(ids, tagId) {
    if (ids.includes(tagId)) {
        return ids.filter((currentId) => currentId !== tagId)
    }

    return [...ids, tagId]
}

function buildApplicantFileUrl(userId, fileId) {
    if (!userId || !fileId) return null
    return `/api/profile/applicant/${userId}/files/${fileId}`
}

function getApplicantDisplayName(applicant) {
    const fullName = [applicant.lastName, applicant.firstName, applicant.middleName]
        .filter(Boolean)
        .join(' ')
        .trim()

    return fullName || `Соискатель #${applicant.userId}`
}

function getApplicantInitials(applicant) {
    const initials = `${applicant.firstName?.[0] || ''}${applicant.lastName?.[0] || ''}`.toUpperCase()
    return initials || '??'
}

export default function ApplicantSearchPage() {
    const { toast } = useToast()
    const [, setLocation] = useLocation()

    const currentUser = useMemo(() => getSessionUser(), [])
    const backHref = getDashboardPathByRole(currentUser?.role)
    const isApplicantViewer = currentUser?.role === 'APPLICANT'

    const pageTitle = isApplicantViewer
        ? 'Профессиональное сообщество'
        : 'Каталог соискателей'

    const pageSubtitle = isApplicantViewer
        ? 'Ищите людей по профилю, навыкам и интересам для нетворкинга и карьерного общения'
        : 'Поиск студентов и выпускников по профилю, городу и карьерным интересам'

    const searchPlaceholder = isApplicantViewer
        ? 'Имя, вуз, факультет, программа или ключевое слово'
        : 'Имя, вуз, факультет, программа или описание'

    const [filters, setFilters] = useState(createDefaultFilters)
    const [appliedFilters, setAppliedFilters] = useState(createDefaultFilters)
    const [pageNumber, setPageNumber] = useState(1)

    const [page, setPage] = useState({
        items: [],
        total: 0,
        limit: DEFAULT_LIMIT,
        offset: 0,
    })

    const [isLoading, setIsLoading] = useState(true)
    const [errorMessage, setErrorMessage] = useState('')
    const [skillTags, setSkillTags] = useState([])
    const [interestTags, setInterestTags] = useState([])

    const [citySuggestions, setCitySuggestions] = useState([])
    const [isCitySearchOpen, setIsCitySearchOpen] = useState(false)

    const citySearchRef = useRef(null)

    const debouncedSearch = useDebounce(filters.search, INPUT_DEBOUNCE_MS)
    const debouncedCityName = useDebounce(filters.cityName, INPUT_DEBOUNCE_MS)

    useEffect(() => {
        let isMounted = true

        async function loadReferenceData() {
            try {
                const [loadedSkillTags, loadedDirectionTags, loadedOtherTags] = await Promise.all([
                    listTags('TECH').catch(() => []),
                    listTags('DIRECTION').catch(() => []),
                    listTags('OTHER').catch(() => []),
                ])

                if (!isMounted) return

                setSkillTags(Array.isArray(loadedSkillTags) ? loadedSkillTags : [])
                setInterestTags(
                    mergeUniqueTags(
                        Array.isArray(loadedDirectionTags) ? loadedDirectionTags : [],
                        Array.isArray(loadedOtherTags) ? loadedOtherTags : []
                    )
                )
            } catch {
                if (!isMounted) return
                setSkillTags([])
                setInterestTags([])
            }
        }

        loadReferenceData()

        return () => {
            isMounted = false
        }
    }, [])

    useEffect(() => {
        const normalizedSearch = debouncedSearch.trim()
        const normalizedCityName = debouncedCityName.trim()
        const isSelectedCityStillRelevant =
            Boolean(filters.cityId) &&
            Boolean(normalizedCityName) &&
            filters.cityName.trim() === normalizedCityName

        setPageNumber(1)
        setAppliedFilters({
            cityId: isSelectedCityStillRelevant ? filters.cityId : null,
            cityName: normalizedCityName,
            skillTagIds: filters.skillTagIds,
            interestTagIds: filters.interestTagIds,
            openToWork: filters.openToWork,
            openToEvents: filters.openToEvents,
            search: normalizedSearch,
        })
    }, [
        debouncedSearch,
        debouncedCityName,
        filters.cityId,
        filters.cityName,
        filters.skillTagIds,
        filters.interestTagIds,
        filters.openToWork,
        filters.openToEvents,
    ])

    useEffect(() => {
        let isMounted = true

        async function loadApplicants() {
            setIsLoading(true)
            setErrorMessage('')

            try {
                const response = await searchApplicantProfiles({
                    limit: DEFAULT_LIMIT,
                    offset: (pageNumber - 1) * DEFAULT_LIMIT,
                    cityId: appliedFilters.cityId,
                    skillTagIds: appliedFilters.skillTagIds,
                    interestTagIds: appliedFilters.interestTagIds,
                    openToWork: appliedFilters.openToWork,
                    openToEvents: appliedFilters.openToEvents,
                    search: appliedFilters.search,
                })

                if (!isMounted) return
                setPage(response)
            } catch (error) {
                if (!isMounted) return

                setPage({
                    items: [],
                    total: 0,
                    limit: DEFAULT_LIMIT,
                    offset: (pageNumber - 1) * DEFAULT_LIMIT,
                })
                setErrorMessage(error?.message || 'Не удалось загрузить каталог соискателей')

                toast({
                    title: 'Ошибка',
                    description: error?.message || 'Не удалось загрузить каталог соискателей',
                    variant: 'destructive',
                })
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadApplicants()

        return () => {
            isMounted = false
        }
    }, [appliedFilters, pageNumber, toast])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (citySearchRef.current && !citySearchRef.current.contains(event.target)) {
                setIsCitySearchOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    const totalPages = useMemo(() => {
        const effectiveLimit = page.limit || DEFAULT_LIMIT
        const total = page.total || 0
        return total > 0 ? Math.ceil(total / effectiveLimit) : 1
    }, [page.limit, page.total])

    const shouldShowBlockingLoader = isLoading && page.items.length === 0

    const hasActiveFilters = useMemo(() => {
        return Boolean(
            filters.search.trim() ||
            filters.cityName.trim() ||
            filters.skillTagIds.length > 0 ||
            filters.interestTagIds.length > 0 ||
            filters.openToWork ||
            filters.openToEvents
        )
    }, [filters])

    const handlePageChange = (nextPage) => {
        const safePage = Math.max(1, Math.min(nextPage, totalPages))
        setPageNumber(safePage)
    }

    const handleCitySearch = async (value) => {
        setFilters((prev) => ({
            ...prev,
            cityId: null,
            cityName: value,
        }))
        setPageNumber(1)

        if (!value || value.trim().length < 2) {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
            return
        }

        try {
            const cities = await searchCities(value.trim())
            setCitySuggestions(Array.isArray(cities) ? cities : [])
            setIsCitySearchOpen(true)
        } catch {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
        }
    }

    const handleSelectCity = (city) => {
        setFilters((prev) => ({
            ...prev,
            cityId: city.id,
            cityName: city.name,
        }))
        setPageNumber(1)
        setCitySuggestions([])
        setIsCitySearchOpen(false)
    }

    const handleResetFilters = () => {
        const nextFilters = createDefaultFilters()

        setFilters(nextFilters)
        setAppliedFilters(nextFilters)
        setPageNumber(1)
        setCitySuggestions([])
        setIsCitySearchOpen(false)
    }

    return (
        <DashboardLayout
            title={pageTitle}
            subtitle={pageSubtitle}
            hideHeaderActions
        >
            <div className="applicant-search">
                <Link
                    href={backHref}
                    className="applicant-search__back"
                    onClick={(event) => {
                        event.preventDefault()

                        if (window.history.length > 1) {
                            window.history.back()
                            return
                        }

                        setLocation(backHref)
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18L9 12L15 6" />
                    </svg>
                    <span>Назад</span>
                </Link>

                <div className="applicant-search__filters">
                    <div className="applicant-search__filters-grid">
                        <div className="applicant-search__field applicant-search__field--wide">
                            <label className="applicant-search__label">Поиск</label>
                            <Input
                                value={filters.search}
                                onChange={(event) => {
                                    setFilters((prev) => ({
                                        ...prev,
                                        search: event.target.value,
                                    }))
                                    setPageNumber(1)
                                }}
                                placeholder={searchPlaceholder}
                            />
                        </div>

                        <div className="applicant-search__field" ref={citySearchRef}>
                            <label className="applicant-search__label">Город</label>

                            <div className="applicant-search__autocomplete">
                                <Input
                                    value={filters.cityName}
                                    onChange={(event) => handleCitySearch(event.target.value)}
                                    onFocus={() => {
                                        if (citySuggestions.length > 0) {
                                            setIsCitySearchOpen(true)
                                        }
                                    }}
                                    placeholder="Начните вводить город"
                                />

                                {isCitySearchOpen && citySuggestions.length > 0 && (
                                    <div className="applicant-search__autocomplete-list" role="listbox">
                                        {citySuggestions.map((city) => (
                                            <button
                                                key={city.id}
                                                type="button"
                                                className="applicant-search__autocomplete-item"
                                                onMouseDown={(event) => event.preventDefault()}
                                                onClick={() => handleSelectCity(city)}
                                            >
                                                <span>{city.name}</span>
                                                {city.regionName && (
                                                    <span className="applicant-search__autocomplete-meta">
                                                        {city.regionName}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="applicant-search__field applicant-search__field--checks">
                            <label className="applicant-search__label">Статус</label>

                            <div className="applicant-search__checkboxes">
                                <CustomCheckbox
                                    checked={filters.openToWork}
                                    onChange={(checked) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            openToWork: checked,
                                        }))
                                        setPageNumber(1)
                                    }}
                                    label="Открыт к работе"
                                />

                                <CustomCheckbox
                                    checked={filters.openToEvents}
                                    onChange={(checked) => {
                                        setFilters((prev) => ({
                                            ...prev,
                                            openToEvents: checked,
                                        }))
                                        setPageNumber(1)
                                    }}
                                    label="Открыт к мероприятиям"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="applicant-search__chips-block">
                        <div className="applicant-search__chip-group">
                            <div className="applicant-search__chip-header">
                                <span className="applicant-search__label">Навыки</span>
                                {filters.skillTagIds.length > 0 && (
                                    <span className="applicant-search__counter">
                                        {filters.skillTagIds.length}
                                    </span>
                                )}
                            </div>

                            <div className="applicant-search__chips">
                                {skillTags.map((tag) => {
                                    const isActive = filters.skillTagIds.includes(tag.id)

                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`applicant-search__chip ${isActive ? 'is-active' : ''}`}
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    skillTagIds: toggleTagId(prev.skillTagIds, tag.id),
                                                }))
                                                setPageNumber(1)
                                            }}
                                        >
                                            #{tag.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="applicant-search__chip-group">
                            <div className="applicant-search__chip-header">
                                <span className="applicant-search__label">Интересы</span>
                                {filters.interestTagIds.length > 0 && (
                                    <span className="applicant-search__counter">
                                        {filters.interestTagIds.length}
                                    </span>
                                )}
                            </div>

                            <div className="applicant-search__chips">
                                {interestTags.map((tag) => {
                                    const isActive = filters.interestTagIds.includes(tag.id)

                                    return (
                                        <button
                                            key={tag.id}
                                            type="button"
                                            className={`applicant-search__chip ${isActive ? 'is-active' : ''}`}
                                            onClick={() => {
                                                setFilters((prev) => ({
                                                    ...prev,
                                                    interestTagIds: toggleTagId(prev.interestTagIds, tag.id),
                                                }))
                                                setPageNumber(1)
                                            }}
                                        >
                                            #{tag.name}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="applicant-search__summary">
                    <div>
                        <h2>Результаты</h2>
                        <p>
                            {isLoading && page.items.length > 0
                                ? 'Обновляем результаты...'
                                : isLoading
                                ? 'Загрузка каталога...'
                                : `Найдено ${page.total} ${page.total === 1 ? 'профиль' : 'профилей'}`}
                        </p>
                    </div>

                    <div className="applicant-search__summary-actions">
                        {hasActiveFilters && (
                            <button
                                type="button"
                                className="applicant-search__summary-reset"
                                onClick={handleResetFilters}
                            >
                                Сбросить фильтры
                            </button>
                        )}

                        {!isLoading && page.total > 0 && (
                            <div className="applicant-search__pagination-meta">
                                Страница {pageNumber} из {totalPages}
                            </div>
                        )}
                    </div>
                </div>

                {errorMessage && !isLoading && (
                    <div className="applicant-search__state applicant-search__state--error">
                        <h3>Не удалось загрузить каталог</h3>
                        <p>{errorMessage}</p>
                    </div>
                )}

                {shouldShowBlockingLoader && (
                    <div className="applicant-search__state">
                        <div className="applicant-search__spinner"></div>
                        <p>Подбираем соискателей по выбранным фильтрам…</p>
                    </div>
                )}

                {!shouldShowBlockingLoader && !errorMessage && page.items.length === 0 && (
                    <div className="applicant-search__state">
                        <h3>Ничего не найдено</h3>
                        <p>Попробуй ослабить фильтры или убрать часть тегов.</p>
                    </div>
                )}

                {!errorMessage && page.items.length > 0 && (
                    <>
                        <div className="applicant-search__results">
                            {page.items.map((applicant) => {
                                const avatarUrl = applicant.avatar?.fileId
                                    ? buildApplicantFileUrl(applicant.userId, applicant.avatar.fileId)
                                    : null

                                const hasProfilePreview = Boolean(
                                    applicant.firstName ||
                                    applicant.lastName ||
                                    applicant.middleName ||
                                    applicant.universityName ||
                                    applicant.facultyName ||
                                    applicant.studyProgram ||
                                    applicant.city?.name ||
                                    applicant.about
                                )

                                return (
                                    <article key={applicant.userId} className="applicant-search__card">
                                        <div className="applicant-search__card-head">
                                            <div className="applicant-search__avatar">
                                                {avatarUrl ? (
                                                    <img
                                                        src={avatarUrl}
                                                        alt={getApplicantDisplayName(applicant)}
                                                        className="applicant-search__avatar-image"
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                ) : getApplicantInitials(applicant) !== '??' ? (
                                                    getApplicantInitials(applicant)
                                                ) : (
                                                    <img
                                                        src={userAvatarIcon}
                                                        alt=""
                                                        className="applicant-search__avatar-fallback"
                                                    />
                                                )}
                                            </div>

                                            <div className="applicant-search__identity">
                                                <h3>{getApplicantDisplayName(applicant)}</h3>

                                                {(applicant.universityName || applicant.city?.name) && (
                                                    <p className="applicant-search__meta-line">
                                                        {[
                                                            applicant.universityName,
                                                            applicant.facultyName,
                                                            applicant.studyProgram,
                                                            applicant.city?.name,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' • ')}
                                                    </p>
                                                )}

                                                {(applicant.course || applicant.graduationYear) && (
                                                    <p className="applicant-search__meta-line">
                                                        {[
                                                            applicant.course ? `Курс ${applicant.course}` : null,
                                                            applicant.graduationYear
                                                                ? `Выпуск ${applicant.graduationYear}`
                                                                : null,
                                                        ]
                                                            .filter(Boolean)
                                                            .join(' • ')}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="applicant-search__badges">
                                            {applicant.openToWork && (
                                                <span className="badge badge--success">Открыт к работе</span>
                                            )}
                                            {applicant.openToEvents && (
                                                <span className="badge badge--info">Открыт к мероприятиям</span>
                                            )}
                                        </div>

                                        {hasProfilePreview ? (
                                            <p className="applicant-search__about">
                                                {applicant.about || 'Краткое описание пока не заполнено'}
                                            </p>
                                        ) : (
                                            <p className="applicant-search__restricted">
                                                Часть данных скрыта настройками приватности. Полный доступ зависит
                                                от прав просмотра и статуса контакта.
                                            </p>
                                        )}

                                        {applicant.skills.length > 0 && (
                                            <div className="applicant-search__tag-block">
                                                <span className="applicant-search__tag-title">Навыки</span>
                                                <div className="applicant-search__tag-list">
                                                    {applicant.skills.map((tag) => (
                                                        <span key={tag.id} className="applicant-search__tag">
                                                            #{tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {applicant.interests.length > 0 && (
                                            <div className="applicant-search__tag-block">
                                                <span className="applicant-search__tag-title">Интересы</span>
                                                <div className="applicant-search__tag-list">
                                                    {applicant.interests.map((tag) => (
                                                        <span key={tag.id} className="applicant-search__tag">
                                                            #{tag.name}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        <div className="applicant-search__card-actions">
                                            <Link href={`/seekers/${applicant.userId}`}>
                                                <Button className="button--outline applicant-search__card-button">
                                                    Открыть профиль
                                                </Button>
                                            </Link>
                                        </div>
                                    </article>
                                )
                            })}
                        </div>

                        <div className="applicant-search__pagination">
                            <Button
                                className="button--outline applicant-search__pager-button"
                                type="button"
                                onClick={() => handlePageChange(pageNumber - 1)}
                                disabled={pageNumber <= 1}
                                aria-label="Предыдущая страница"
                            >
                                <span aria-hidden="true">‹</span>
                            </Button>

                            <span className="applicant-search__pagination-status">
                                {pageNumber} / {totalPages}
                            </span>

                            <Button
                                className="button--outline applicant-search__pager-button"
                                type="button"
                                onClick={() => handlePageChange(pageNumber + 1)}
                                disabled={pageNumber >= totalPages}
                                aria-label="Следующая страница"
                            >
                                <span aria-hidden="true">›</span>
                            </Button>
                        </div>
                    </>
                )}
            </div>
        </DashboardLayout>
    )
}
