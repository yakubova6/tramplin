import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '@/shared/hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Input from '@/shared/ui/Input'
import Label from '@/shared/ui/Label'
import Textarea from '@/shared/ui/Textarea'
import CustomSelect from '@/shared/ui/CustomSelect'
import CustomCheckbox from '@/shared/ui/CustomCheckbox'
import LinksEditor from '@/shared/ui/LinksEditor'
import Button from '@/shared/ui/Button'
import {
    getCurrentSessionUser,
    getApplicantProfile,
    updateApplicantProfile,
    submitApplicantProfileForModeration,
    getSeekerApplications,
    getSeekerContacts,
    removeFromSaved,
    removeContact,
    acceptContact,
    declineContact,
    searchCities,
    getSeekerRecommendations,
    sendSeekerRecommendation,
    removeSeekerRecommendation,
    uploadApplicantAvatar,
    uploadApplicantResumeFile,
    uploadApplicantPortfolioFile,
    deleteApplicantFile,
    getFileDownloadUrlByUserAndFile,
} from '@/shared/api/profile'
import { getCachedSavedFavorites, getSavedFavorites, removeEmployerFromSaved } from '@/shared/api/favorites'
import SavedFavoritesSection from './components/SavedFavoritesSection'
import RecommendationsSection from './components/RecommendationsSection'
import '../DashboardBase.scss'
import './SeekerDashboard.scss'

import userAvatarIcon from '@/assets/icons/user-avatar.svg'
import briefcaseIcon from '@/assets/icons/briefcase.svg'
import calendarIcon from '@/assets/icons/calendar.svg'
import locationIcon from '@/assets/icons/location.svg'
import editIcon from '@/assets/icons/edit.svg'
import pencilIcon from '@/assets/icons/pencil.svg'
import linkIcon from '@/assets/icons/link.svg'
import trashIcon from '@/assets/icons/trash.svg'
import cameraIcon from '@/assets/icons/camera-icon.svg'

const PROFILE_VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

const CONTACTS_BASED_VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'CONTACTS_ONLY', label: 'Только контактам' },
    { value: 'PRIVATE', label: 'Только мне' },
]

const DASHBOARD_TAB_ITEMS = [
    { key: 'profile', label: 'Профиль' },
    { key: 'applications', label: 'Отклики' },
    { key: 'saved', label: 'Избранное' },
    { key: 'contacts', label: 'Контакты' },
    { key: 'recommendations', label: 'Рекомендации' },
]

const CONTACT_LINK_PRESETS = [
    {
        id: 'telegram',
        label: 'Telegram',
        shortLabel: 'TG',
        placeholder: '@username или https://t.me/username',
        hint: 'Можно вставить никнейм или полную ссылку',
    },
    {
        id: 'email',
        label: 'Email',
        shortLabel: 'Email',
        placeholder: 'name@example.com',
        hint: 'Лучше указывать рабочую или основную почту',
    },
    {
        id: 'phone',
        label: 'Телефон',
        shortLabel: 'Tel',
        placeholder: '+7 999 123-45-67',
        hint: 'Номер будет удобнее, если начать с кода страны',
    },
    {
        id: 'whatsapp',
        label: 'WhatsApp',
        shortLabel: 'WA',
        placeholder: '+7 999 123-45-67 или https://wa.me/79991234567',
        hint: 'Можно вставить номер или готовую ссылку',
    },
    {
        id: 'linkedin',
        label: 'LinkedIn',
        shortLabel: 'in',
        placeholder: 'https://linkedin.com/in/username',
        hint: 'Подходит для профессионального профиля',
    },
    {
        id: 'github',
        label: 'GitHub',
        shortLabel: 'GH',
        placeholder: 'https://github.com/username',
        hint: 'Удобно для технического портфолио',
    },
    {
        id: 'website',
        label: 'Сайт',
        shortLabel: 'Web',
        placeholder: 'https://your-site.com',
        hint: 'Личный сайт, Notion, Behance или другая публичная страница',
    },
]

const CONTACT_PRESET_BY_ID = CONTACT_LINK_PRESETS.reduce((acc, preset) => {
    acc[preset.id] = preset
    return acc
}, {})

const SOCIAL_LINK_PRESETS = CONTACT_LINK_PRESETS.filter((preset) =>
    ['telegram', 'linkedin', 'github', 'website'].includes(preset.id)
)

const CONTACT_METHOD_PRESETS = CONTACT_LINK_PRESETS.filter((preset) =>
    ['telegram', 'email', 'phone', 'whatsapp', 'website'].includes(preset.id)
)

function formatFileSize(sizeBytes) {
    if (!sizeBytes) return '0 Б'
    if (sizeBytes < 1024) return `${sizeBytes} Б`
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} КБ`
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
}

function mapApplicantProfileToState(profileData = {}, currentUser = null) {
    return {
        userId: profileData.userId || currentUser?.id || null,
        firstName: profileData.firstName || '',
        lastName: profileData.lastName || '',
        middleName: profileData.middleName || '',
        universityName: profileData.universityName || '',
        facultyName: profileData.facultyName || '',
        studyProgram: profileData.studyProgram || '',
        course: profileData.course ?? '',
        graduationYear: profileData.graduationYear ?? '',
        cityId: profileData.cityId || profileData.city?.id || null,
        cityName: profileData.cityName || profileData.city?.name || '',
        about: profileData.about || '',
        resumeText: profileData.resumeText || '',
        portfolioLinks: Array.isArray(profileData.portfolioLinks) ? profileData.portfolioLinks : [],
        contactLinks: Array.isArray(profileData.contactLinks) ? profileData.contactLinks : [],
        profileVisibility: profileData.profileVisibility || 'AUTHENTICATED',
        resumeVisibility: profileData.resumeVisibility || 'AUTHENTICATED',
        applicationsVisibility: profileData.applicationsVisibility || 'PRIVATE',
        contactsVisibility: profileData.contactsVisibility || 'AUTHENTICATED',
        openToWork: profileData.openToWork ?? true,
        openToEvents: profileData.openToEvents ?? true,
        moderationStatus: profileData.moderationStatus || 'DRAFT',
        avatar: profileData.avatar || null,
        resumeFile: profileData.resumeFile || null,
        portfolioFiles: Array.isArray(profileData.portfolioFiles) ? profileData.portfolioFiles : [],
        skills: Array.isArray(profileData.skills) ? profileData.skills : [],
        interests: Array.isArray(profileData.interests) ? profileData.interests : [],
    }
}

function createContactLinkRow(presetId = 'website') {
    const preset = CONTACT_PRESET_BY_ID[presetId] || CONTACT_LINK_PRESETS[CONTACT_LINK_PRESETS.length - 1]

    return {
        id: Date.now() + Math.random(),
        title: preset.label,
        url: '',
    }
}

function detectContactPreset(link = {}) {
    const rawLabel = String(link?.title || link?.label || '').trim().toLowerCase()
    const rawUrl = String(link?.url || link?.value || '').trim().toLowerCase()

    if (rawLabel.includes('telegram') || rawUrl.includes('t.me/') || rawUrl.startsWith('@')) {
        return CONTACT_PRESET_BY_ID.telegram
    }

    if (rawLabel.includes('email') || rawUrl.includes('@') || rawUrl.startsWith('mailto:')) {
        return CONTACT_PRESET_BY_ID.email
    }

    if (rawLabel.includes('whatsapp') || rawUrl.includes('wa.me/') || rawUrl.includes('whatsapp')) {
        return CONTACT_PRESET_BY_ID.whatsapp
    }

    if (rawLabel.includes('phone') || rawLabel.includes('тел') || rawUrl.startsWith('tel:')) {
        return CONTACT_PRESET_BY_ID.phone
    }

    if (rawLabel.includes('linkedin') || rawUrl.includes('linkedin.com/')) {
        return CONTACT_PRESET_BY_ID.linkedin
    }

    if (rawLabel.includes('github') || rawUrl.includes('github.com/')) {
        return CONTACT_PRESET_BY_ID.github
    }

    return CONTACT_PRESET_BY_ID.website
}

function buildContactHref(rawValue, preset) {
    const value = String(rawValue || '').trim()

    if (!value) return '#'

    if (/^(https?:\/\/|mailto:|tel:)/i.test(value)) {
        return value
    }

    switch (preset?.id) {
        case 'email':
            return `mailto:${value}`
        case 'phone':
            return `tel:${value.replace(/[^\d+]/g, '')}`
        case 'telegram':
            return value.startsWith('@') ? `https://t.me/${value.slice(1)}` : `https://t.me/${value}`
        case 'whatsapp': {
            const phone = value.replace(/[^\d]/g, '')
            return phone ? `https://wa.me/${phone}` : value
        }
        default:
            return /^https?:\/\//i.test(value) ? value : `https://${value}`
    }
}

