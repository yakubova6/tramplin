import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useRoute } from 'wouter'
import Navbar from '../../layouts/Navbar'
import Button from '../../components/Button'
import { useToast } from '../../hooks/use-toast'
import { getSessionUser } from '../../utils/sessionStore'
import {
    getSeekerContacts,
    addContact,
    acceptContact,
    declineContact,
    removeContact,
} from '../../api/profile'
import './ApplicantPublicProfile.scss'

import userAvatarIcon from '../../assets/icons/user-avatar.svg'
import linkIcon from '../../assets/icons/link.svg'

function formatDate(dateString) {
    if (!dateString) return '—'
    const date = new Date(dateString)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    })
}

function formatApplicationStatus(status) {
    switch (status) {
        case 'SUBMITTED':
            return 'Отправлено'
        case 'IN_REVIEW':
            return 'На рассмотрении'
        case 'ACCEPTED':
            return 'Принято'
        case 'REJECTED':
            return 'Отклонено'
        case 'RESERVE':
            return 'В резерве'
        case 'WITHDRAWN':
            return 'Отозвано'
        default:
            return status || '—'
    }
}

function getApplicationStatusClass(status) {
    return status?.toLowerCase?.() || 'default'
}

async function apiRequest(url) {
    const response = await fetch(url, {
        credentials: 'include',
    })

    let data = null
    try {
        data = await response.json()
    } catch {
        data = null
    }

    if (!response.ok) {
        const error = new Error(data?.message || 'Не удалось загрузить профиль')
        error.status = response.status
        error.code = data?.code || null
        error.details = data?.details || {}
        error.payload = data || null
        throw error
    }

    return data
}

async function getApplicantPublicProfile(userId, currentUserId) {
    const query = currentUserId ? `?currentUserId=${currentUserId}` : ''
    return apiRequest(`/api/profile/applicant/${userId}${query}`)
}

async function getApplicantPublicApplications(userId, currentUserId) {
    const query = currentUserId ? `?currentUserId=${currentUserId}` : ''
    return apiRequest(`/api/profile/applicant/${userId}/applications${query}`)
}

async function getApplicantPublicContacts(userId, currentUserId) {
    const query = currentUserId ? `?currentUserId=${currentUserId}` : ''
    return apiRequest(`/api/profile/applicant/${userId}/contacts${query}`)
}

function canShowBlock(visibility, isOwner, isAuthenticated) {
    if (isOwner) return true
    if (visibility === 'PUBLIC') return true
    if (visibility === 'AUTHENTICATED') return isAuthenticated
    if (visibility === 'CONTACTS_ONLY') return false
    return false
}

function getFullName(profile) {
    return [profile.lastName, profile.firstName, profile.middleName]
        .filter(Boolean)
        .join(' ')
        .trim()
}

function getInitials(profile) {
    return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
}

function getApplicantFileUrl(userId, fileId) {
    if (!userId || !fileId) return null
    return `/api/profile/applicant/${userId}/files/${fileId}`
}

