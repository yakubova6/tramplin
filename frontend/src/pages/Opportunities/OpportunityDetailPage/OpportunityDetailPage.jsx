import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useRoute } from 'wouter'
import Navbar from '../../../layouts/Navbar'
import Button from '../../../components/Button'
import { useToast } from '../../../hooks/use-toast'
import YandexOpportunityMap from '../../../components/map/YandexOpportunityMap'
import { getOpportunity, OPPORTUNITY_LABELS } from '../../../api/opportunities'
import { applyToOpportunity } from '../../../utils/profileApi'
import './OpportunityDetailPage.scss'

// Импорт SVG иконок
import locationIcon from '../../../assets/icons/location.svg'
import briefcaseIcon from '../../../assets/icons/briefcase.svg'
import calendarIcon from '../../../assets/icons/calendar.svg'
import mailIcon from '../../../assets/icons/link.svg'
import phoneIcon from '../../../assets/icons/phone.svg'
import companyIcon from '../../../assets/icons/company.svg'

function formatDate(date) {
    if (!date) return '—'
    return new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
}

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

export default function OpportunityDetailPage() {
    const [, navigate] = useLocation()
    const [, params] = useRoute('/opportunities/:id')
    const { toast } = useToast()
    const [item, setItem] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState('')
    const [isApplying, setIsApplying] = useState(false)

    const currentUser = useMemo(() => getCurrentUser(), [])
    const role = currentUser?.role || 'GUEST'
    const isApplicant = role === 'APPLICANT'

    useEffect(() => {
        if (!params?.id) return
        setIsLoading(true)
        getOpportunity(params.id)
            .then(setItem)
            .catch((err) => setError(err?.message || 'Не удалось загрузить карточку'))
            .finally(() => setIsLoading(false))
    }, [params?.id])

    const mapPoints = useMemo(() => {
        if (!item) return []
        const lat = item.location?.latitude || item.city?.latitude
        const lng = item.location?.longitude || item.city?.longitude
        if (!lat || !lng) return []
        return [{
            id: item.id,
            type: item.type,
            title: item.title,
            companyName: item.companyName,
            cityName: item.city?.name,
            addressLine: item.location?.addressLine,
            latitude: lat,
            longitude: lng,
            preview: {
                title: item.title,
                companyName: item.companyName,
                shortDescription: item.shortDescription,
                salaryFrom: item.salaryFrom,
                salaryTo: item.salaryTo,
                salaryCurrency: item.salaryCurrency,
                tags: item.tags || [],
            },
        }]
    }, [item])

    const handleApply = async () => {
        if (!item) return

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

        setIsApplying(true)
        try {
            console.log('[DetailPage] Applying to opportunity:', item.id)
            await applyToOpportunity(item.id)
            toast({
                title: 'Отклик отправлен',
                description: `Ваш отклик на "${item.title}" успешно отправлен`,
                variant: 'default'
            })
        } catch (applyError) {
            console.error('[DetailPage] Apply error:', applyError)

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
        } finally {
            setIsApplying(false)
        }
    }

    return (
        <div className="opportunity-detail-page">
            <Navbar />

            <main className="container opportunity-detail-page__main">
                <Link
                    href="/"
                    className="opportunity-detail-page__back"
                    onClick={(event) => {
                        event.preventDefault()
                        if (window.history.length > 1) {
                            window.history.back()
                            return
                        }
                        navigate('/')
                    }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M15 18L9 12L15 6" />
                    </svg>
                    <span>Назад к списку</span>
                </Link>

                {isLoading && (
                    <div className="opportunity-detail-page__loader">
                        <div className="opportunity-detail-page__spinner"></div>
                        <p>Загрузка информации...</p>
                    </div>
                )}

                {error && (
                    <div className="opportunity-detail-page__error-card">
                        <p>{error}</p>
                        <Link href="/">
                            <Button>Вернуться к поиску</Button>
                        </Link>
                    </div>
                )}

                {item && (
                    <div className="opportunity-detail-page__grid">
                        {/* Левая колонка - основная информация */}
                        <div className="opportunity-detail-page__content">
                            <div className="opportunity-detail-page__badges">
                                <span className="badge badge--type">
                                    {OPPORTUNITY_LABELS.type[item.type] || 'Возможность'}
                                </span>
                                <span className="badge badge--format">
                                    {OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat || 'Формат не указан'}
                                </span>
                                {item.grade && (
                                    <span className="badge badge--grade">
                                        {OPPORTUNITY_LABELS.grade[item.grade] || item.grade}
                                    </span>
                                )}
                            </div>

                            <h1>{item.title}</h1>

                            <div className="opportunity-detail-page__company-row">
                                <img src={companyIcon} alt="" className="icon" />
                                <span>{item.companyName}</span>
                            </div>

                            <div className="opportunity-detail-page__location-row">
                                <img src={locationIcon} alt="" className="icon" />
                                <span>{item.city?.name || item.location?.addressLine || 'Местоположение не указано'}</span>
                            </div>

                            <div className="opportunity-detail-page__salary-row">
                                <img src={briefcaseIcon} alt="" className="icon" />
                                <span>{formatMoney(item.salaryFrom, item.salaryTo, item.salaryCurrency)}</span>
                            </div>

                            <section className="opportunity-detail-page__section">
                                <h3>О вакансии</h3>
                                <p className="description-text">{item.fullDescription || item.shortDescription || '—'}</p>
                            </section>

                            <section className="opportunity-detail-page__section">
                                <h3>Требования к кандидату</h3>
                                <div className="requirements-list">
                                    {item.requirements ? (
                                        <p>{item.requirements}</p>
                                    ) : (
                                        <p className="text-muted">Специфические требования не указаны</p>
                                    )}
                                </div>
                            </section>

                            <div className="opportunity-detail-page__info-grid">
                                <div className="info-item">
                                    <img src={calendarIcon} alt="" className="icon" />
                                    <div>
                                        <strong>Опубликовано</strong>
                                        <p>{formatDate(item.publishedAt)}</p>
                                    </div>
                                </div>
                                <div className="info-item">
                                    <img src={calendarIcon} alt="" className="icon" />
                                    <div>
                                        <strong>Действует до</strong>
                                        <p>{formatDate(item.expiresAt || item.eventDate)}</p>
                                    </div>
                                </div>
                                {item.employmentType && (
                                    <div className="info-item">
                                        <img src={briefcaseIcon} alt="" className="icon" />
                                        <div>
                                            <strong>Занятость</strong>
                                            <p>{OPPORTUNITY_LABELS.employmentType[item.employmentType] || item.employmentType}</p>
                                        </div>
                                    </div>
                                )}
                                {item.workFormat && (
                                    <div className="info-item">
                                        <img src={locationIcon} alt="" className="icon" />
                                        <div>
                                            <strong>Формат работы</strong>
                                            <p>{OPPORTUNITY_LABELS.workFormat[item.workFormat] || item.workFormat}</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {item.contactInfo && (item.contactInfo.email || item.contactInfo.phone || item.contactInfo.telegram) && (
                                <section className="opportunity-detail-page__contacts">
                                    <h3>Контакты работодателя</h3>
                                    <div className="contacts-list">
                                        {item.contactInfo.email && (
                                            <a href={`mailto:${item.contactInfo.email}`} className="contact-link">
                                                <img src={mailIcon} alt="" className="icon" />
                                                <span>{item.contactInfo.email}</span>
                                            </a>
                                        )}
                                        {item.contactInfo.phone && (
                                            <a href={`tel:${item.contactInfo.phone}`} className="contact-link">
                                                <img src={phoneIcon} alt="" className="icon" />
                                                <span>{item.contactInfo.phone}</span>
                                            </a>
                                        )}
                                        {item.contactInfo.telegram && (
                                            <a href={`https://t.me/${item.contactInfo.telegram}`} target="_blank" rel="noopener noreferrer" className="contact-link">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <path d="M20.5 4.5L2.5 12L8.5 14.5L12.5 20.5L20.5 4.5Z" />
                                                </svg>
                                                <span>@{item.contactInfo.telegram}</span>
                                            </a>
                                        )}
                                        {item.contactInfo.contactPerson && (
                                            <div className="contact-person">
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                                                    <circle cx="12" cy="8" r="4" />
                                                    <path d="M5 20V19C5 15.1 8.1 12 12 12C15.9 12 19 15.1 19 19V20" />
                                                </svg>
                                                <span>{item.contactInfo.contactPerson}</span>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            {item.tags && item.tags.length > 0 && (
                                <div className="opportunity-detail-page__tags">
                                    <h3>Навыки и теги</h3>
                                    <div className="tags-list">
                                        {item.tags.map((tag) => (
                                            <span key={tag.id} className="tag">#{tag.name}</span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="opportunity-detail-page__actions">
                                {isApplicant && (
                                    <Button
                                        className="button--primary button--full"
                                        onClick={handleApply}
                                        disabled={isApplying}
                                    >
                                        {isApplying ? 'Отправка...' : 'Откликнуться на вакансию'}
                                    </Button>
                                )}
                                {role === 'EMPLOYER' && (
                                    <Link href="/employer">
                                        <Button className="button--outline button--full">В кабинет работодателя</Button>
                                    </Link>
                                )}
                                {(role === 'CURATOR' || role === 'ADMIN') && (
                                    <Link href="/curator">
                                        <Button className="button--outline button--full">В кабинет куратора</Button>
                                    </Link>
                                )}
                                {role === 'GUEST' && (
                                    <Link href="/auth/login">
                                        <Button className="button--primary button--full">Войти для отклика</Button>
                                    </Link>
                                )}
                            </div>
                        </div>

                        {/* Правая колонка - карта */}
                        <aside className="opportunity-detail-page__sidebar">
                            {mapPoints.length > 0 && (
                                <div className="opportunity-detail-page__map-card">
                                    <h3>Расположение</h3>
                                    <div className="opportunity-detail-page__map-container">
                                        <YandexOpportunityMap
                                            points={mapPoints}
                                            favoriteCompanies={new Set()}
                                            focusedOpportunityId={item.id}
                                            onOpenCard={() => {}}
                                            isDetailPage={true}
                                        />
                                    </div>
                                    <div className="opportunity-detail-page__address">
                                        <img src={locationIcon} alt="" className="icon" />
                                        <span>{item.location?.addressLine || item.city?.name || 'Адрес не указан'}</span>
                                    </div>
                                </div>
                            )}
                        </aside>
                    </div>
                )}
            </main>
        </div>
    )
}