function SeekerDashboard() {
    const [activeTab, setActiveTab] = useState('profile')
    const [contactsTab, setContactsTab] = useState('confirmed')
    const [recommendationsTab, setRecommendationsTab] = useState('incoming')
    const [user, setUser] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingAbout, setIsEditingAbout] = useState(false)
    const [isEditingResume, setIsEditingResume] = useState(false)
    const [isEditingPortfolio, setIsEditingPortfolio] = useState(false)
    const [isEditingContacts, setIsEditingContacts] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [isContactsLoading, setIsContactsLoading] = useState(false)
    const [isRecommendationsLoading, setIsRecommendationsLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const { toast } = useToast()

    const [networkingBlockedMessage, setNetworkingBlockedMessage] = useState('')
    const [hasLoadedNetworking, setHasLoadedNetworking] = useState(false)

    const avatarInputRef = useRef(null)
    const resumeFileInputRef = useRef(null)
    const portfolioFileInputRef = useRef(null)
    const dashboardTabsRef = useRef(null)
    const dashboardTabButtonRefs = useRef({})

    const [isAvatarUploading, setIsAvatarUploading] = useState(false)
    const [isResumeFileUploading, setIsResumeFileUploading] = useState(false)
    const [isPortfolioFileUploading, setIsPortfolioFileUploading] = useState(false)
    const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('')

    const [profile, setProfile] = useState({
        userId: null,
        firstName: '',
        lastName: '',
        middleName: '',
        universityName: '',
        facultyName: '',
        studyProgram: '',
        course: '',
        graduationYear: '',
        cityId: null,
        cityName: '',
        about: '',
        resumeText: '',
        portfolioLinks: [],
        contactLinks: [],
        profileVisibility: 'AUTHENTICATED',
        resumeVisibility: 'AUTHENTICATED',
        applicationsVisibility: 'PRIVATE',
        contactsVisibility: 'AUTHENTICATED',
        openToWork: true,
        openToEvents: true,
        moderationStatus: 'DRAFT',
        avatar: null,
        resumeFile: null,
        portfolioFiles: [],
        skills: [],
        interests: [],
    })

    const [tempPortfolioLinks, setTempPortfolioLinks] = useState([])
    const [tempContactLinks, setTempContactLinks] = useState([])

    const [applications, setApplications] = useState([])
    const [savedFavorites, setSavedFavorites] = useState(() => getCachedSavedFavorites())
    const [contacts, setContacts] = useState([])
    const [recommendations, setRecommendations] = useState({ incoming: [], outgoing: [] })

    const [recommendationModal, setRecommendationModal] = useState({
        isOpen: false,
        selectedOpportunityId: '',
        selectedContactId: '',
        message: '',
    })
    const recommendationOverlayMouseDownStartedOutsideRef = useRef(false)

    const [isCitySearchOpen, setIsCitySearchOpen] = useState(false)
    const [citySearchQuery, setCitySearchQuery] = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const [cityActiveIndex, setCityActiveIndex] = useState(-1)
    const citySearchRef = useRef(null)
    const [, navigate] = useLocation()

    const moderationState = profile.moderationStatus || 'DRAFT'
    const canSubmitForModeration = moderationState === 'DRAFT' || moderationState === 'NEEDS_REVISION'

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана'
        const date = new Date(dateString)
        if (Number.isNaN(date.getTime())) return 'Дата не указана'
        return date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })
    }

    const linksToArray = (linksArray) => {
        if (!linksArray || !Array.isArray(linksArray)) return []
        return linksArray.map((item, index) => ({
            id: index + 1 + Date.now() + index,
            title: item?.label || item?.title || '',
            url: item?.url || item?.value || item || '',
        }))
    }

    const isNetworkingBlockedError = (error) =>
        error?.status === 403 &&
        error?.code === 'applicant_networking_requires_approved_profile'

    const applyProfileFromApi = useCallback((profileData, currentUser) => {
        if (!profileData) return

        const nextProfile = mapApplicantProfileToState(profileData, currentUser)

        setProfile(nextProfile)
        setCitySearchQuery(nextProfile.cityName || '')
        setTempPortfolioLinks(linksToArray(nextProfile.portfolioLinks || []))
        setTempContactLinks(linksToArray(nextProfile.contactLinks || []))
    }, [])

    const refreshApplicantFiles = useCallback(async () => {
        const freshProfile = await getApplicantProfile()
        if (!freshProfile) return
        applyProfileFromApi(freshProfile, user)
    }, [applyProfileFromApi, user])

    const reloadApplicantProfile = useCallback(async (currentUserOverride = user) => {
        const freshProfile = await getApplicantProfile()
        if (!freshProfile) return null
        applyProfileFromApi(freshProfile, currentUserOverride)
        return freshProfile
    }, [applyProfileFromApi, user])

    const handleCancelPortfolioEdit = () => {
        setTempPortfolioLinks(linksToArray(profile.portfolioLinks || []))
        setIsEditingPortfolio(false)
    }

    const handleCancelContactsEdit = () => {
        setTempContactLinks(linksToArray(profile.contactLinks || []))
        setIsEditingContacts(false)
    }

    const updateContactRow = (id, patch) => {
        setTempContactLinks((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    }

    const removeContactRow = (id) => {
        setTempContactLinks((prev) => prev.filter((row) => row.id !== id))
    }

    const addContactRow = (presetId = 'website') => {
        setTempContactLinks((prev) => [...prev, createContactLinkRow(presetId)])
    }

    const handleCitySearch = async (value) => {
        setCitySearchQuery(value)
        setProfile((prev) => ({
            ...prev,
            cityId: null,
            cityName: value,
        }))

        if (value.length < 2) {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
            return
        }

        try {
            const cities = await searchCities(value)
            setCitySuggestions(cities)
            setCityActiveIndex(-1)
            setIsCitySearchOpen(true)
        } catch {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
        }
    }

    const handleSelectCity = (city) => {
        setProfile((prev) => ({
            ...prev,
            cityId: city.id,
            cityName: city.name,
        }))
        setCitySearchQuery(city.name)
        setCitySuggestions([])
        setCityActiveIndex(-1)
        setIsCitySearchOpen(false)
    }

    const loadContacts = useCallback(async () => {
        setIsContactsLoading(true)
        try {
            const contactsList = await getSeekerContacts()
            setContacts(contactsList)
            setNetworkingBlockedMessage('')
        } catch (error) {
            if (isNetworkingBlockedError(error)) {
                setContacts([])
                setNetworkingBlockedMessage(
                    error?.message || 'Нетворкинг-функции доступны только после одобрения профиля соискателя куратором'
                )
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить контакты',
                variant: 'destructive',
            })
        } finally {
            setIsContactsLoading(false)
        }
    }, [toast])

    const loadRecommendations = useCallback(async () => {
        setIsRecommendationsLoading(true)
        try {
            const data = await getSeekerRecommendations()
            setRecommendations(data)
            setNetworkingBlockedMessage('')
        } catch (error) {
            if (isNetworkingBlockedError(error)) {
                setRecommendations({ incoming: [], outgoing: [] })
                setNetworkingBlockedMessage(
                    error?.message || 'Нетворкинг-функции доступны только после одобрения профиля соискателя куратором'
                )
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить рекомендации',
                variant: 'destructive',
            })
        } finally {
            setIsRecommendationsLoading(false)
        }
    }, [toast])

    useEffect(() => {
        let isMounted = true

        const loadData = async () => {
            setIsLoading(true)

            try {
                const currentUser = await getCurrentSessionUser()
                if (!isMounted) return
                setUser(currentUser)

                if (!currentUser) {
                    setApplications([])
                    setSavedFavorites({
                        opportunities: [],
                        employers: [],
                    })
                    setContacts([])
                    setRecommendations({ incoming: [], outgoing: [] })
                    setNetworkingBlockedMessage('')
                    setHasLoadedNetworking(true)
                    return
                }

                const profileResult = await getApplicantProfile()
                if (!isMounted) return

                if (profileResult) {
                    applyProfileFromApi(profileResult, currentUser)
                } else {
                    setProfile((prev) => ({
                        ...prev,
                        userId: currentUser.id,
                    }))
                }

                setIsLoading(false)

                const applicationsPromise = getSeekerApplications()
                    .then((items) => {
                        if (!isMounted) return
                        setApplications(items)
                    })
                    .catch(() => {
                        if (!isMounted) return
                        setApplications([])
                    })

                const favoritesPromise = getSavedFavorites()
                    .then((items) => {
                        if (!isMounted) return
                        setSavedFavorites(items)
                    })
                    .catch(() => {
                        if (!isMounted) return
                        setSavedFavorites({
                            opportunities: [],
                            employers: [],
                        })
                    })

                await Promise.allSettled([applicationsPromise, favoritesPromise])
            } catch (error) {
                if (error?.status === 401) {
                    setUser(null)
                    setApplications([])
                    setSavedFavorites({
                        opportunities: [],
                        employers: [],
                    })
                    setContacts([])
                    setRecommendations({ incoming: [], outgoing: [] })
                    setNetworkingBlockedMessage('')
                    setHasLoadedNetworking(true)
                    return
                }

                if (!isMounted) return

                toast({
                    title: 'Ошибка',
                    description: error?.message || 'Не удалось загрузить профиль',
                    variant: 'destructive',
                })
            } finally {
                if (isMounted) {
                    setIsLoading(false)
                }
            }
        }

        loadData()

        return () => {
            isMounted = false
        }
    }, [applyProfileFromApi, toast])

    useEffect(() => {
        if (!user?.id) return

        const loadNetworking = async () => {
            setNetworkingBlockedMessage('')
            setHasLoadedNetworking(false)

            try {
                const [contactsList, recommendationsData] = await Promise.all([
                    getSeekerContacts(),
                    getSeekerRecommendations(),
                ])

                setContacts(contactsList)
                setRecommendations(recommendationsData)
            } catch (error) {
                if (isNetworkingBlockedError(error)) {
                    setContacts([])
                    setRecommendations({ incoming: [], outgoing: [] })
                    setNetworkingBlockedMessage(
                        error?.message || 'Нетворкинг-функции доступны только после одобрения профиля соискателя куратором'
                    )
                    return
                }

                toast({
                    title: 'Ошибка',
                    description: error?.message || 'Не удалось загрузить нетворкинг-данные',
                    variant: 'destructive',
                })
            } finally {
                setHasLoadedNetworking(true)
            }
        }

        void loadNetworking()
    }, [user?.id, toast])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (citySearchRef.current && !citySearchRef.current.contains(event.target)) {
                setIsCitySearchOpen(false)
                setCityActiveIndex(-1)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => () => {
        if (avatarPreviewUrl) {
            URL.revokeObjectURL(avatarPreviewUrl)
        }
    }, [avatarPreviewUrl])

    const ensureDashboardTabVisible = useCallback((tabKey, behavior = 'smooth') => {
        const container = dashboardTabsRef.current
        const element = dashboardTabButtonRefs.current[tabKey]

        if (!container || !element) return

        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        const currentScroll = container.scrollLeft
        const elementLeft = elementRect.left - containerRect.left + currentScroll
        const elementRight = elementLeft + elementRect.width
        const targetScroll =
            elementLeft - (container.clientWidth - elementRect.width) / 2

        const needsScrollLeft = elementLeft < currentScroll
        const needsScrollRight = elementRight > currentScroll + container.clientWidth

        if (!needsScrollLeft && !needsScrollRight) return

        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth)

        container.scrollTo({
            left: Math.min(Math.max(0, targetScroll), maxScroll),
            behavior,
        })
    }, [])

    useEffect(() => {
        ensureDashboardTabVisible(activeTab, 'smooth')
    }, [activeTab, ensureDashboardTabVisible])

    const validateProfile = () => {
        const newErrors = {}

        if (!profile.firstName?.trim()) newErrors.firstName = 'Укажите имя'
        if (!profile.lastName?.trim()) newErrors.lastName = 'Укажите фамилию'
        if (!profile.course) newErrors.course = 'Укажите курс'
        if (!profile.graduationYear) newErrors.graduationYear = 'Укажите год выпуска'

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const submitApplicantProfileToModerationAction = async () => {
        const updatedProfile = await submitApplicantProfileForModeration()
        applyProfileFromApi({ ...profile, ...updatedProfile }, user)
        return updatedProfile
    }

    const maybeResubmitAfterSave = async (updatedProfile, baseDescription) => {
        if (profile.moderationStatus === 'APPROVED' || profile.moderationStatus === 'NEEDS_REVISION') {
            await submitApplicantProfileToModerationAction()
            toast({
                title: 'Обновлено',
                description: `${baseDescription}. Изменения автоматически отправлены на повторную модерацию`,
            })
            return
        }

        toast({
            title: 'Обновлено',
            description: baseDescription,
        })
    }

    const handleSubmitApplicantProfileForModeration = async () => {
        if (!validateProfile()) {
            toast({
                title: 'Проверьте форму',
                description: 'Заполните обязательные поля перед отправкой на модерацию',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            await updateApplicantProfile(profile)
            await reloadApplicantProfile()
            await submitApplicantProfileToModerationAction()

            toast({
                title: 'Профиль отправлен на модерацию',
                description: 'После проверки куратором нетворкинг и связанные функции станут доступны',
            })

            setIsEditing(false)
            setErrors({})
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось отправить профиль на модерацию',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveProfile = async () => {
        if (!validateProfile()) {
            toast({
                title: 'Проверьте форму',
                description: 'Заполните обязательные поля',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const updatedProfile = await updateApplicantProfile(profile)
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)

            if (profile.moderationStatus === 'APPROVED' || profile.moderationStatus === 'NEEDS_REVISION') {
                await submitApplicantProfileToModerationAction()
                toast({
                    title: 'Профиль обновлён',
                    description: 'Изменения сохранены и автоматически отправлены на повторную модерацию',
                })
            } else {
                toast({
                    title: 'Профиль сохранён',
                    description: 'Теперь отправьте профиль на модерацию отдельной кнопкой',
                })
            }

            setIsEditing(false)
            setErrors({})

            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    role: 'APPLICANT',
                },
            }))
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveAbout = async () => {
        setIsLoading(true)
        try {
            const updatedProfile = await updateApplicantProfile({ ...profile, about: profile.about })
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)
            setIsEditingAbout(false)
            await maybeResubmitAfterSave(updatedProfile, 'Информация о себе сохранена')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveResume = async () => {
        setIsLoading(true)
        try {
            const updatedProfile = await updateApplicantProfile({ ...profile, resumeText: profile.resumeText })
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)
            setIsEditingResume(false)
            await maybeResubmitAfterSave(updatedProfile, 'Резюме сохранено')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSavePortfolio = async () => {
        setIsLoading(true)
        try {
            const portfolioLinks = tempPortfolioLinks
                .filter((link) => link.url?.trim())
                .map((link) => ({
                    label: link.title?.trim() || '',
                    url: link.url.trim(),
                }))

            const updatedProfile = await updateApplicantProfile({ ...profile, portfolioLinks })
            applyProfileFromApi({ ...profile, ...updatedProfile, portfolioLinks }, user)
            setIsEditingPortfolio(false)
            await maybeResubmitAfterSave(updatedProfile, 'Портфолио сохранено')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить портфолио',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveContacts = async () => {
        setIsLoading(true)
        try {
            const contactLinks = tempContactLinks
                .filter((link) => link.url?.trim())
                .map((link) => ({
                    type: 'OTHER',
                    label: link.title?.trim() || '',
                    value: link.url.trim(),
                }))

            const updatedProfile = await updateApplicantProfile({ ...profile, contactLinks })
            applyProfileFromApi({ ...profile, ...updatedProfile, contactLinks }, user)
            setIsEditingContacts(false)
            await maybeResubmitAfterSave(updatedProfile, 'Контакты сохранены')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить контакты',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleFieldChange = (field, value) => {
        setProfile((prev) => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: '' }))
        }
    }

    const handleRemoveSaved = async (id, title) => {
        try {
            await removeFromSaved(id)
            setSavedFavorites((prev) => ({
                ...prev,
                opportunities: prev.opportunities.filter((opp) => opp.id !== id),
            }))
            toast({
                title: 'Удалено из избранного',
                description: `«${title}» удалено из избранного`,
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось удалить из избранного',
                variant: 'destructive',
            })
        }
    }

    const handleRemoveSavedEmployer = async (id, title) => {
        try {
            await removeEmployerFromSaved(id)
            setSavedFavorites((prev) => ({
                ...prev,
                employers: prev.employers.filter((employer) => employer.id !== id),
            }))
            toast({
                title: 'Удалено из избранного',
                description: `«${title}» удалён из избранных работодателей`,
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось удалить работодателя из избранного',
                variant: 'destructive',
            })
        }
    }

    const handleAcceptContact = async (userId) => {
        try {
            await acceptContact(userId)
            await loadContacts()
            toast({
                title: 'Заявка принята',
                description: 'Контакт добавлен в подтверждённые',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось принять заявку',
                variant: 'destructive',
            })
        }
    }

    const handleDeclineContact = async (userId) => {
        try {
            await declineContact(userId)
            await loadContacts()
            toast({
                title: 'Заявка отклонена',
                description: 'Контакт удалён из списка ожидания',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отклонить заявку',
                variant: 'destructive',
            })
        }
    }

    const handleRemoveContact = async (userId, direction = 'CONFIRMED') => {
        try {
            await removeContact(userId)
            await loadContacts()
            toast({
                title: direction === 'OUTGOING' ? 'Заявка отменена' : 'Контакт удалён',
                description: direction === 'OUTGOING'
                    ? 'Исходящая заявка отменена'
                    : 'Пользователь удалён из ваших контактов',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось удалить контакт',
                variant: 'destructive',
            })
        }
    }

    const handleSendRecommendation = async () => {
        if (!canSendRecommendation) {
            toast({
                title: 'Недостаточно данных',
                description: 'Нужен хотя бы один подтверждённый контакт и одна возможность для рекомендации',
                variant: 'destructive',
            })
            return
        }

        if (!recommendationModal.selectedOpportunityId || !recommendationModal.selectedContactId) {
            toast({
                title: 'Ошибка',
                description: 'Выберите контакт и возможность',
                variant: 'destructive',
            })
            return
        }

        try {
            await sendSeekerRecommendation({
                opportunityId: Number(recommendationModal.selectedOpportunityId),
                toApplicantUserId: Number(recommendationModal.selectedContactId),
                message: recommendationModal.message.trim(),
            })

            toast({
                title: 'Рекомендация отправлена',
                description: 'Контакт увидит её в своём кабинете',
            })

            setRecommendationModal({
                isOpen: false,
                selectedOpportunityId: '',
                selectedContactId: '',
                message: '',
            })

            await loadRecommendations()
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось отправить рекомендацию',
                variant: 'destructive',
            })
        }
    }

    const closeRecommendationModal = useCallback(() => {
        setRecommendationModal({
            isOpen: false,
            selectedOpportunityId: '',
            selectedContactId: '',
            message: '',
        })
    }, [])

    const handleRecommendationOverlayMouseDown = (event) => {
        recommendationOverlayMouseDownStartedOutsideRef.current = event.target === event.currentTarget
    }

    const handleRecommendationOverlayMouseUp = (event) => {
        const endedOutside = event.target === event.currentTarget
        if (recommendationOverlayMouseDownStartedOutsideRef.current && endedOutside) {
            closeRecommendationModal()
        }
        recommendationOverlayMouseDownStartedOutsideRef.current = false
    }

    const handleDeleteRecommendation = async (recommendationId) => {
        try {
            await removeSeekerRecommendation(recommendationId)
            await loadRecommendations()
            toast({
                title: 'Удалено',
                description: 'Рекомендация удалена',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось удалить рекомендацию',
                variant: 'destructive',
            })
        }
    }

    const handleOpenPortfolioEdit = () => {
        if (!isEditingPortfolio) {
            if (tempPortfolioLinks.length === 0) {
                setTempPortfolioLinks([{ id: Date.now(), title: '', url: '' }])
            }
            setIsEditingPortfolio(true)
        } else {
            handleCancelPortfolioEdit()
        }
    }

    const handleOpenContactsEdit = () => {
        if (!isEditingContacts) {
            if (tempContactLinks.length === 0) {
                setTempContactLinks([{ id: Date.now() + 1, title: '', url: '' }])
            }
            setIsEditingContacts(true)
        } else {
            handleCancelContactsEdit()
        }
    }

    const handleAvatarUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
            toast({
                title: 'Неверный формат изображения',
                description: 'Для аватара доступны только JPEG, PNG или WEBP',
                variant: 'destructive',
            })
            event.target.value = ''
            return
        }

        try {
            const localPreviewUrl = URL.createObjectURL(file)
            setAvatarPreviewUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev)
                }
                return localPreviewUrl
            })
            setIsAvatarUploading(true)
            const updatedProfile = await uploadApplicantAvatar(file)
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)
            setAvatarPreviewUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev)
                }
                return ''
            })
            toast({
                title: 'Аватар загружен',
                description: 'Фото профиля успешно обновлено',
            })
        } catch (error) {
            setAvatarPreviewUrl((prev) => {
                if (prev) {
                    URL.revokeObjectURL(prev)
                }
                return ''
            })
            toast({
                title: 'Ошибка загрузки аватара',
                description: error.message || 'Не удалось загрузить изображение',
                variant: 'destructive',
            })
        } finally {
            setIsAvatarUploading(false)
            event.target.value = ''
        }
    }

    const handleResumeFileUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const isPdf =
            file.type === 'application/pdf' ||
            file.name.toLowerCase().endsWith('.pdf')

        if (!isPdf) {
            toast({
                title: 'Неверный формат файла',
                description: 'Для резюме можно загружать только PDF',
                variant: 'destructive',
            })
            event.target.value = ''
            return
        }

        try {
            setIsResumeFileUploading(true)
            const updatedProfile = await uploadApplicantResumeFile(file)
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)
            toast({
                title: 'Файл резюме загружен',
                description: 'Резюме прикреплено к профилю',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось загрузить файл резюме',
                variant: 'destructive',
            })
        } finally {
            setIsResumeFileUploading(false)
            event.target.value = ''
        }
    }

    const handlePortfolioFileUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        const isPdf =
            file.type === 'application/pdf' ||
            file.name.toLowerCase().endsWith('.pdf')

        if (!isPdf) {
            toast({
                title: 'Неверный формат файла',
                description: 'В портфолио можно загружать только PDF',
                variant: 'destructive',
            })
            event.target.value = ''
            return
        }

        try {
            setIsPortfolioFileUploading(true)
            await uploadApplicantPortfolioFile(file)
            await refreshApplicantFiles()
            toast({
                title: 'Файл портфолио загружен',
                description: 'Файл добавлен в портфолио',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось загрузить файл портфолио',
                variant: 'destructive',
            })
        } finally {
            setIsPortfolioFileUploading(false)
            event.target.value = ''
        }
    }

    const handleDeleteApplicantMedia = async (fileId, kindLabel) => {
        try {
            const updatedProfile = await deleteApplicantFile(fileId)
            applyProfileFromApi({ ...profile, ...updatedProfile }, user)
            toast({
                title: 'Файл удалён',
                description: `${kindLabel} удалён из профиля`,
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось удалить файл',
                variant: 'destructive',
            })
        }
    }

    const getInitials = () => {
        if (profile.firstName || profile.lastName) {
            return `${profile.firstName?.[0] || ''}${profile.lastName?.[0] || ''}`.toUpperCase()
        }
        if (user?.displayName) {
            return user.displayName[0].toUpperCase()
        }
        return '?'
    }

    const getFullNameWithPatronymic = () => {
        const parts = []
        if (profile.firstName) parts.push(profile.firstName)
        if (profile.lastName) parts.push(profile.lastName)
        if (profile.middleName) parts.push(profile.middleName)
        return parts.join(' ')
    }

    const getDisplayName = () => {
        if (profile.firstName || profile.lastName) {
            return `${profile.firstName} ${profile.lastName}`.trim()
        }
        if (user?.displayName) return user.displayName
        return user?.email?.split('@')[0] || 'Пользователь'
    }

    const renderLinks = (links, title) => {
        if (!links || links.length === 0) return null

        return (
            <div className="links-display">
                <h4>{title}</h4>
                <div className="links-list">
                    {links.map((item, idx) => {
                        const url = item?.url || item?.value || item
                        if (!url) return null

                        let displayName = url
                        try {
                            const urlObj = new URL(url)
                            displayName = item?.label || item?.title || urlObj.hostname
                        } catch {
                            displayName = item?.label || item?.title || url
                        }

                        return (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer" className="link-item">
                                <img src={linkIcon} alt="" className="icon-small" />
                                <span>{displayName}</span>
                            </a>
                        )
                    })}
                </div>
            </div>
        )
    }

    const renderContactLinks = (links, title) => {
        if (!links || links.length === 0) return null

        return (
            <div className="links-display links-display--contacts">
                <h4>{title}</h4>
                <div className="contact-links-grid">
                    {links.map((item, idx) => {
                        const preset = detectContactPreset(item)
                        const rawValue = item?.url || item?.value || item

                        if (!rawValue) return null

                        const href = buildContactHref(rawValue, preset)
                        const displayValue = String(rawValue)
                            .replace(/^mailto:/i, '')
                            .replace(/^tel:/i, '')

                        return (
                            <a
                                key={idx}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="contact-link-card"
                            >
                                <span className="contact-link-card__badge">{preset.shortLabel}</span>
                                <span className="contact-link-card__content">
                                    <strong>{item?.label || item?.title || preset.label}</strong>
                                    <span>{displayValue}</span>
                                </span>
                            </a>
                        )
                    })}
                </div>
            </div>
        )
    }

    const getContactStatusLabel = (status) => {
        switch (status) {
            case 'PENDING':
                return 'Ожидает ответа'
            case 'ACCEPTED':
                return 'Подтверждён'
            case 'DECLINED':
                return 'Отклонён'
            case 'BLOCKED':
                return 'Заблокирован'
            default:
                return status || 'Неизвестно'
        }
    }

    const getContactDirectionLabel = (direction) => {
        switch (direction) {
            case 'INCOMING':
                return 'Входящий'
            case 'OUTGOING':
                return 'Исходящий'
            case 'CONFIRMED':
                return 'Подтверждённый'
            default:
                return 'Без направления'
        }
    }

    const isIncomingContact = (contact) => contact.direction === 'INCOMING'
    const isOutgoingContact = (contact) => contact.direction === 'OUTGOING'
    const isConfirmedContact = (contact) => contact.direction === 'CONFIRMED'
    const isBlockedContact = (contact) => contact.status === 'BLOCKED'
    const canRecommendContact = (contact) =>
        isConfirmedContact(contact) &&
        contact.status === 'ACCEPTED' &&
        !isBlockedContact(contact) &&
        !networkingBlockedMessage

    const confirmedContacts = useMemo(
        () => contacts.filter(isConfirmedContact),
        [contacts]
    )

    const incomingContacts = useMemo(
        () => contacts.filter(isIncomingContact),
        [contacts]
    )

    const outgoingContacts = useMemo(
        () => contacts.filter(isOutgoingContact),
        [contacts]
    )

    const currentContacts = useMemo(() => {
        if (contactsTab === 'incoming') return incomingContacts
        if (contactsTab === 'outgoing') return outgoingContacts
        return confirmedContacts
    }, [contactsTab, incomingContacts, outgoingContacts, confirmedContacts])

    const contactTabCount = useMemo(() => ({
        incoming: incomingContacts.length,
        outgoing: outgoingContacts.length,
        confirmed: confirmedContacts.length,
    }), [incomingContacts.length, outgoingContacts.length, confirmedContacts.length])

    const currentRecommendations = useMemo(() => {
        return recommendationsTab === 'incoming'
            ? recommendations.incoming
            : recommendations.outgoing
    }, [recommendations, recommendationsTab])

    const recommendationContactsOptions = useMemo(() => {
        return confirmedContacts.map((contact) => ({
            value: String(contact.id),
            label: contact.fullName || `${contact.firstName} ${contact.lastName}`.trim() || `Пользователь #${contact.id}`,
        }))
    }, [confirmedContacts])

    const recommendationOpportunityOptions = useMemo(() => {
        const fromSaved = savedFavorites.opportunities
            .filter((item) => item.id)
            .map((item) => ({
                value: String(item.id),
                label: `${item.title} — ${item.companyName}`,
            }))

        const fromApplications = applications
            .filter((item) => item.opportunityId)
            .map((item) => ({
                value: String(item.opportunityId),
                label: `${item.title || item.position} — ${item.companyName}`,
            }))

        const unique = new Map()

        for (const option of [...fromSaved, ...fromApplications]) {
            if (!unique.has(option.value)) {
                unique.set(option.value, option)
            }
        }

        return Array.from(unique.values())
    }, [savedFavorites.opportunities, applications])

    const canSendRecommendation =
        !networkingBlockedMessage &&
        recommendationContactsOptions.length > 0 &&
        recommendationOpportunityOptions.length > 0

    const avatarOwnerUserId = profile.userId || user?.id
    const avatarUrl = avatarPreviewUrl || (
        profile.avatar && avatarOwnerUserId
            ? getFileDownloadUrlByUserAndFile('APPLICANT', avatarOwnerUserId, profile.avatar.fileId)
            : null
    )

    const resumeFileUrl = profile.resumeFile && avatarOwnerUserId
        ? getFileDownloadUrlByUserAndFile('APPLICANT', avatarOwnerUserId, profile.resumeFile.fileId)
        : null

    if (isLoading && !profile.firstName) {
        return (
            <DashboardLayout title="Мой профиль">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Загрузка профиля...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            title="Мой профиль"
            subtitle={getDisplayName() ? `Добро пожаловать, ${getDisplayName()}!` : 'Управляйте своей карьерой'}
        >
            <div className="dashboard-tabs-shell">
                <div className="dashboard-tabs dashboard-tabs--main" ref={dashboardTabsRef}>
                    {DASHBOARD_TAB_ITEMS.map((tab) => (
                        <button
                            key={tab.key}
                            ref={(node) => {
                                if (node) {
                                    dashboardTabButtonRefs.current[tab.key] = node
                                }
                            }}
                            className={`dashboard-tabs__btn ${activeTab === tab.key ? 'is-active' : ''}`}
                            onClick={() => {
                                setActiveTab(tab.key)
                                ensureDashboardTabVisible(tab.key)
                            }}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'profile' && (
                    <div className="seeker-profile">
                        <input
                            ref={avatarInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleAvatarUpload}
                        />
                        <input
                            ref={resumeFileInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            hidden
                            onChange={handleResumeFileUpload}
                        />
                        <input
                            ref={portfolioFileInputRef}
                            type="file"
                            accept=".pdf,application/pdf"
                            hidden
                            onChange={handlePortfolioFileUpload}
                        />

                        <div className="profile-card">
                            <div
                                className={`profile-card__avatar-wrap ${isEditing ? 'is-editing' : ''}`}
                                onClick={() => {
                                    if (isEditing) avatarInputRef.current?.click()
                                }}
                                role={isEditing ? 'button' : undefined}
                                tabIndex={isEditing ? 0 : undefined}
                                onKeyDown={(e) => {
                                    if (!isEditing) return
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault()
                                        avatarInputRef.current?.click()
                                    }
                                }}
                            >
                                <div className="profile-card__avatar-initials">
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Аватар" className="profile-card__avatar-photo" />
                                    ) : getInitials() !== '?' ? (
                                        getInitials()
                                    ) : (
                                        <img src={userAvatarIcon} alt="Аватар" className="profile-card__avatar-icon" />
                                    )}
                                </div>

                                {isEditing && (
                                    <>
                                        <div className="profile-card__avatar-edit-badge" aria-hidden="true">
                                            <img
                                                src={cameraIcon}
                                                alt="Изменить фото"
                                                className="profile-card__camera-svg"
                                            />
                                        </div>

                                        <div className="profile-card__avatar-overlay">
                                            <button
                                                type="button"
                                                className="profile-card__avatar-action"
                                                onClick={(e) => {
                                                    e.stopPropagation()
                                                    avatarInputRef.current?.click()
                                                }}
                                                disabled={isAvatarUploading}
                                            >
                                                {isAvatarUploading
                                                    ? 'Загрузка...'
                                                    : profile.avatar
                                                        ? 'Изменить фото профиля'
                                                        : 'Загрузить фото профиля'}
                                            </button>

                                            {profile.avatar && (
                                                <button
                                                    type="button"
                                                    className="profile-card__avatar-action profile-card__avatar-action--danger"
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        await handleDeleteApplicantMedia(profile.avatar.fileId, 'Аватар')
                                                    }}
                                                >
                                                    Удалить фото профиля
                                                </button>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>

                            <div className="profile-card__info">
                                <div className="profile-card__header">
                                    <h2>{getFullNameWithPatronymic() || user?.displayName || 'Не указано'}</h2>
                                    <div className="profile-card__header-actions">
                                        {!isEditing && (
                                            <button className="profile-card__edit-btn" onClick={() => setIsEditing(true)}>
                                                <img src={editIcon} alt="" className="icon" />
                                                Редактировать
                                            </button>
                                        )}
                                        {avatarOwnerUserId && (
                                            <button
                                                className="profile-card__edit-btn"
                                                onClick={() => navigate(`/seekers/${avatarOwnerUserId}`)}
                                            >
                                                Открыть публичный профиль
                                            </button>
                                        )}
                                    </div>
                                </div>

                                <div className="profile-card__moderation">
                                    <span className={`status-badge status-${moderationState.toLowerCase()}`}>
                                        {moderationState === 'DRAFT' && 'Не отправлен на модерацию'}
                                        {moderationState === 'PENDING_MODERATION' && 'На модерации'}
                                        {moderationState === 'APPROVED' && 'Одобрен'}
                                        {moderationState === 'NEEDS_REVISION' && 'Нужны правки'}
                                    </span>

                                    {canSubmitForModeration && (
                                        <button
                                            type="button"
                                            className="profile-card__moderation-btn"
                                            onClick={handleSubmitApplicantProfileForModeration}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? 'Отправка...' : 'Отправить на модерацию'}
                                        </button>
                                    )}
                                </div>

                                <div className="profile-card__details">
                                    <div className="profile-card__detail">
                                        <span className="profile-card__detail-label">
                                            <img src={briefcaseIcon} alt="" className="icon-small" />
                                            Статус
                                        </span>
                                        <span className={`status-badge ${profile.openToWork ? 'status-active' : 'status-passive'}`}>
                                            {profile.openToWork ? 'Активно ищу работу' : 'Не ищу работу'}
                                        </span>
                                    </div>

                                    {profile.universityName && (
                                        <div className="profile-card__detail">
                                            <span className="profile-card__detail-label">
                                                <img src={calendarIcon} alt="" className="icon-small" />
                                                Образование
                                            </span>
                                            <span className="profile-card__detail-value">
                                                {profile.universityName}
                                                {profile.facultyName && `, ${profile.facultyName}`}
                                                {profile.graduationYear && `, ${profile.graduationYear}`}
                                            </span>
                                        </div>
                                    )}

                                    {profile.cityName && (
                                        <div className="profile-card__detail">
                                            <span className="profile-card__detail-label">
                                                <img src={locationIcon} alt="" className="icon-small" />
                                                Город
                                            </span>
                                            <span className="profile-card__detail-value">{profile.cityName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {isEditing && (
                            <div className="profile-edit-form">
                                <div className="profile-edit-form__header">
                                    <h3>Редактирование профиля</h3>
                                    <button className="profile-edit-form__close" onClick={() => setIsEditing(false)} aria-label="Закрыть">
                                        ×
                                    </button>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Основная информация</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Имя <span className="required-star">*</span></Label>
                                            <Input value={profile.firstName} onChange={(e) => handleFieldChange('firstName', e.target.value)} />
                                            {errors.firstName && <p className="field-error">{errors.firstName}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Фамилия <span className="required-star">*</span></Label>
                                            <Input value={profile.lastName} onChange={(e) => handleFieldChange('lastName', e.target.value)} />
                                            {errors.lastName && <p className="field-error">{errors.lastName}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Отчество</Label>
                                            <Input value={profile.middleName} onChange={(e) => handleFieldChange('middleName', e.target.value)} />
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Образование</h4>
                                    <div className="form-group">
                                        <Label>Вуз</Label>
                                        <Input value={profile.universityName} onChange={(e) => handleFieldChange('universityName', e.target.value)} />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Факультет</Label>
                                            <Input value={profile.facultyName} onChange={(e) => handleFieldChange('facultyName', e.target.value)} />
                                        </div>
                                        <div className="form-group">
                                            <Label>Образовательная программа</Label>
                                            <Input value={profile.studyProgram} onChange={(e) => handleFieldChange('studyProgram', e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Курс <span className="required-star">*</span></Label>
                                            <Input value={profile.course || ''} onChange={(e) => handleFieldChange('course', e.target.value.replace(/[^\d]/g, ''))} />
                                            {errors.course && <p className="field-error">{errors.course}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Год выпуска <span className="required-star">*</span></Label>
                                            <Input value={profile.graduationYear || ''} onChange={(e) => handleFieldChange('graduationYear', e.target.value.replace(/[^\d]/g, '').slice(0, 4))} />
                                            {errors.graduationYear && <p className="field-error">{errors.graduationYear}</p>}
                                        </div>
                                        <div className="form-group" ref={citySearchRef}>
                                            <Label>Город</Label>
                                            <div className="autocomplete">
                                                <Input
                                                    value={citySearchQuery}
                                                    onChange={(e) => handleCitySearch(e.target.value)}
                                                    onFocus={() => citySearchQuery.length >= 2 && citySuggestions.length > 0 && setIsCitySearchOpen(true)}
                                                    placeholder="Начните вводить город"
                                                />
                                                {isCitySearchOpen && citySuggestions.length > 0 && (
                                                    <div className="autocomplete__list" role="listbox">
                                                        {citySuggestions.map((city, index) => (
                                                            <button
                                                                key={city.id}
                                                                type="button"
                                                                className={`autocomplete__item ${cityActiveIndex === index ? 'is-active' : ''}`}
                                                                onMouseEnter={() => setCityActiveIndex(index)}
                                                                onMouseDown={(e) => e.preventDefault()}
                                                                onClick={() => handleSelectCity(city)}
                                                            >
                                                                {city.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Настройки приватности</h4>
                                    <div className="form-grid-2">
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость профиля"
                                                value={profile.profileVisibility}
                                                onChange={(val) => handleFieldChange('profileVisibility', val)}
                                                options={PROFILE_VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость резюме"
                                                value={profile.resumeVisibility}
                                                onChange={(val) => handleFieldChange('resumeVisibility', val)}
                                                options={CONTACTS_BASED_VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость откликов"
                                                value={profile.applicationsVisibility}
                                                onChange={(val) => handleFieldChange('applicationsVisibility', val)}
                                                options={CONTACTS_BASED_VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость контактов"
                                                value={profile.contactsVisibility}
                                                onChange={(val) => handleFieldChange('contactsVisibility', val)}
                                                options={CONTACTS_BASED_VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Карьерные настройки</h4>
                                    <div className="checkbox-group">
                                        <CustomCheckbox checked={profile.openToWork} onChange={(val) => handleFieldChange('openToWork', val)} label="Ищу работу / стажировку" />
                                        <CustomCheckbox checked={profile.openToEvents} onChange={(val) => handleFieldChange('openToEvents', val)} label="Интересуюсь карьерными мероприятиями" />
                                    </div>
                                </div>

                                <div className="profile-edit-form__actions">
                                    <button className="btn-primary" onClick={handleSaveProfile} disabled={isLoading}>
                                        {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                                    </button>
                                    <button className="btn-secondary" onClick={() => setIsEditing(false)}>
                                        Отменить
                                    </button>
                                </div>
                            </div>
                        )}

                        {!isEditing && (
                            <>
                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>О себе</h3>
                                        <button className="info-block__edit-btn" onClick={() => setIsEditingAbout(!isEditingAbout)}>
                                            <img src={pencilIcon} alt="" className="icon-small" />
                                            {isEditingAbout ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingAbout ? (
                                        <div className="info-block__edit">
                                            <Textarea rows={4} value={profile.about} onChange={(e) => handleFieldChange('about', e.target.value)} />
                                            <div className="info-block__actions">
                                                <button className="btn-primary-small" onClick={handleSaveAbout} disabled={isLoading}>Сохранить</button>
                                                <button className="btn-secondary-small" onClick={() => setIsEditingAbout(false)}>Отменить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.about ? <p>{profile.about}</p> : <p className="info-block__empty">Расскажите о себе</p>}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Резюме</h3>
                                        <button className="info-block__edit-btn" onClick={() => setIsEditingResume(!isEditingResume)}>
                                            <img src={pencilIcon} alt="" className="icon-small" />
                                            {isEditingResume ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>

                                    {isEditingResume ? (
                                        <div className="info-block__edit">
                                            <Textarea rows={6} value={profile.resumeText} onChange={(e) => handleFieldChange('resumeText', e.target.value)} />

                                            <div className="info-block__file-tools">
                                                <Button
                                                    className="button--outline"
                                                    onClick={() => resumeFileInputRef.current?.click()}
                                                    disabled={isResumeFileUploading}
                                                >
                                                    {isResumeFileUploading
                                                        ? 'Загрузка файла...'
                                                        : profile.resumeFile
                                                            ? 'Заменить файл резюме'
                                                            : 'Прикрепить файл резюме'}
                                                </Button>
                                            </div>

                                            <p className="info-block__hint">Можно прикрепить только PDF-файл</p>

                                            {profile.resumeFile && (
                                                <div className="embedded-file-card">
                                                    <div className="embedded-file-card__content">
                                                        <strong>{profile.resumeFile.originalFileName}</strong>
                                                        <p>{formatFileSize(profile.resumeFile.sizeBytes)}</p>
                                                    </div>

                                                    <div className="embedded-file-card__actions">
                                                        <a
                                                            href={resumeFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="media-link"
                                                        >
                                                            Открыть
                                                        </a>
                                                        <button
                                                            type="button"
                                                            className="media-delete-btn"
                                                            onClick={() => handleDeleteApplicantMedia(profile.resumeFile.fileId, 'Резюме')}
                                                        >
                                                            <img src={trashIcon} alt="" className="icon-small" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="info-block__actions">
                                                <button className="btn-primary-small" onClick={handleSaveResume} disabled={isLoading}>Сохранить</button>
                                                <button className="btn-secondary-small" onClick={() => setIsEditingResume(false)}>Отменить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.resumeText ? <p>{profile.resumeText}</p> : <p className="info-block__empty">Добавьте резюме</p>}

                                            {profile.resumeFile && (
                                                <div className="embedded-file-card embedded-file-card--readonly">
                                                    <div className="embedded-file-card__content">
                                                        <strong>{profile.resumeFile.originalFileName}</strong>
                                                        <p>{formatFileSize(profile.resumeFile.sizeBytes)}</p>
                                                    </div>
                                                    <div className="embedded-file-card__actions">
                                                        <a
                                                            href={resumeFileUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="media-link"
                                                        >
                                                            Открыть файл
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Портфолио</h3>
                                        <button className="info-block__edit-btn" onClick={handleOpenPortfolioEdit}>
                                            <img src={pencilIcon} alt="" className="icon-small" />
                                            {isEditingPortfolio ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>

                                    {isEditingPortfolio ? (
                                        <div className="info-block__edit">
                                            <LinksEditor
                                                label=""
                                                rows={tempPortfolioLinks}
                                                setRows={setTempPortfolioLinks}
                                                placeholderTitle="Название"
                                                placeholderUrl="https://..."
                                            />

                                            <div className="info-block__file-tools">
                                                <Button
                                                    className="button--outline"
                                                    onClick={() => portfolioFileInputRef.current?.click()}
                                                    disabled={isPortfolioFileUploading}
                                                >
                                                    {isPortfolioFileUploading ? 'Загрузка файла...' : 'Добавить файл портфолио'}
                                                </Button>
                                            </div>

                                            <p className="info-block__hint">В портфолио можно загружать только PDF-файлы</p>

                                            {profile.portfolioFiles && profile.portfolioFiles.length > 0 && (
                                                <div className="embedded-files-list">
                                                    {profile.portfolioFiles.map((file) => {
                                                        const fileUrl = getFileDownloadUrlByUserAndFile('APPLICANT', avatarOwnerUserId, file.fileId)
                                                        return (
                                                            <div key={file.fileId} className="embedded-file-card">
                                                                <div className="embedded-file-card__content">
                                                                    <strong>{file.originalFileName}</strong>
                                                                    <p>{formatFileSize(file.sizeBytes)}</p>
                                                                </div>

                                                                <div className="embedded-file-card__actions">
                                                                    <a
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="media-link"
                                                                    >
                                                                        Открыть
                                                                    </a>
                                                                    <button
                                                                        type="button"
                                                                        className="media-delete-btn"
                                                                        onClick={() => handleDeleteApplicantMedia(file.fileId, 'Файл портфолио')}
                                                                    >
                                                                        <img src={trashIcon} alt="" className="icon-small" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}

                                            <div className="info-block__actions">
                                                <button className="btn-primary-small" onClick={handleSavePortfolio} disabled={isLoading}>Сохранить</button>
                                                <button className="btn-secondary-small" onClick={handleCancelPortfolioEdit}>Отменить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.portfolioLinks && profile.portfolioLinks.length > 0
                                                ? renderLinks(profile.portfolioLinks, 'Ссылки портфолио')
                                                : !(profile.portfolioFiles && profile.portfolioFiles.length > 0) && (
                                                <p className="info-block__empty">Добавьте ссылки на проекты или прикрепите PDF-файлы портфолио</p>
                                            )}

                                            {profile.portfolioFiles && profile.portfolioFiles.length > 0 && (
                                                <div className="embedded-files-list">
                                                    {profile.portfolioFiles.map((file) => {
                                                        const fileUrl = getFileDownloadUrlByUserAndFile('APPLICANT', avatarOwnerUserId, file.fileId)
                                                        return (
                                                            <div key={file.fileId} className="embedded-file-card embedded-file-card--readonly">
                                                                <div className="embedded-file-card__content">
                                                                    <strong>{file.originalFileName}</strong>
                                                                    <p>{formatFileSize(file.sizeBytes)}</p>
                                                                </div>
                                                                <div className="embedded-file-card__actions">
                                                                    <a
                                                                        href={fileUrl}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="media-link"
                                                                    >
                                                                        Открыть файл
                                                                    </a>
                                                                </div>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Контакты</h3>
                                        <button className="info-block__edit-btn" onClick={handleOpenContactsEdit}>
                                            <img src={pencilIcon} alt="" className="icon-small" />
                                            {isEditingContacts ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingContacts ? (
                                        <div className="info-block__edit">
                                            <div className="contact-editor">
                                                <div className="contact-editor__preset-groups">
                                                    <div className="contact-editor__preset-group">
                                                        <p className="contact-editor__preset-label">Социальные сети</p>
                                                        <div className="contact-editor__presets">
                                                            {SOCIAL_LINK_PRESETS.map((preset) => (
                                                                <button
                                                                    key={preset.id}
                                                                    type="button"
                                                                    className="contact-editor__preset"
                                                                    onClick={() => addContactRow(preset.id)}
                                                                >
                                                                    <span className="contact-editor__preset-badge">{preset.shortLabel}</span>
                                                                    <span>{preset.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>

                                                    <div className="contact-editor__preset-group">
                                                        <p className="contact-editor__preset-label">Контакты для связи</p>
                                                        <div className="contact-editor__presets">
                                                            {CONTACT_METHOD_PRESETS.map((preset) => (
                                                                <button
                                                                    key={preset.id}
                                                                    type="button"
                                                                    className="contact-editor__preset"
                                                                    onClick={() => addContactRow(preset.id)}
                                                                >
                                                                    <span className="contact-editor__preset-badge">{preset.shortLabel}</span>
                                                                    <span>{preset.label}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="contact-editor__list">
                                                    {tempContactLinks.length === 0 && (
                                                        <div className="contact-editor__empty">
                                                            Выберите тип контакта выше, чтобы добавить удобный способ связи
                                                        </div>
                                                    )}

                                                    {tempContactLinks.map((row) => {
                                                        const preset = detectContactPreset(row)

                                                        return (
                                                            <div key={row.id} className="contact-editor__card">
                                                                <div className="contact-editor__card-header">
                                                                    <div className="contact-editor__card-title">
                                                                        <span className="contact-editor__card-badge">{preset.shortLabel}</span>
                                                                        <div>
                                                                            <strong>{row.title || preset.label}</strong>
                                                                            <span>{preset.hint}</span>
                                                                        </div>
                                                                    </div>

                                                                    <button
                                                                        type="button"
                                                                        className="contact-editor__remove"
                                                                        onClick={() => removeContactRow(row.id)}
                                                                        aria-label="Удалить контакт"
                                                                    >
                                                                        ×
                                                                    </button>
                                                                </div>

                                                                <Input
                                                                    placeholder={preset.placeholder}
                                                                    value={row.url}
                                                                    onChange={(e) =>
                                                                        updateContactRow(row.id, {
                                                                            title: preset.label,
                                                                            url: e.target.value,
                                                                        })
                                                                    }
                                                                />
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                            <div className="info-block__actions">
                                                <button className="btn-primary-small" onClick={handleSaveContacts} disabled={isLoading}>Сохранить</button>
                                                <button className="btn-secondary-small" onClick={handleCancelContactsEdit}>Отменить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.contactLinks && profile.contactLinks.length > 0
                                                ? renderContactLinks(profile.contactLinks, 'Контакты для связи')
                                                : <p className="info-block__empty">Добавьте контакты</p>}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {activeTab === 'applications' && (
                    <div className="seeker-applications">
                        <div className="section-header">
                            <h2>Мои отклики</h2>
                            <span className="section-count">{applications.length}</span>
                        </div>
                        {applications.length === 0 ? (
                            <div className="empty-state">
                                <p>У вас пока нет откликов</p>
                                <span>Начните искать вакансии на главной странице</span>
                            </div>
                        ) : (
                            <div className="applications-list">
                                {applications.map((app, index) => {
                                    const appKey = app.id ?? `${app.opportunityId ?? 'unknown'}-${app.createdAt ?? index}`
                                    const canOpenOpportunity = app.opportunityId !== null && app.opportunityId !== undefined

                                    return (
                                        <div
                                            key={appKey}
                                            className="application-card"
                                            onClick={() => canOpenOpportunity && navigate(`/opportunities/${app.opportunityId}`)}
                                        >
                                            <div className="application-card__content">
                                                <h3>{app.position || app.title || 'Вакансия'}</h3>
                                                <p className="application-card__company">{app.companyName}</p>
                                                <p className="application-card__description">{app.message || 'Отклик отправлен'}</p>
                                                <div className="application-card__footer">
                                                    <span className={`status-badge status-${app.status?.toLowerCase() || 'pending'}`}>
                                                        {app.status === 'SUBMITTED' && 'Отправлено'}
                                                        {app.status === 'IN_REVIEW' && 'На рассмотрении'}
                                                        {app.status === 'ACCEPTED' && 'Принято'}
                                                        {app.status === 'REJECTED' && 'Отклонено'}
                                                        {app.status === 'RESERVE' && 'В резерве'}
                                                        {app.status === 'WITHDRAWN' && 'Отозвано'}
                                                        {!app.status && 'Отправлено'}
                                                    </span>
                                                    <span className="application-card__date">
                                                        {formatDate(app.appliedAt)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'saved' && (
                    <SavedFavoritesSection
                        favorites={savedFavorites}
                        onOpenOpportunity={(opportunityId) => navigate(`/opportunities/${opportunityId}`)}
                        onRemoveOpportunity={handleRemoveSaved}
                        onRemoveEmployer={handleRemoveSavedEmployer}
                    />
                )}

                {activeTab === 'contacts' && (
                    <div className="seeker-contacts">
                        <div className="section-header">
                            <h2>Профессиональные контакты</h2>
                            <span className="section-count">{contacts.length}</span>
                        </div>

                        <div className="dashboard-tabs dashboard-tabs--inner dashboard-tabs--stats">
                            <button
                                type="button"
                                className={`dashboard-tabs__btn ${contactsTab === 'incoming' ? 'is-active' : ''}`}
                                onClick={() => setContactsTab('incoming')}
                            >
                                <span className="dashboard-tabs__label">Входящие</span>
                                <span className="dashboard-tabs__badge">{contactTabCount.incoming}</span>
                            </button>

                            <button
                                type="button"
                                className={`dashboard-tabs__btn ${contactsTab === 'outgoing' ? 'is-active' : ''}`}
                                onClick={() => setContactsTab('outgoing')}
                            >
                                <span className="dashboard-tabs__label">Исходящие</span>
                                <span className="dashboard-tabs__badge">{contactTabCount.outgoing}</span>
                            </button>

                            <button
                                type="button"
                                className={`dashboard-tabs__btn ${contactsTab === 'confirmed' ? 'is-active' : ''}`}
                                onClick={() => setContactsTab('confirmed')}
                            >
                                <span className="dashboard-tabs__label">Подтверждённые</span>
                                <span className="dashboard-tabs__badge">{contactTabCount.confirmed}</span>
                            </button>
                        </div>

                        {isContactsLoading || !hasLoadedNetworking ? (
                            <div className="dashboard-loading dashboard-loading--inner">
                                <div className="loading-spinner"></div>
                                <p>Загрузка контактов...</p>
                            </div>
                        ) : networkingBlockedMessage ? (
                            <div className="empty-state">
                                <p>Нетворкинг пока недоступен</p>
                                <span>{networkingBlockedMessage}</span>
                            </div>
                        ) : currentContacts.length === 0 ? (
                            <div className="empty-state">
                                <p>Контактов в этом разделе пока нет</p>
                                <span>
                                    {contactsTab === 'incoming' && 'Здесь появятся входящие запросы в контакты'}
                                    {contactsTab === 'outgoing' && 'Здесь появятся отправленные вами запросы'}
                                    {contactsTab === 'confirmed' && 'Здесь появятся подтверждённые профессиональные контакты'}
                                </span>
                            </div>
                        ) : (
                            <div className="contacts-list">
                                {currentContacts.map((contact) => (
                                    <div key={contact.id} className="contact-card">
                                        <div className="contact-card__avatar">
                                            {(contact.firstName?.[0] || '')}{(contact.lastName?.[0] || '')}
                                        </div>

                                        <div className="contact-card__info">
                                            <h3>{contact.fullName || `${contact.firstName} ${contact.lastName}`.trim() || 'Пользователь'}</h3>
                                            <p>
                                                {getContactDirectionLabel(contact.direction)} · {getContactStatusLabel(contact.status)}
                                            </p>
                                            <span className="contact-card__date">
                                                {formatDate(contact.createdAt)}
                                            </span>
                                            {isBlockedContact(contact) && (
                                                <p>
                                                    Запросы и рекомендации для этого контакта недоступны.
                                                </p>
                                            )}
                                        </div>

                                        <div className="contact-card__actions">
                                            <button
                                                className="contact-card__link"
                                                onClick={() => navigate(`/seekers/${contact.id}`)}
                                            >
                                                Профиль
                                            </button>

                                            <button
                                                className="contact-card__link"
                                                onClick={() =>
                                                    setRecommendationModal((prev) => ({
                                                        ...prev,
                                                        isOpen: true,
                                                        selectedContactId: String(contact.id),
                                                    }))
                                                }
                                                disabled={!canRecommendContact(contact)}
                                            >
                                                Рекомендовать
                                            </button>

                                            {contactsTab === 'incoming' && contact.status === 'PENDING' && (
                                                <>
                                                    <button className="btn-approve" onClick={() => handleAcceptContact(contact.id)}>Принять</button>
                                                    <button className="btn-reject" onClick={() => handleDeclineContact(contact.id)}>Отклонить</button>
                                                </>
                                            )}

                                            {contactsTab === 'outgoing' && contact.status === 'PENDING' && (
                                                <button className="contact-card__remove" onClick={() => handleRemoveContact(contact.id, 'OUTGOING')}>
                                                    Отменить заявку
                                                </button>
                                            )}

                                            {contactsTab === 'confirmed' && contact.status === 'ACCEPTED' && (
                                                <button className="contact-card__remove" onClick={() => handleRemoveContact(contact.id, 'CONFIRMED')}>
                                                    Удалить
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'recommendations' && (
                    <RecommendationsSection
                        recommendations={recommendations}
                        recommendationsTab={recommendationsTab}
                        setRecommendationsTab={setRecommendationsTab}
                        currentRecommendations={currentRecommendations}
                        networkingBlockedMessage={networkingBlockedMessage}
                        isRecommendationsLoading={isRecommendationsLoading}
                        onOpenCreateModal={() =>
                            setRecommendationModal({
                                isOpen: true,
                                selectedOpportunityId: '',
                                selectedContactId: '',
                                message: '',
                            })
                        }
                        onOpenOpportunity={(opportunityId) => navigate(`/opportunities/${opportunityId}`)}
                        onDeleteRecommendation={handleDeleteRecommendation}
                        onRefreshRecommendations={loadRecommendations}
                    />
                )}
            </div>

            {recommendationModal.isOpen && (
                <div
                    className="modal-overlay seeker-dashboard-modal-overlay"
                    onMouseDown={handleRecommendationOverlayMouseDown}
                    onMouseUp={handleRecommendationOverlayMouseUp}
                >
                    <div className="modal seeker-dashboard-modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Рекомендовать возможность</h3>

                        {!canSendRecommendation && (
                            <div className="modal__empty-state">
                                {networkingBlockedMessage && (
                                    <p>{networkingBlockedMessage}</p>
                                )}

                                {!networkingBlockedMessage && recommendationContactsOptions.length === 0 && (
                                    <p>
                                        Сначала добавьте хотя бы один подтверждённый контакт.
                                    </p>
                                )}

                                {!networkingBlockedMessage && recommendationContactsOptions.length > 0 && recommendationOpportunityOptions.length === 0 && (
                                    <p>
                                        Пока нет подходящих возможностей для рекомендации.
                                    </p>
                                )}
                            </div>
                        )}

                        <div className="modal__field">
                            <Label>Контакт</Label>
                            {recommendationContactsOptions.length > 0 ? (
                                <CustomSelect
                                    value={recommendationModal.selectedContactId}
                                    onChange={(value) =>
                                        setRecommendationModal((prev) => ({
                                            ...prev,
                                            selectedContactId: value,
                                        }))
                                    }
                                    options={recommendationContactsOptions}
                                />
                            ) : (
                                <div className="modal__placeholder-box">
                                    Нет подтверждённых контактов
                                </div>
                            )}
                        </div>

                        <div className="modal__field">
                            <Label>Возможность</Label>
                            {recommendationOpportunityOptions.length > 0 ? (
                                <CustomSelect
                                    value={recommendationModal.selectedOpportunityId}
                                    onChange={(value) =>
                                        setRecommendationModal((prev) => ({
                                            ...prev,
                                            selectedOpportunityId: value,
                                        }))
                                    }
                                    options={recommendationOpportunityOptions}
                                />
                            ) : (
                                <div className="modal__placeholder-box">
                                    Нет доступных возможностей для рекомендации
                                </div>
                            )}
                        </div>

                        <div className="modal__field">
                            <Label>Сообщение</Label>
                            <Textarea
                                rows={4}
                                value={recommendationModal.message}
                                onChange={(e) =>
                                    setRecommendationModal((prev) => ({
                                        ...prev,
                                        message: e.target.value,
                                    }))
                                }
                                placeholder="Напишите, почему вы рекомендуете эту возможность"
                                disabled={!canSendRecommendation}
                            />
                        </div>

                        <div className="modal__actions">
                            <button
                                className="btn-primary-small"
                                onClick={handleSendRecommendation}
                                disabled={!canSendRecommendation}
                            >
                                Отправить
                            </button>
                            <button
                                className="btn-secondary-small"
                                onClick={() =>
                                    setRecommendationModal({
                                        isOpen: false,
                                        selectedOpportunityId: '',
                                        selectedContactId: '',
                                        message: '',
                                    })
                                }
                            >
                                Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default SeekerDashboard