function renderContactValue(contact) {
    if (!contact?.value) return null

    const value = contact.value

    if (contact.type === 'EMAIL' || value.includes('@')) {
        return (
            <a href={`mailto:${value}`} className="applicant-public-profile__contact-link">
                {value}
            </a>
        )
    }

    if (contact.type === 'PHONE' || /^\+?\d[\d\s\-()]+$/.test(value)) {
        return (
            <a href={`tel:${value}`} className="applicant-public-profile__contact-link">
                {value}
            </a>
        )
    }

    if (contact.type === 'TELEGRAM' || value.startsWith('@') || value.includes('t.me/')) {
        const telegramValue = value.startsWith('@')
            ? value.slice(1)
            : value.replace(/^https?:\/\/t\.me\//, '')

        return (
            <a
                href={`https://t.me/${telegramValue}`}
                target="_blank"
                rel="noopener noreferrer"
                className="applicant-public-profile__contact-link"
            >
                @{telegramValue}
            </a>
        )
    }

    if (/^https?:\/\//i.test(value)) {
        return (
            <a
                href={value}
                target="_blank"
                rel="noopener noreferrer"
                className="applicant-public-profile__contact-link"
            >
                {value}
            </a>
        )
    }

    return <span className="applicant-public-profile__contact-text">{value}</span>
}

export default function ApplicantPublicProfile() {
    const [, navigate] = useLocation()
    const [match, params] = useRoute('/seekers/:id')
    const { toast } = useToast()

    const currentUser = useMemo(() => getSessionUser(), [])
    const currentUserId = currentUser?.id || null
    const isAuthenticated = Boolean(currentUserId)
    const isApplicantViewer = currentUser?.role === 'APPLICANT'

    const [profile, setProfile] = useState(null)
    const [applications, setApplications] = useState([])
    const [contacts, setContacts] = useState([])
    const [viewerContacts, setViewerContacts] = useState([])
    const [optimisticContactState, setOptimisticContactState] = useState(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isContactActionLoading, setIsContactActionLoading] = useState(false)

    const [errorState, setErrorState] = useState({
        title: '',
        message: '',
        kind: '',
    })

    const applicantId = params?.id ? Number(params.id) : null
    const isOwner = currentUserId && applicantId && currentUserId === applicantId

    useEffect(() => {
        if (!match) return

        if (!applicantId) {
            setErrorState({
                title: 'Некорректная ссылка',
                message: 'Не удалось определить профиль соискателя.',
                kind: 'invalid',
            })
            setIsLoading(false)
            return
        }

        let isMounted = true

        async function loadProfile() {
            setIsLoading(true)
            setErrorState({
                title: '',
                message: '',
                kind: '',
            })

            try {
                const profileData = await getApplicantPublicProfile(applicantId, currentUserId)

                if (!isMounted) return
                setProfile(profileData)

                const profileVisibility = profileData?.profileVisibility || 'AUTHENTICATED'
                const applicationsVisibility = profileData?.applicationsVisibility || 'PRIVATE'
                const contactsVisibility = profileData?.contactsVisibility || 'AUTHENTICATED'

                if (
                    canShowBlock(profileVisibility, isOwner, isAuthenticated) &&
                    canShowBlock(applicationsVisibility, isOwner, isAuthenticated)
                ) {
                    try {
                        const applicationsData = await getApplicantPublicApplications(applicantId, currentUserId)
                        if (isMounted) {
                            setApplications(Array.isArray(applicationsData) ? applicationsData : [])
                        }
                    } catch {
                        if (isMounted) setApplications([])
                    }
                }

                if (
                    canShowBlock(profileVisibility, isOwner, isAuthenticated) &&
                    canShowBlock(contactsVisibility, isOwner, isAuthenticated)
                ) {
                    try {
                        const contactsData = await getApplicantPublicContacts(applicantId, currentUserId)
                        if (isMounted) {
                            setContacts(Array.isArray(contactsData) ? contactsData : [])
                        }
                    } catch {
                        if (isMounted) setContacts([])
                    }
                }

                if (isApplicantViewer && !isOwner) {
                    try {
                        const myContacts = await getSeekerContacts()
                        if (isMounted) {
                            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
                        }
                    } catch {
                        if (isMounted) setViewerContacts([])
                    }
                }

                if (!canShowBlock(profileVisibility, isOwner, isAuthenticated) && !isOwner) {
                    setErrorState({
                        title: 'Профиль скрыт',
                        message: 'Этот профиль скрыт настройками приватности и пока недоступен для просмотра.',
                        kind: 'hidden',
                    })
                }
            } catch (loadError) {
                if (!isMounted) return

                if (
                    loadError?.status === 403 &&
                    loadError?.code === 'applicant_profile_not_moderated'
                ) {
                    setErrorState({
                        title: 'Профиль пока не опубликован',
                        message:
                            'Этот соискатель уже зарегистрирован на платформе, но его профиль ещё не прошёл модерацию. После проверки куратором он станет доступен другим пользователям.',
                        kind: 'not_moderated',
                    })
                } else if (loadError?.status === 404) {
                    setErrorState({
                        title: 'Профиль не найден',
                        message: 'Такой профиль не найден или был удалён.',
                        kind: 'not_found',
                    })
                } else {
                    setErrorState({
                        title: 'Не удалось открыть профиль',
                        message: loadError.message || 'Произошла ошибка при загрузке профиля.',
                        kind: 'generic',
                    })

                    toast({
                        title: 'Ошибка',
                        description: loadError.message || 'Не удалось загрузить профиль',
                        variant: 'destructive',
                    })
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadProfile()

        return () => {
            isMounted = false
        }
    }, [applicantId, currentUserId, isAuthenticated, isOwner, isApplicantViewer, match, toast])

    const relationship = useMemo(() => {
        if (!applicantId) return optimisticContactState

        const serverRelationship = Array.isArray(viewerContacts)
            ? viewerContacts.find((item) => Number(item.id) === Number(applicantId)) || null
            : null

        return optimisticContactState || serverRelationship
    }, [viewerContacts, applicantId, optimisticContactState])

    const profileVisible = profile
        ? canShowBlock(profile.profileVisibility, isOwner, isAuthenticated)
        : false

    const resumeVisible = profile
        ? canShowBlock(profile.resumeVisibility, isOwner, isAuthenticated)
        : false

    const applicationsVisible = profile
        ? canShowBlock(profile.applicationsVisibility, isOwner, isAuthenticated)
        : false

    const contactsVisible = profile
        ? canShowBlock(profile.contactsVisibility, isOwner, isAuthenticated)
        : false

    const handleAddContact = async () => {
        if (!applicantId) return

        const optimisticPending = {
            id: applicantId,
            status: 'PENDING',
            direction: 'outgoing',
        }

        try {
            setIsContactActionLoading(true)
            setOptimisticContactState(optimisticPending)

            await addContact(applicantId)

            const myContacts = await getSeekerContacts()
            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
            setOptimisticContactState(optimisticPending)

            toast({
                title: 'Запрос отправлен',
                description: 'Теперь пользователь сможет подтвердить профессиональный контакт',
            })
        } catch (error) {
            let myContacts = []

            try {
                myContacts = await getSeekerContacts()
                setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
            } catch {
                myContacts = []
            }

            const relationshipAfterError = Array.isArray(myContacts)
                ? myContacts.find((item) => Number(item.id) === Number(applicantId))
                : null

            if (
                relationshipAfterError?.status === 'PENDING' ||
                relationshipAfterError?.status === 'ACCEPTED'
            ) {
                setOptimisticContactState({
                    id: applicantId,
                    status: relationshipAfterError.status,
                    direction: relationshipAfterError.direction || 'outgoing',
                })

                toast({
                    title: relationshipAfterError.status === 'ACCEPTED'
                        ? 'Контакт уже подтверждён'
                        : 'Запрос уже отправлен',
                    description: relationshipAfterError.status === 'ACCEPTED'
                        ? 'Пользователь уже есть в ваших профессиональных контактах'
                        : 'Сейчас он ожидает подтверждения',
                })
                return
            }

            if (
                error?.status === 403 &&
                error?.code === 'applicant_networking_requires_approved_profile'
            ) {
                setOptimisticContactState(null)

                toast({
                    title: 'Нетворкинг пока недоступен',
                    description:
                        'Нетворкинг-функции доступны только после одобрения вашего профиля соискателя куратором.',
                    variant: 'destructive',
                })
                return
            }

            const message = error?.message || ''

            if (
                message.toLowerCase().includes('already exists') ||
                message.toLowerCase().includes('contact already exists') ||
                message.toLowerCase().includes('already') ||
                error?.status === 500
            ) {
                setOptimisticContactState(optimisticPending)

                toast({
                    title: 'Запрос отправлен',
                    description: 'Теперь пользователь сможет подтвердить профессиональный контакт',
                })
                return
            }

            setOptimisticContactState(null)

            toast({
                title: 'Ошибка',
                description: message || 'Не удалось отправить запрос',
                variant: 'destructive',
            })
        } finally {
            setIsContactActionLoading(false)
        }
    }

    const handleAcceptContact = async () => {
        if (!applicantId) return

        try {
            setIsContactActionLoading(true)

            await acceptContact(applicantId)

            const myContacts = await getSeekerContacts()
            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
            setOptimisticContactState({
                id: applicantId,
                status: 'ACCEPTED',
                direction: 'confirmed',
            })

            toast({
                title: 'Запрос принят',
                description: 'Контакт успешно подтверждён',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось принять запрос',
                variant: 'destructive',
            })
        } finally {
            setIsContactActionLoading(false)
        }
    }

    const handleDeclineContact = async () => {
        if (!applicantId) return

        try {
            setIsContactActionLoading(true)

            await declineContact(applicantId)

            const myContacts = await getSeekerContacts()
            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
            setOptimisticContactState(null)

            toast({
                title: 'Запрос отклонён',
                description: 'Входящий запрос удалён',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отклонить запрос',
                variant: 'destructive',
            })
        } finally {
            setIsContactActionLoading(false)
        }
    }

    const handleRemoveContact = async () => {
        if (!applicantId) return

        try {
            setIsContactActionLoading(true)

            await removeContact(applicantId)

            const myContacts = await getSeekerContacts()
            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
            setOptimisticContactState(null)

            toast({
                title: relationship?.direction === 'outgoing' ? 'Запрос отменён' : 'Контакт удалён',
                description: relationship?.direction === 'outgoing'
                    ? 'Исходящий запрос отменён'
                    : 'Контакт удалён из списка',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось обновить контакты',
                variant: 'destructive',
            })
        } finally {
            setIsContactActionLoading(false)
        }
    }

    const renderContactAction = () => {
        if (!isApplicantViewer || isOwner) return null

        if (!isAuthenticated) {
            return (
                <div className="applicant-public-profile__contact-panel">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Профессиональный контакт</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Войдите в аккаунт, чтобы добавить этого соискателя в свою сеть контактов
                        </span>
                    </div>

                    <Link href="/login">
                        <Button className="button--outline">Войти</Button>
                    </Link>
                </div>
            )
        }

        if (!relationship) {
            return (
                <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--default">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Добавить в профессиональные контакты</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Контакты помогают развивать карьерные связи и рекомендации внутри платформы
                        </span>
                    </div>

                    <Button
                        className="button--primary"
                        onClick={handleAddContact}
                        disabled={isContactActionLoading}
                    >
                        {isContactActionLoading ? 'Отправка...' : 'Добавить в контакты'}
                    </Button>
                </div>
            )
        }

        if (relationship.status === 'ACCEPTED') {
            return (
                <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--connected">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Контакт подтверждён</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Вы находитесь в сети профессиональных контактов друг у друга
                        </span>
                    </div>

                    <div className="applicant-public-profile__contact-actions">
                        <span className="badge badge--success">В контактах</span>
                        <Button
                            className="button--outline"
                            onClick={handleRemoveContact}
                            disabled={isContactActionLoading}
                        >
                            Удалить контакт
                        </Button>
                    </div>
                </div>
            )
        }

        if (relationship.status === 'PENDING' && relationship.direction === 'outgoing') {
            return (
                <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--pending">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Запрос уже отправлен</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Сейчас ожидается подтверждение профессионального контакта
                        </span>
                    </div>

                    <div className="applicant-public-profile__contact-actions">
                        <span className="badge badge--info">Ожидает подтверждения</span>
                        <Button
                            className="button--outline"
                            onClick={handleRemoveContact}
                            disabled={isContactActionLoading}
                        >
                            Отменить запрос
                        </Button>
                    </div>
                </div>
            )
        }

        return (
            <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--incoming">
                <div className="applicant-public-profile__contact-panel-text">
                    <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                    <span className="applicant-public-profile__contact-title">Входящий запрос</span>
                    <span className="applicant-public-profile__contact-subtitle">
                        Пользователь хочет добавить вас в профессиональные контакты
                    </span>
                </div>

                <div className="applicant-public-profile__contact-actions">
                    <Button
                        className="button--primary"
                        onClick={handleAcceptContact}
                        disabled={isContactActionLoading}
                    >
                        Принять
                    </Button>
                    <Button
                        className="button--outline"
                        onClick={handleDeclineContact}
                        disabled={isContactActionLoading}
                    >
                        Отклонить
                    </Button>
                </div>
            </div>
        )
    }

    const avatarUrl = profile?.avatar?.fileId
        ? getApplicantFileUrl(profile.userId || applicantId, profile.avatar.fileId)
        : null

    const shouldShowError = !isLoading && errorState.message
    const shouldShowContent = !isLoading && profile && profileVisible && !errorState.message

    return (
        <div className="applicant-public-profile">
            <Navbar />

            <main className="container applicant-public-profile__main">
                <Link
                    href="/"
                    className="applicant-public-profile__back"
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
                    <span>Назад</span>
                </Link>

                {isLoading && (
                    <div className="applicant-public-profile__loader">
                        <div className="applicant-public-profile__spinner"></div>
                        <p>Загрузка профиля...</p>
                    </div>
                )}

                {shouldShowError && errorState.kind === 'not_moderated' && (
                    <section className="applicant-public-profile__empty-state">
                        <div className="applicant-public-profile__empty-card">
                            <div className="applicant-public-profile__empty-badge">
                                Профиль недоступен
                            </div>

                            <h2 className="applicant-public-profile__empty-title">
                                Профиль пока не опубликован
                            </h2>

                            <p className="applicant-public-profile__empty-text">
                                {errorState.message}
                            </p>

                            <Link href="/" className="applicant-public-profile__empty-link">
                                <Button className="button--primary applicant-public-profile__empty-button">
                                    На главную
                                </Button>
                            </Link>
                        </div>
                    </section>
                )}

                {shouldShowError && errorState.kind !== 'not_moderated' && (
                    <div className="applicant-public-profile__error-card">
                        <div className="applicant-public-profile__error-content">
                            <h2>{errorState.title || 'Не удалось открыть профиль'}</h2>
                            <p>{errorState.message}</p>
                        </div>

                        <div className="applicant-public-profile__error-actions">
                            <Link href="/">
                                <Button>На главную</Button>
                            </Link>
                        </div>
                    </div>
                )}

                {shouldShowContent && (
                    <div className="applicant-public-profile__grid">
                        <section className="applicant-public-profile__hero-card">
                            <div className="applicant-public-profile__avatar">
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={getFullName(profile) || 'Аватар соискателя'}
                                        className="applicant-public-profile__avatar-image"
                                    />
                                ) : getInitials(profile) ? (
                                    getInitials(profile)
                                ) : (
                                    <img
                                        src={userAvatarIcon}
                                        alt="Аватар"
                                        className="applicant-public-profile__avatar-fallback-icon"
                                    />
                                )}
                            </div>

                            <div className="applicant-public-profile__hero-content">
                                <div className="applicant-public-profile__hero-top">
                                    <h1>{getFullName(profile) || 'Соискатель'}</h1>
                                    {isOwner && (
                                        <Link href="/seeker">
                                            <Button className="button--outline">Вернуться в кабинет</Button>
                                        </Link>
                                    )}
                                </div>

                                <div className="applicant-public-profile__meta">
                                    {profile.universityName && (
                                        <div className="meta-item">
                                            <strong>Вуз:</strong> <span>{profile.universityName}</span>
                                        </div>
                                    )}
                                    {profile.facultyName && (
                                        <div className="meta-item">
                                            <strong>Факультет:</strong> <span>{profile.facultyName}</span>
                                        </div>
                                    )}
                                    {profile.studyProgram && (
                                        <div className="meta-item">
                                            <strong>Программа:</strong> <span>{profile.studyProgram}</span>
                                        </div>
                                    )}
                                    {profile.course && (
                                        <div className="meta-item">
                                            <strong>Курс:</strong> <span>{profile.course}</span>
                                        </div>
                                    )}
                                    {profile.graduationYear && (
                                        <div className="meta-item">
                                            <strong>Год выпуска:</strong> <span>{profile.graduationYear}</span>
                                        </div>
                                    )}
                                    {(profile.city?.name || profile.cityName) && (
                                        <div className="meta-item">
                                            <strong>Город:</strong> <span>{profile.city?.name || profile.cityName}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="applicant-public-profile__badges">
                                    {profile.openToWork && <span className="badge badge--success">Открыт к работе</span>}
                                    {profile.openToEvents && <span className="badge badge--info">Открыт к мероприятиям</span>}
                                </div>

                                <div className="applicant-public-profile__hero-actions">
                                    {renderContactAction()}
                                </div>
                            </div>
                        </section>

                        {profile.about && (
                            <section className="applicant-public-profile__section-card">
                                <h2>О соискателе</h2>
                                <p>{profile.about}</p>
                            </section>
                        )}

                        {resumeVisible && (
                            <section className="applicant-public-profile__section-card">
                                <h2>Резюме и опыт</h2>

                                {profile.resumeText ? (
                                    <p>{profile.resumeText}</p>
                                ) : (
                                    <p className="text-muted">Резюме не заполнено</p>
                                )}

                                {Array.isArray(profile.skills) && profile.skills.length > 0 && (
                                    <div className="applicant-public-profile__subsection">
                                        <h3>Навыки</h3>
                                        <div className="tags-list">
                                            {profile.skills.map((skill) => (
                                                <span key={skill.id} className="tag">
                                                    #{skill.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {Array.isArray(profile.interests) && profile.interests.length > 0 && (
                                    <div className="applicant-public-profile__subsection">
                                        <h3>Карьерные интересы</h3>
                                        <div className="tags-list">
                                            {profile.interests.map((interest) => (
                                                <span key={interest.id} className="tag">
                                                    #{interest.name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {resumeVisible && (
                            <section className="applicant-public-profile__section-card">
                                <h2>Ссылки и проекты</h2>

                                {Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length > 0 ? (
                                    <div className="links-list">
                                        {profile.portfolioLinks.map((link, index) => (
                                            <a
                                                key={`${link.url}-${index}`}
                                                href={link.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="profile-link"
                                            >
                                                <div className="profile-link__main">
                                                    <img src={linkIcon} alt="" className="profile-link__icon" />
                                                    <span>{link.label || link.url}</span>
                                                </div>
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                    <path d="M7 17L17 7" />
                                                    <path d="M7 7H17V17" />
                                                </svg>
                                            </a>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted">Ссылки пока не добавлены</p>
                                )}

                                {Array.isArray(profile.contactLinks) && profile.contactLinks.length > 0 && (
                                    <div className="applicant-public-profile__subsection">
                                        <h3>Контакты</h3>
                                        <div className="links-list">
                                            {profile.contactLinks.map((contact, index) => (
                                                <div key={`${contact.value}-${index}`} className="profile-contact">
                                                    <div className="profile-contact__left">
                                                        <img src={linkIcon} alt="" className="profile-contact__icon" />
                                                        <div className="profile-contact__content">
                                                            <span className="profile-contact__label">
                                                                {contact.label || contact.type}
                                                            </span>
                                                            <div className="profile-contact__value">
                                                                {renderContactValue(contact)}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </section>
                        )}

                        {applicationsVisible && (
                            <section className="applicant-public-profile__section-card">
                                <h2>История откликов</h2>

                                {applications.length > 0 ? (
                                    <div className="simple-list">
                                        {applications.map((application) => (
                                            <div key={application.id} className="simple-list__item">
                                                <div>
                                                    <strong>{application.opportunityTitle || `Возможность #${application.opportunityId}`}</strong>
                                                    <p>Дата отклика: {formatDate(application.createdAt)}</p>
                                                </div>
                                                <span className={`status-badge status-${getApplicationStatusClass(application.status)}`}>
                                                    {formatApplicationStatus(application.status)}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted">Нет доступных откликов</p>
                                )}
                            </section>
                        )}

                        {contactsVisible && (
                            <section className="applicant-public-profile__section-card">
                                <h2>Профессиональные контакты</h2>

                                {contacts.length > 0 ? (
                                    <div className="simple-list">
                                        {contacts.map((contact) => (
                                            <div key={contact.contactUserId} className="simple-list__item">
                                                <div>
                                                    <strong>{contact.contactName || `Пользователь #${contact.contactUserId}`}</strong>
                                                    <p>Добавлен: {formatDate(contact.createdAt)}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-muted">Контакты скрыты или отсутствуют</p>
                                )}
                            </section>
                        )}
                    </div>
                )}
            </main>
        </div>
    )
}