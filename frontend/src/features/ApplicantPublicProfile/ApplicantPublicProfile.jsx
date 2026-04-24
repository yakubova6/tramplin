import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useRoute } from 'wouter'
import Navbar from '@/shared/layouts/Navbar'
import Button from '@/shared/ui/Button'
import { useToast } from '@/shared/hooks/use-toast'
import { getSessionUser } from '@/shared/lib/utils/sessionStore'
import {
    getSeekerContacts,
    addContact,
    acceptContact,
    declineContact,
    removeContact,
} from '@/shared/api/profile'
import './ApplicantPublicProfile.scss'

import userAvatarIcon from '@/assets/icons/user-avatar.svg'
import linkIcon from '@/assets/icons/link.svg'

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

function canShowBlock(
    visibility,
    {
        isOwner = false,
        isAuthenticated = false,
        isAcceptedContact = false,
        allowServerOverride = false,
    } = {}
) {
    if (isOwner) return true
    if (allowServerOverride) return true
    if (visibility === 'PUBLIC') return true
    if (visibility === 'AUTHENTICATED') return isAuthenticated
    if (visibility === 'CONTACTS_ONLY') return isAcceptedContact
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

function findViewerRelationship(contacts, applicantId) {
    if (!Array.isArray(contacts) || !applicantId) return null
    return contacts.find((item) => Number(item.id) === Number(applicantId)) || null
}

function upsertViewerRelationship(contacts, relationship) {
    if (!Array.isArray(contacts)) return relationship ? [relationship] : []
    if (!relationship?.id) return contacts

    const nextContacts = contacts.filter((item) => Number(item.id) !== Number(relationship.id))
    nextContacts.push(relationship)
    return nextContacts
}

function removeViewerRelationship(contacts, applicantId) {
    if (!Array.isArray(contacts)) return []
    return contacts.filter((item) => Number(item.id) !== Number(applicantId))
}

function isAcceptedRelationship(relationship) {
    return relationship?.status === 'ACCEPTED'
}

function isOutgoingRelationship(relationship) {
    return relationship?.direction === 'OUTGOING'
}

function isIncomingRelationship(relationship) {
    return relationship?.direction === 'INCOMING'
}

function getRelationshipStatusLabel(status) {
    switch (status) {
        case 'PENDING':
            return 'Ожидает подтверждения'
        case 'ACCEPTED':
            return 'Подтверждён'
        case 'DECLINED':
            return 'Отклонён'
        case 'BLOCKED':
            return 'Недоступен'
        default:
            return status || 'Неизвестно'
    }
}

function hasProfileBlockAccessFromResponse(profile) {
    if (!profile) return false

    return Boolean(
        profile.firstName ||
        profile.lastName ||
        profile.middleName ||
        profile.universityName ||
        profile.facultyName ||
        profile.studyProgram ||
        profile.course ||
        profile.graduationYear ||
        profile.city?.name ||
        profile.about ||
        profile.avatar
    )
}

function hasResumeBlockAccessFromResponse(profile) {
    if (!profile) return false

    return Boolean(
        profile.resumeText ||
        profile.resumeFile ||
        (Array.isArray(profile.portfolioLinks) && profile.portfolioLinks.length > 0) ||
        (Array.isArray(profile.portfolioFiles) && profile.portfolioFiles.length > 0) ||
        (Array.isArray(profile.skills) && profile.skills.length > 0) ||
        (Array.isArray(profile.interests) && profile.interests.length > 0)
    )
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
    const isOwner = Boolean(currentUserId && applicantId && currentUserId === applicantId)

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
            setProfile(null)
            setApplications([])
            setContacts([])
            setViewerContacts([])
            setOptimisticContactState(null)
            setErrorState({
                title: '',
                message: '',
                kind: '',
            })

            try {
                const [profileData, loadedViewerContacts] = await Promise.all([
                    getApplicantPublicProfile(applicantId, currentUserId),
                    isApplicantViewer && !isOwner
                        ? getSeekerContacts()
                            .then((myContacts) => (Array.isArray(myContacts) ? myContacts : []))
                            .catch(() => [])
                        : Promise.resolve([]),
                ])

                if (!isMounted) return

                setProfile(profileData)
                setViewerContacts(loadedViewerContacts)

                const viewerRelationship = findViewerRelationship(loadedViewerContacts, applicantId)
                const isAcceptedContactViewer = isAcceptedRelationship(viewerRelationship)

                const canViewApplications = canShowBlock(profileData?.applicationsVisibility || 'PRIVATE', {
                    isOwner,
                    isAuthenticated,
                    isAcceptedContact: isAcceptedContactViewer,
                })

                const canViewContacts = canShowBlock(profileData?.contactsVisibility || 'PRIVATE', {
                    isOwner,
                    isAuthenticated,
                    isAcceptedContact: isAcceptedContactViewer,
                })
                const tasks = []

                if (canViewApplications) {
                    tasks.push(
                        getApplicantPublicApplications(applicantId, currentUserId)
                            .then((applicationsData) => {
                                if (isMounted) {
                                    setApplications(Array.isArray(applicationsData) ? applicationsData : [])
                                }
                            })
                            .catch(() => {
                                if (isMounted) {
                                    setApplications([])
                                }
                            })
                    )
                } else if (isMounted) {
                    setApplications([])
                }

                if (canViewContacts) {
                    tasks.push(
                        getApplicantPublicContacts(applicantId, currentUserId)
                            .then((contactsData) => {
                                if (isMounted) {
                                    setContacts(Array.isArray(contactsData) ? contactsData : [])
                                }
                            })
                            .catch(() => {
                                if (isMounted) {
                                    setContacts([])
                                }
                            })
                    )
                } else if (isMounted) {
                    setContacts([])
                }

                if (tasks.length > 0) {
                    await Promise.all(tasks)
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
    }, [
        applicantId,
        currentUserId,
        isApplicantViewer,
        isAuthenticated,
        isOwner,
        match,
        toast,
    ])

    const relationship = useMemo(() => {
        if (!applicantId) return optimisticContactState

        const serverRelationship = findViewerRelationship(viewerContacts, applicantId)
        return optimisticContactState || serverRelationship
    }, [viewerContacts, applicantId, optimisticContactState])

    const isAcceptedContactViewer = isAcceptedRelationship(relationship)

    const profileVisible = profile
        ? canShowBlock(profile.profileVisibility, {
            isOwner,
            isAuthenticated,
            isAcceptedContact: isAcceptedContactViewer,
            allowServerOverride: hasProfileBlockAccessFromResponse(profile),
        })
        : false

    const resumeVisible = profile
        ? canShowBlock(profile.resumeVisibility, {
            isOwner,
            isAuthenticated,
            isAcceptedContact: isAcceptedContactViewer,
            allowServerOverride: hasResumeBlockAccessFromResponse(profile),
        })
        : false

    const applicationsVisible = profile
        ? canShowBlock(profile.applicationsVisibility, {
            isOwner,
            isAuthenticated,
            isAcceptedContact: isAcceptedContactViewer,
        })
        : false

    const contactsVisible = profile
        ? canShowBlock(profile.contactsVisibility, {
            isOwner,
            isAuthenticated,
            isAcceptedContact: isAcceptedContactViewer,
        })
        : false

    const handleAddContact = async () => {
        if (!applicantId) return

        const optimisticPending = {
            id: applicantId,
            status: 'PENDING',
            direction: 'OUTGOING',
        }

        try {
            setIsContactActionLoading(true)
            setOptimisticContactState(optimisticPending)

            await addContact(applicantId)
            setViewerContacts((prev) => upsertViewerRelationship(prev, optimisticPending))
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

            const relationshipAfterError = findViewerRelationship(myContacts, applicantId)

            if (
                relationshipAfterError?.status === 'PENDING' ||
                relationshipAfterError?.status === 'ACCEPTED'
            ) {
                setOptimisticContactState({
                    id: applicantId,
                    status: relationshipAfterError.status,
                    direction: relationshipAfterError.direction || 'OUTGOING',
                })

                toast({
                    title:
                        relationshipAfterError.status === 'ACCEPTED'
                            ? 'Контакт уже подтверждён'
                            : 'Запрос уже отправлен',
                    description:
                        relationshipAfterError.status === 'ACCEPTED'
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

            if (error?.status === 403 && error?.code === 'contact_request_blocked') {
                setOptimisticContactState({
                    id: applicantId,
                    status: 'BLOCKED',
                    direction: relationshipAfterError?.direction || 'OUTGOING',
                })

                toast({
                    title: 'Запрос недоступен',
                    description:
                        error.message || 'Этому пользователю нельзя отправить повторный запрос в контакты.',
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
            const acceptedRelationship = {
                id: applicantId,
                status: 'ACCEPTED',
                direction: 'CONFIRMED',
            }

            await acceptContact(applicantId)
            setViewerContacts((prev) => upsertViewerRelationship(prev, acceptedRelationship))
            setOptimisticContactState(acceptedRelationship)

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
            setViewerContacts((prev) => removeViewerRelationship(prev, applicantId))
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
            setViewerContacts((prev) => removeViewerRelationship(prev, applicantId))
            setOptimisticContactState(null)

            toast({
                title: isOutgoingRelationship(relationship) ? 'Запрос отменён' : 'Контакт удалён',
                description:
                    isOutgoingRelationship(relationship)
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
                        <span className="applicant-public-profile__contact-title">
                            Профессиональный контакт
                        </span>
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
                        <span className="applicant-public-profile__contact-title">
                            Добавить в профессиональные контакты
                        </span>
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

        if (relationship.status === 'BLOCKED') {
            return (
                <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--pending">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Запрос недоступен</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Для этого пользователя новые запросы в контакты сейчас недоступны.
                        </span>
                    </div>

                    <div className="applicant-public-profile__contact-actions">
                        <span className="badge badge--info">{getRelationshipStatusLabel(relationship.status)}</span>
                    </div>
                </div>
            )
        }

        if (relationship.status === 'DECLINED') {
            return (
                <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--pending">
                    <div className="applicant-public-profile__contact-panel-text">
                        <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                        <span className="applicant-public-profile__contact-title">Запрос был отклонён</span>
                        <span className="applicant-public-profile__contact-subtitle">
                            Вы можете попробовать отправить запрос повторно.
                        </span>
                    </div>

                    <div className="applicant-public-profile__contact-actions">
                        <span className="badge badge--info">{getRelationshipStatusLabel(relationship.status)}</span>
                        <Button
                            className="button--primary"
                            onClick={handleAddContact}
                            disabled={isContactActionLoading}
                        >
                            {isContactActionLoading ? 'Отправка...' : 'Отправить снова'}
                        </Button>
                    </div>
                </div>
            )
        }

        if (relationship.status === 'PENDING' && isOutgoingRelationship(relationship)) {
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

        if (relationship.status === 'PENDING' && isIncomingRelationship(relationship)) {
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

        return (
            <div className="applicant-public-profile__contact-panel applicant-public-profile__contact-panel--default">
                <div className="applicant-public-profile__contact-panel-text">
                    <span className="applicant-public-profile__contact-kicker">Нетворкинг</span>
                    <span className="applicant-public-profile__contact-title">Профессиональный контакт</span>
                    <span className="applicant-public-profile__contact-subtitle">
                        Текущий статус: {getRelationshipStatusLabel(relationship.status)}.
                    </span>
                </div>

                <Button
                    className="button--primary"
                    onClick={handleAddContact}
                    disabled={isContactActionLoading}
                >
                    {isContactActionLoading ? 'Отправка...' : 'Отправить запрос'}
                </Button>
            </div>
        )
    }

    const avatarUrl = profile?.avatar?.fileId
        ? getApplicantFileUrl(profile.userId || applicantId, profile.avatar.fileId)
        : null

    const resumeFileUrl = profile?.resumeFile?.fileId
        ? getApplicantFileUrl(profile.userId || applicantId, profile.resumeFile.fileId)
        : null

    const shouldShowError = !isLoading && errorState.message
    const shouldShowContent = !isLoading && profile && !errorState.message

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
                                    <div>
                                        <h1>{profileVisible ? getFullName(profile) || 'Соискатель' : 'Соискатель'}</h1>

                                        {!profileVisible && (
                                            <p className="text-muted">
                                                Основной профиль скрыт настройками приватности. Доступные разделы ниже
                                                показаны по текущим правам просмотра.
                                            </p>
                                        )}
                                    </div>

                                    {isOwner && (
                                        <Link href="/seeker">
                                            <Button className="button--outline">Вернуться в кабинет</Button>
                                        </Link>
                                    )}
                                </div>

                                {profileVisible && (
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
                                )}

                                <div className="applicant-public-profile__badges">
                                    {profile.openToWork && <span className="badge badge--success">Открыт к работе</span>}
                                    {profile.openToEvents && <span className="badge badge--info">Открыт к мероприятиям</span>}
                                </div>

                                <div className="applicant-public-profile__hero-actions">
                                    {renderContactAction()}
                                </div>
                            </div>
                        </section>

                        {profileVisible && profile.about && (
                            <section className="applicant-public-profile__section-card">
                                <h2>О соискателе</h2>
                                <p className="applicant-public-profile__multiline">{profile.about}</p>
                            </section>
                        )}

                        <section className="applicant-public-profile__section-card">
                            <h2>Резюме и опыт</h2>

                            {resumeVisible ? (
                                <>
                                    {profile.resumeText ? (
                                        <p className="applicant-public-profile__multiline">{profile.resumeText}</p>
                                    ) : (
                                        <p className="text-muted">Текст резюме не заполнен</p>
                                    )}

                                    {resumeFileUrl && (
                                        <div className="applicant-public-profile__subsection">
                                            <h3>Прикреплённое резюме</h3>

                                            <div className="links-list">
                                                <a
                                                    href={resumeFileUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="profile-link"
                                                >
                                                    <div className="profile-link__main">
                                                        <img src={linkIcon} alt="" className="profile-link__icon" />
                                                        <span>{profile.resumeFile?.originalFileName || 'Открыть резюме'}</span>
                                                    </div>

                                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                        <path d="M7 17L17 7" />
                                                        <path d="M7 7H17V17" />
                                                    </svg>
                                                </a>
                                            </div>
                                        </div>
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
                                </>
                            ) : (
                                <p className="text-muted">Раздел скрыт настройками приватности.</p>
                            )}
                        </section>

                        <section className="applicant-public-profile__section-card">
                            <h2>Портфолио и проекты</h2>

                            {resumeVisible ? (
                                <>
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
                                        <p className="text-muted">Ссылки на проекты пока не добавлены</p>
                                    )}

                                    {Array.isArray(profile.portfolioFiles) && profile.portfolioFiles.length > 0 && (
                                        <div className="applicant-public-profile__subsection">
                                            <h3>Файлы портфолио</h3>

                                            <div className="links-list">
                                                {profile.portfolioFiles.map((file) => {
                                                    const fileUrl = getApplicantFileUrl(profile.userId || applicantId, file.fileId)

                                                    return (
                                                        <a
                                                            key={file.fileId}
                                                            href={fileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="profile-link"
                                                        >
                                                            <div className="profile-link__main">
                                                                <img src={linkIcon} alt="" className="profile-link__icon" />
                                                                <span>{file.originalFileName}</span>
                                                            </div>

                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                                                <path d="M7 17L17 7" />
                                                                <path d="M7 7H17V17" />
                                                            </svg>
                                                        </a>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <p className="text-muted">Раздел скрыт настройками приватности.</p>
                            )}
                        </section>

                        <section className="applicant-public-profile__section-card">
                            <h2>Контакты для связи</h2>

                            {contactsVisible ? (
                                Array.isArray(profile.contactLinks) && profile.contactLinks.length > 0 ? (
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
                                ) : (
                                    <p className="text-muted">Контакты для связи не добавлены</p>
                                )
                            ) : (
                                <p className="text-muted">Раздел скрыт настройками приватности.</p>
                            )}
                        </section>

                        <section className="applicant-public-profile__section-card">
                            <h2>История откликов</h2>

                            {applicationsVisible ? (
                                applications.length > 0 ? (
                                    <div className="simple-list">
                                        {applications.map((application) => (
                                            <div key={application.id} className="simple-list__item">
                                                <div>
                                                    <strong>
                                                        {application.opportunityTitle || `Возможность #${application.opportunityId}`}
                                                    </strong>
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
                                )
                            ) : (
                                <p className="text-muted">Раздел скрыт настройками приватности.</p>
                            )}
                        </section>

                        <section className="applicant-public-profile__section-card">
                            <h2>Профессиональные контакты</h2>

                            {contactsVisible ? (
                                contacts.length > 0 ? (
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
                                    <p className="text-muted">Подтверждённые контакты пока не отображаются</p>
                                )
                            ) : (
                                <p className="text-muted">Раздел скрыт настройками приватности.</p>
                            )}
                        </section>
                    </div>
                )}
            </main>
        </div>
    )
}
