import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import Textarea from '../../../components/Textarea'
import CustomSelect from '../../../components/CustomSelect'
import CustomCheckbox from '../../../components/CustomCheckbox'
import LinksEditor from '../../../components/LinksEditor'
import Button from '../../../components/Button'
import {
    clearSessionUser,
    getSessionUser,
    subscribeSessionChange,
} from '../../../utils/sessionStore'
import {
    getApplicantProfile,
    updateApplicantProfile,
    getSeekerApplications,
    getSeekerSaved,
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
} from '../../../api/profile'
import '../DashboardBase.scss'
import './SeekerDashboard.scss'

import userAvatarIcon from '../../../assets/icons/user-avatar.svg'
import briefcaseIcon from '../../../assets/icons/briefcase.svg'
import calendarIcon from '../../../assets/icons/calendar.svg'
import locationIcon from '../../../assets/icons/location.svg'
import editIcon from '../../../assets/icons/edit.svg'
import pencilIcon from '../../../assets/icons/pencil.svg'
import linkIcon from '../../../assets/icons/link.svg'
import trashIcon from '../../../assets/icons/trash.svg'

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

function formatFileSize(sizeBytes) {
    if (!sizeBytes) return '0 Б'
    if (sizeBytes < 1024) return `${sizeBytes} Б`
    if (sizeBytes < 1024 * 1024) return `${(sizeBytes / 1024).toFixed(1)} КБ`
    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} МБ`
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

    const avatarInputRef = useRef(null)
    const resumeFileInputRef = useRef(null)
    const portfolioFileInputRef = useRef(null)

    const [isAvatarUploading, setIsAvatarUploading] = useState(false)
    const [isResumeFileUploading, setIsResumeFileUploading] = useState(false)
    const [isPortfolioFileUploading, setIsPortfolioFileUploading] = useState(false)

    const [profile, setProfile] = useState({
        firstName: '',
        lastName: '',
        middleName: '',
        universityName: '',
        facultyName: '',
        studyProgram: '',
        course: null,
        graduationYear: null,
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
        avatar: null,
        resumeFile: null,
        portfolioFiles: [],
    })

    const [tempPortfolioLinks, setTempPortfolioLinks] = useState([])
    const [tempContactLinks, setTempContactLinks] = useState([])

    const [applications, setApplications] = useState([])
    const [savedOpportunities, setSavedOpportunities] = useState([])
    const [contacts, setContacts] = useState([])
    const [recommendations, setRecommendations] = useState({ incoming: [], outgoing: [] })

    const [recommendationModal, setRecommendationModal] = useState({
        isOpen: false,
        selectedOpportunityId: '',
        selectedContactId: '',
        message: '',
    })

    const [isCitySearchOpen, setIsCitySearchOpen] = useState(false)
    const [citySearchQuery, setCitySearchQuery] = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const [cityActiveIndex, setCityActiveIndex] = useState(-1)
    const citySearchRef = useRef(null)
    const [, navigate] = useLocation()

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

    const handleCancelPortfolioEdit = () => {
        setTempPortfolioLinks(linksToArray(profile.portfolioLinks || []))
        setIsEditingPortfolio(false)
    }

    const handleCancelContactsEdit = () => {
        setTempContactLinks(linksToArray(profile.contactLinks || []))
        setIsEditingContacts(false)
    }

    const handleCitySearch = async (value) => {
        setCitySearchQuery(value)
        if (value.length >= 2) {
            const cities = await searchCities(value)
            setCitySuggestions(cities)
            setIsCitySearchOpen(true)
        } else {
            setCitySuggestions([])
            setIsCitySearchOpen(false)
        }
    }

    const handleSelectCity = (city) => {
        setProfile(prev => ({
            ...prev,
            cityId: city.id,
            cityName: city.name,
        }))
        setCitySearchQuery(city.name)
        setIsCitySearchOpen(false)
    }

    const loadContacts = async () => {
        setIsContactsLoading(true)
        try {
            const contactsList = await getSeekerContacts()
            setContacts(contactsList)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить контакты',
                variant: 'destructive',
            })
        } finally {
            setIsContactsLoading(false)
        }
    }

    const loadRecommendations = async () => {
        setIsRecommendationsLoading(true)
        try {
            const data = await getSeekerRecommendations()
            setRecommendations(data)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить рекомендации',
                variant: 'destructive',
            })
        } finally {
            setIsRecommendationsLoading(false)
        }
    }

    const refreshApplicantFiles = async () => {
        const freshProfile = await getApplicantProfile()
        if (!freshProfile) return

        setProfile(prev => ({
            ...prev,
            avatar: freshProfile.avatar || null,
            resumeFile: freshProfile.resumeFile || null,
            portfolioFiles: freshProfile.portfolioFiles || [],
        }))
    }

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
        })

        const loadData = async () => {
            setIsLoading(true)
            try {
                const currentUser = getSessionUser()
                setUser(currentUser)

                if (!currentUser) {
                    setApplications([])
                    setSavedOpportunities([])
                    setContacts([])
                    setRecommendations({ incoming: [], outgoing: [] })
                    return
                }

                const profileData = await getApplicantProfile()
                if (profileData) {
                    setProfile(prev => ({
                        ...prev,
                        firstName: profileData.firstName || '',
                        lastName: profileData.lastName || '',
                        middleName: profileData.middleName || '',
                        universityName: profileData.universityName || '',
                        facultyName: profileData.facultyName || '',
                        studyProgram: profileData.studyProgram || '',
                        course: profileData.course,
                        graduationYear: profileData.graduationYear,
                        cityId: profileData.cityId || profileData.city?.id || null,
                        cityName: profileData.cityName || profileData.city?.name || '',
                        about: profileData.about || '',
                        resumeText: profileData.resumeText || '',
                        portfolioLinks: profileData.portfolioLinks || [],
                        contactLinks: profileData.contactLinks || [],
                        profileVisibility: profileData.profileVisibility || 'AUTHENTICATED',
                        resumeVisibility: profileData.resumeVisibility || 'AUTHENTICATED',
                        applicationsVisibility: profileData.applicationsVisibility || 'PRIVATE',
                        contactsVisibility: profileData.contactsVisibility || 'AUTHENTICATED',
                        openToWork: profileData.openToWork ?? true,
                        openToEvents: profileData.openToEvents ?? true,
                        avatar: profileData.avatar || null,
                        resumeFile: profileData.resumeFile || null,
                        portfolioFiles: profileData.portfolioFiles || [],
                    }))

                    if (profileData.cityName || profileData.city?.name) {
                        setCitySearchQuery(profileData.cityName || profileData.city?.name)
                    }

                    setTempPortfolioLinks(linksToArray(profileData.portfolioLinks || []))
                    setTempContactLinks(linksToArray(profileData.contactLinks || []))
                }

                const apps = await getSeekerApplications()
                setApplications(apps)

                const saved = await getSeekerSaved()
                setSavedOpportunities(saved)

                const contactsList = await getSeekerContacts()
                setContacts(contactsList)

                const recommendationsData = await getSeekerRecommendations()
                setRecommendations(recommendationsData)
            } catch (error) {
                if ([401, 403, 500, 503].includes(error?.status)) {
                    clearSessionUser()
                    setUser(null)
                    setApplications([])
                    setSavedOpportunities([])
                    setContacts([])
                    setRecommendations({ incoming: [], outgoing: [] })
                    return
                }

                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить профиль',
                    variant: 'destructive',
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadData()

        return unsubscribe
    }, [toast])

    const validateProfile = () => {
        const newErrors = {}
        if (!profile.firstName?.trim()) newErrors.firstName = 'Укажите имя'
        if (!profile.lastName?.trim()) newErrors.lastName = 'Укажите фамилию'
        if (!profile.course) newErrors.course = 'Укажите курс'
        if (!profile.graduationYear) newErrors.graduationYear = 'Укажите год выпуска'
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
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
            await updateApplicantProfile(profile)
            setIsEditing(false)
            setErrors({})

            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    role: 'APPLICANT',
                },
            }))

            toast({
                title: 'Профиль обновлён',
                description: 'Ваши данные успешно сохранены',
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveAbout = async () => {
        setIsLoading(true)
        try {
            await updateApplicantProfile(profile)
            setIsEditingAbout(false)
            toast({
                title: 'Обновлено',
                description: 'Информация о себе сохранена',
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveResume = async () => {
        setIsLoading(true)
        try {
            await updateApplicantProfile(profile)
            setIsEditingResume(false)
            toast({
                title: 'Обновлено',
                description: 'Резюме сохранено',
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить',
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
                .filter(link => link.url?.trim())
                .map(link => ({
                    label: link.title?.trim() || '',
                    url: link.url.trim(),
                }))

            const updatedProfile = { ...profile, portfolioLinks }
            await updateApplicantProfile(updatedProfile)
            setProfile(updatedProfile)
            setIsEditingPortfolio(false)
            toast({
                title: 'Обновлено',
                description: 'Портфолио сохранено',
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить портфолио',
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
                .filter(link => link.url?.trim())
                .map(link => ({
                    type: 'OTHER',
                    label: link.title?.trim() || '',
                    value: link.url.trim(),
                }))

            const updatedProfile = { ...profile, contactLinks }
            await updateApplicantProfile(updatedProfile)
            setProfile(updatedProfile)
            setIsEditingContacts(false)
            toast({
                title: 'Обновлено',
                description: 'Контакты сохранены',
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось сохранить контакты',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleFieldChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    const handleRemoveSaved = async (id, title) => {
        try {
            await removeFromSaved(id)
            setSavedOpportunities(prev => prev.filter(opp => opp.id !== id))
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

    const handleRemoveContact = async (userId, direction = 'confirmed') => {
        try {
            await removeContact(userId)
            setContacts(prev => prev.filter(c => c.id !== userId))
            toast({
                title: direction === 'outgoing' ? 'Заявка отменена' : 'Контакт удалён',
                description: direction === 'outgoing'
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
            setIsAvatarUploading(true)
            const updatedProfile = await uploadApplicantAvatar(file)
            setProfile(prev => ({
                ...prev,
                avatar: updatedProfile.avatar || null,
            }))
            toast({
                title: 'Аватар загружен',
                description: 'Фото профиля успешно обновлено',
            })
        } catch (error) {
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
            setProfile(prev => ({
                ...prev,
                resumeFile: updatedProfile.resumeFile || null,
            }))
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
            setProfile(prev => ({
                ...prev,
                avatar: updatedProfile.avatar || null,
                resumeFile: updatedProfile.resumeFile || null,
                portfolioFiles: updatedProfile.portfolioFiles || [],
            }))

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

    const confirmedContacts = useMemo(
        () => contacts.filter((contact) => contact.status === 'ACCEPTED'),
        [contacts]
    )

    const incomingContacts = useMemo(
        () => contacts.filter((contact) => contact.status === 'PENDING' && contact.direction !== 'outgoing'),
        [contacts]
    )

    const outgoingContacts = useMemo(
        () => contacts.filter((contact) => contact.status === 'PENDING' && contact.direction === 'outgoing'),
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
        const fromSaved = savedOpportunities
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
    }, [savedOpportunities, applications])

    const canSendRecommendation =
        recommendationContactsOptions.length > 0 &&
        recommendationOpportunityOptions.length > 0

    const avatarUrl = profile.avatar && user?.id
        ? getFileDownloadUrlByUserAndFile('APPLICANT', user.id, profile.avatar.fileId)
        : null

    const resumeFileUrl = profile.resumeFile && user?.id
        ? getFileDownloadUrlByUserAndFile('APPLICANT', user.id, profile.resumeFile.fileId)
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
            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'profile' ? 'is-active' : ''}`} onClick={() => setActiveTab('profile')}>
                    Профиль
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'applications' ? 'is-active' : ''}`} onClick={() => setActiveTab('applications')}>
                    Отклики
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'saved' ? 'is-active' : ''}`} onClick={() => setActiveTab('saved')}>
                    Избранное
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'contacts' ? 'is-active' : ''}`} onClick={() => setActiveTab('contacts')}>
                    Контакты
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'recommendations' ? 'is-active' : ''}`} onClick={() => setActiveTab('recommendations')}>
                    Рекомендации
                </button>
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
                                    if (isEditing) {
                                        avatarInputRef.current?.click()
                                    }
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
                                            <span className="profile-card__camera-icon">
                                                <span></span>
                                            </span>
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
                                        {user?.id && (
                                            <button
                                                className="profile-card__edit-btn"
                                                onClick={() => navigate(`/seekers/${user.id}`)}
                                            >
                                                Открыть публичный профиль
                                            </button>
                                        )}
                                    </div>
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
                                            <Input value={profile.course || ''} onChange={(e) => handleFieldChange('course', e.target.value)} />
                                            {errors.course && <p className="field-error">{errors.course}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Год выпуска <span className="required-star">*</span></Label>
                                            <Input value={profile.graduationYear || ''} onChange={(e) => handleFieldChange('graduationYear', e.target.value)} />
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
                                                options={VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость резюме"
                                                value={profile.resumeVisibility}
                                                onChange={(val) => handleFieldChange('resumeVisibility', val)}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость откликов"
                                                value={profile.applicationsVisibility}
                                                onChange={(val) => handleFieldChange('applicationsVisibility', val)}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                        </div>
                                        <div className="form-group">
                                            <CustomSelect
                                                label="Видимость контактов"
                                                value={profile.contactsVisibility}
                                                onChange={(val) => handleFieldChange('contactsVisibility', val)}
                                                options={VISIBILITY_OPTIONS}
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
                                                        const fileUrl = getFileDownloadUrlByUserAndFile('APPLICANT', user?.id, file.fileId)
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
                                                        const fileUrl = getFileDownloadUrlByUserAndFile('APPLICANT', user?.id, file.fileId)
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
                                            <LinksEditor
                                                label=""
                                                rows={tempContactLinks}
                                                setRows={setTempContactLinks}
                                                placeholderTitle="Название"
                                                placeholderUrl="https://..."
                                            />
                                            <div className="info-block__actions">
                                                <button className="btn-primary-small" onClick={handleSaveContacts} disabled={isLoading}>Сохранить</button>
                                                <button className="btn-secondary-small" onClick={handleCancelContactsEdit}>Отменить</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.contactLinks && profile.contactLinks.length > 0
                                                ? renderLinks(profile.contactLinks, 'Контакты для связи')
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
                    <div className="seeker-saved">
                        <div className="section-header">
                            <h2>Избранные вакансии</h2>
                            <span className="section-count">{savedOpportunities.length}</span>
                        </div>
                        {savedOpportunities.length === 0 ? (
                            <div className="empty-state">
                                <p>У вас пока нет избранных вакансий</p>
                                <span>Добавляйте вакансии в избранное на главной странице</span>
                            </div>
                        ) : (
                            <div className="saved-list">
                                {savedOpportunities.map((opp, index) => {
                                    const oppKey = opp.id ?? `${opp.title ?? 'saved'}-${opp.savedAt ?? index}`
                                    const canOpenOpportunity = opp.id !== null && opp.id !== undefined

                                    return (
                                        <div
                                            key={oppKey}
                                            className="saved-card"
                                            onClick={() => canOpenOpportunity && navigate(`/opportunities/${opp.id}`)}
                                        >
                                            <div className="saved-card__content">
                                                <h3>{opp.title || 'Вакансия'}</h3>
                                                <p className="saved-card__company">{opp.companyName}</p>
                                                <p className="saved-card__description">{opp.shortDescription}</p>
                                            </div>
                                            <button
                                                className="saved-card__remove"
                                                onClick={(event) => {
                                                    event.stopPropagation()
                                                    handleRemoveSaved(opp.id, opp.title)
                                                }}
                                            >
                                                Удалить
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
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

                        {isContactsLoading ? (
                            <div className="dashboard-loading dashboard-loading--inner">
                                <div className="loading-spinner"></div>
                                <p>Загрузка контактов...</p>
                            </div>
                        ) : currentContacts.length === 0 ? (
                            <div className="empty-state">
                                <p>Контактов в этом разделе пока нет</p>
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
                                            <p>Статус: {
                                                contact.status === 'PENDING'
                                                    ? 'Ожидает ответа'
                                                    : contact.status === 'ACCEPTED'
                                                        ? 'Подтверждён'
                                                        : contact.status
                                            }</p>
                                            <span className="contact-card__date">
                                                {formatDate(contact.createdAt)}
                                            </span>
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
                                            >
                                                Рекомендовать
                                            </button>

                                            {contactsTab === 'incoming' && (
                                                <>
                                                    <button className="btn-approve" onClick={() => handleAcceptContact(contact.id)}>Принять</button>
                                                    <button className="btn-reject" onClick={() => handleDeclineContact(contact.id)}>Отклонить</button>
                                                </>
                                            )}

                                            {contactsTab === 'outgoing' && (
                                                <button className="contact-card__remove" onClick={() => handleRemoveContact(contact.id, 'outgoing')}>
                                                    Отменить заявку
                                                </button>
                                            )}

                                            {contactsTab === 'confirmed' && (
                                                <button className="contact-card__remove" onClick={() => handleRemoveContact(contact.id, 'confirmed')}>
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
                    <div className="seeker-recommendations">
                        <div className="section-header">
                            <h2>Рекомендации</h2>
                            <button
                                className="btn-primary-small"
                                onClick={() =>
                                    setRecommendationModal({
                                        isOpen: true,
                                        selectedOpportunityId: '',
                                        selectedContactId: '',
                                        message: '',
                                    })
                                }
                            >
                                Новая рекомендация
                            </button>
                        </div>

                        <div className="dashboard-tabs dashboard-tabs--inner dashboard-tabs--stats">
                            <button
                                type="button"
                                className={`dashboard-tabs__btn ${recommendationsTab === 'incoming' ? 'is-active' : ''}`}
                                onClick={() => setRecommendationsTab('incoming')}
                            >
                                <span className="dashboard-tabs__label">Входящие</span>
                                <span className="dashboard-tabs__badge">{recommendations.incoming.length}</span>
                            </button>

                            <button
                                type="button"
                                className={`dashboard-tabs__btn ${recommendationsTab === 'outgoing' ? 'is-active' : ''}`}
                                onClick={() => setRecommendationsTab('outgoing')}
                            >
                                <span className="dashboard-tabs__label">Исходящие</span>
                                <span className="dashboard-tabs__badge">{recommendations.outgoing.length}</span>
                            </button>
                        </div>

                        {isRecommendationsLoading ? (
                            <div className="dashboard-loading dashboard-loading--inner">
                                <div className="loading-spinner"></div>
                                <p>Загрузка рекомендаций...</p>
                            </div>
                        ) : currentRecommendations.length === 0 ? (
                            <div className="empty-state">
                                <p>Пока нет рекомендаций</p>
                                <span>
                                    {recommendationsTab === 'incoming'
                                        ? 'Входящие рекомендации появятся здесь'
                                        : 'Отправленные рекомендации появятся здесь'}
                                </span>
                            </div>
                        ) : (
                            <div className="applications-list">
                                {currentRecommendations.map((item) => (
                                    <div
                                        key={item.id}
                                        className="application-card"
                                        onClick={() => navigate(`/opportunities/${item.opportunityId}`)}
                                    >
                                        <div className="application-card__content">
                                            <h3>{item.opportunityTitle}</h3>
                                            <p className="application-card__company">{item.companyName}</p>
                                            <p className="application-card__description">
                                                {recommendationsTab === 'incoming'
                                                    ? `От: ${item.fromApplicantName}`
                                                    : `Кому: ${item.toApplicantName}`}
                                            </p>
                                            {item.message && (
                                                <p className="application-card__description">{item.message}</p>
                                            )}
                                            <div className="application-card__footer">
                                                <span className="application-card__date">{formatDate(item.createdAt)}</span>
                                                {recommendationsTab === 'outgoing' && (
                                                    <button
                                                        className="saved-card__remove"
                                                        onClick={(event) => {
                                                            event.stopPropagation()
                                                            handleDeleteRecommendation(item.id)
                                                        }}
                                                    >
                                                        Удалить
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {recommendationModal.isOpen && (
                <div
                    className="modal-overlay"
                    onClick={() =>
                        setRecommendationModal({
                            isOpen: false,
                            selectedOpportunityId: '',
                            selectedContactId: '',
                            message: '',
                        })
                    }
                >
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Рекомендовать возможность</h3>

                        {!canSendRecommendation && (
                            <div className="modal__empty-state">
                                {recommendationContactsOptions.length === 0 && (
                                    <p>
                                        Сначала добавьте хотя бы один подтверждённый контакт.
                                    </p>
                                )}

                                {recommendationContactsOptions.length > 0 && recommendationOpportunityOptions.length === 0 && (
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