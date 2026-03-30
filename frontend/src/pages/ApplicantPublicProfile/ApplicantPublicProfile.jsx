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
    return false
}

function getFullName(profile) {
    return [profile.lastName, profile.firstName, profile.middleName]
        .filter(Boolean)
        .join(' ')
        .trim()
}

export default function ApplicantPublicProfile() {
    const [, navigate] = useLocation()
    const [, params] = useRoute('/seekers/:id')
    const { toast } = useToast()

    const currentUser = useMemo(() => getSessionUser(), [])
    const currentUserId = currentUser?.id || null
    const isAuthenticated = Boolean(currentUserId)
    const isApplicantViewer = currentUser?.role === 'APPLICANT'

    const [profile, setProfile] = useState(null)
    const [applications, setApplications] = useState([])
    const [contacts, setContacts] = useState([])
    const [viewerContacts, setViewerContacts] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isContactActionLoading, setIsContactActionLoading] = useState(false)
    const [error, setError] = useState('')

    const applicantId = params?.id ? Number(params.id) : null
    const isOwner = currentUserId && applicantId && currentUserId === applicantId

    useEffect(() => {
        if (!applicantId) {
            setError('Некорректный идентификатор профиля')
            setIsLoading(false)
            return
        }

        let isMounted = true

        async function loadProfile() {
            setIsLoading(true)
            setError('')

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

                if (
                    isApplicantViewer &&
                    !isOwner
                ) {
                    try {
                        const myContacts = await getSeekerContacts()
                        if (isMounted) {
                            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])
                        }
                    } catch {
                        if (isMounted) setViewerContacts([])
                    }
                }

                if (
                    !canShowBlock(profileVisibility, isOwner, isAuthenticated) &&
                    !isOwner
                ) {
                    setError('Этот профиль скрыт настройками приватности')
                }
            } catch (loadError) {
                if (!isMounted) return

                setError(loadError.message || 'Не удалось загрузить профиль')
                toast({
                    title: 'Ошибка',
                    description: loadError.message || 'Не удалось загрузить профиль',
                    variant: 'destructive',
                })
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
    }, [applicantId, currentUserId, isAuthenticated, isOwner, isApplicantViewer, toast])

    const relationship = useMemo(() => {
        if (!applicantId || !Array.isArray(viewerContacts)) return null
        return viewerContacts.find((item) => Number(item.id) === Number(applicantId)) || null
    }, [viewerContacts, applicantId])

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

        try {
            setIsContactActionLoading(true)
            await addContact(applicantId)

            const myContacts = await getSeekerContacts()
            setViewerContacts(Array.isArray(myContacts) ? myContacts : [])

            toast({
                title: 'Заявка отправлена',
                description: 'Пользователь увидит её во входящих заявках',
            })
        } catch (error) {
            const message = error?.message || ''

            if (
                message.toLowerCase().includes('already exists') ||
                message.toLowerCase().includes('contact already exists') ||
                message.toLowerCase().includes('already')
            ) {
                const myContacts = await getSeekerContacts()
                setViewerContacts(Array.isArray(myContacts) ? myContacts : [])

                toast({
                    title: 'Контакт уже существует',
                    description: 'Заявка уже была отправлена ранее или пользователь уже есть в контактах',
                })
                return
            }

            toast({
                title: 'Ошибка',
                description: message || 'Не удалось отправить заявку',
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

            toast({
                title: 'Заявка принята',
                description: 'Контакт успешно подтверждён',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось принять заявку',
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

            toast({
                title: 'Заявка отклонена',
                description: 'Запрос удалён из входящих',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отклонить заявку',
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

            toast({
                title: relationship?.direction === 'outgoing' ? 'Заявка отменена' : 'Контакт удалён',
                description: relationship?.direction === 'outgoing'
                    ? 'Исходящая заявка отменена'
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
                <Link href="/login">
                    <Button className="button--outline">Войти, чтобы добавить в контакты</Button>
                </Link>
            )
        }

        if (!relationship) {
            return (
                <Button
                    className="button--primary"
                    onClick={handleAddContact}
                    disabled={isContactActionLoading}
                >
                    {isContactActionLoading ? 'Отправка...' : 'Добавить в контакты'}
                </Button>
            )
        }

        if (relationship.status === 'ACCEPTED') {
            return (
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
            )
        }

        if (relationship.status === 'PENDING' && relationship.direction === 'outgoing') {
            return (
                <div className="applicant-public-profile__contact-actions">
                    <span className="badge badge--info">Заявка отправлена</span>
                    <Button
                        className="button--outline"
                        onClick={handleRemoveContact}
                        disabled={isContactActionLoading}
                    >
                        Отменить заявку
                    </Button>
                </div>
            )
        }

        return (
            <div className="applicant-public-profile__contact-actions">
                <Button
                    className="button--primary"
                    onClick={handleAcceptContact}
                    disabled={isContactActionLoading}
                >
                    Принять заявку
                </Button>
                <Button
                    className="button--outline"
                    onClick={handleDeclineContact}
                    disabled={isContactActionLoading}
                >
                    Отклонить
                </Button>
            </div>
        )
    }

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

                {!isLoading && error && (
                    <div className="applicant-public-profile__error-card">
                        <p>{error}</p>
                        <Link href="/">
                            <Button>На главную</Button>
                        </Link>
                    </div>
                )}

                {!isLoading && profile && profileVisible && (
                    <div className="applicant-public-profile__grid">
                        <section className="applicant-public-profile__hero-card">
                            <div className="applicant-public-profile__avatar">
                                {(profile.firstName?.[0] || '')}{(profile.lastName?.[0] || '')}
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
                                    {profile.city?.name && (
                                        <div className="meta-item">
                                            <strong>Город:</strong> <span>{profile.city.name}</span>
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
                                                <span>{link.label || link.url}</span>
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
                                                    <strong>{contact.label || contact.type}:</strong> {contact.value}
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
                                                <span className={`status-badge status-${application.status?.toLowerCase() || 'default'}`}>
                                                    {application.status}
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