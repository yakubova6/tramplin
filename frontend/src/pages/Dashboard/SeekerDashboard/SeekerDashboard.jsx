import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import Textarea from '../../../components/Textarea'
import CustomSelect from '../../../components/CustomSelect'
import CustomCheckbox from '../../../components/CustomCheckbox'
import LinksEditor from '../../../components/LinksEditor'
import { clearSessionUser, getSessionUser, subscribeSessionChange } from '../../../utils/sessionStore'
import {
    getApplicantProfile,
    updateApplicantProfile,
    getSeekerApplications,
    getSeekerSaved,
    getSeekerContacts,
    removeFromSaved,
    removeContact,
    searchCities
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

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

function SeekerDashboard() {
    const [activeTab, setActiveTab] = useState('profile')
    const [user, setUser] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isEditingAbout, setIsEditingAbout] = useState(false)
    const [isEditingResume, setIsEditingResume] = useState(false)
    const [isEditingPortfolio, setIsEditingPortfolio] = useState(false)
    const [isEditingContacts, setIsEditingContacts] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errors, setErrors] = useState({})
    const { toast } = useToast()

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
    })

    // Временные состояния для редактирования ссылок
    const [tempPortfolioLinks, setTempPortfolioLinks] = useState([])
    const [tempContactLinks, setTempContactLinks] = useState([])

    const [applications, setApplications] = useState([])
    const [savedOpportunities, setSavedOpportunities] = useState([])
    const [contacts, setContacts] = useState([])

    // Состояние для городов
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

    // Преобразование массива строк в массив объектов для редактирования
    const linksToArray = (linksArray) => {
        if (!linksArray || !Array.isArray(linksArray)) return []
        return linksArray.map((url, index) => ({
            id: index,
            title: '',
            url: url
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

    // Функция поиска городов
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

    // Выбор города
    const handleSelectCity = (city) => {
        setProfile(prev => ({
            ...prev,
            cityId: city.id,
            cityName: city.name
        }))
        setCitySearchQuery(city.name)
        setIsCitySearchOpen(false)
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
                        cityId: profileData.cityId,
                        cityName: profileData.cityName || '',
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
                    }))

                    if (profileData.cityName) {
                        setCitySearchQuery(profileData.cityName)
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
            } catch (error) {
                if ([401, 403, 500, 503].includes(error?.status)) {
                    clearSessionUser()
                    setUser(null)
                    setApplications([])
                    setSavedOpportunities([])
                    setContacts([])
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

            // Диспатчим событие обновления профиля
            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: {
                    firstName: profile.firstName,
                    lastName: profile.lastName,
                    role: 'APPLICANT'
                }
            }))

            toast({
                title: 'Профиль обновлён',
                description: 'Ваши данные успешно сохранены',
            })
        } catch (error) {
            console.error('Save error:', error)
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
                .map(link => link.url.trim())

            const updatedProfile = { ...profile, portfolioLinks }
            await updateApplicantProfile(updatedProfile)
            setProfile(updatedProfile)
            setIsEditingPortfolio(false)
            toast({
                title: 'Обновлено',
                description: 'Портфолио сохранено',
            })
        } catch (error) {
            console.error('Save portfolio error:', error)
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
                .map(link => link.url.trim())

            const updatedProfile = { ...profile, contactLinks }
            await updateApplicantProfile(updatedProfile)
            setProfile(updatedProfile)
            setIsEditingContacts(false)
            toast({
                title: 'Обновлено',
                description: 'Контакты сохранены',
            })
        } catch (error) {
            console.error('Save contacts error:', error)
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
                description: `"${title}" удалено из избранного`,
            })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось удалить из избранного',
                variant: 'destructive',
            })
        }
    }

    const handleRemoveContact = async (userId) => {
        try {
            await removeContact(userId)
            setContacts(prev => prev.filter(c => c.id !== userId))
            toast({
                title: 'Контакт удалён',
                description: 'Пользователь удалён из ваших контактов',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error.message || 'Не удалось удалить контакт',
                variant: 'destructive',
            })
        }
    }

    // Открытие редактирования портфолио
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

    // Открытие редактирования контактов
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

    // ===== ФУНКЦИИ ДЛЯ ОТОБРАЖЕНИЯ ИМЕНИ =====

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


    // Функция для отображения ссылок
    const renderLinks = (links, title) => {
        if (!links || links.length === 0) return null

        return (
            <div className="links-display">
                <h4>{title}</h4>
                <div className="links-list">
                    {links.map((url, idx) => {
                        let displayName = url
                        try {
                            const urlObj = new URL(url)
                            displayName = urlObj.hostname
                        } catch {
                            displayName = url
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

    return (
        <DashboardLayout
            title="Мой профиль"
            subtitle={getDisplayName() ? `Добро пожаловать, ${getDisplayName()}!` : 'Управляйте своей карьерой'}
        >
            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'profile' ? 'is-active' : ''}`} onClick={() => setActiveTab('profile')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M20 21V19C20 16.8 18.2 15 16 15H8C5.8 15 4 16.8 4 19V21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Профиль
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'applications' ? 'is-active' : ''}`} onClick={() => setActiveTab('applications')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 12H15M9 16H15M17 21H7C5.9 21 5 20.1 5 19V5C5 3.9 5.9 3 7 3H12.6C12.8 3 13 3.1 13.1 3.2L18.8 8.9C18.9 9 19 9.2 19 9.4V19C19 20.1 18.1 21 17 21Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M13 3V9H19" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Отклики
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'saved' ? 'is-active' : ''}`} onClick={() => setActiveTab('saved')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 21L10.6 19.8C7.5 17.1 5 14.9 5 12.2C5 9.9 6.9 8 9.2 8C10.5 8 11.8 8.7 12 9.6C12.2 8.7 13.5 8 14.8 8C17.1 8 19 9.9 19 12.2C19 14.9 16.5 17.1 13.4 19.8L12 21Z" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                    Избранное
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'contacts' ? 'is-active' : ''}`} onClick={() => setActiveTab('contacts')}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21" stroke="currentColor" strokeWidth="1.5"/>
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M23 21V19C22.6 17 21 15.6 19 15.3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        <path d="M16 3.3C18 3.6 19.6 5 20 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Контакты
                </button>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'profile' && (
                    <div className="seeker-profile">
                        {/* КАРТОЧКА ПРОФИЛЯ */}
                        <div className="profile-card">
                            <div className="profile-card__avatar-initials">
                                {getInitials() !== '?' ? (
                                    getInitials()
                                ) : (
                                    <img src={userAvatarIcon} alt="Аватар" className="profile-card__avatar-icon"/>
                                )}
                            </div>
                            <div className="profile-card__info">
                                <div className="profile-card__header">
                                    <h2>{getFullNameWithPatronymic() || user?.displayName || 'Не указано'}</h2>
                                    <button
                                        className="profile-card__edit-btn"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <img src={editIcon} alt="" className="icon"/>
                                        Редактировать
                                    </button>
                                </div>
                                <div className="profile-card__details">
                                    <div className="profile-card__detail">
                                        <span className="profile-card__detail-label">
                                            <img src={briefcaseIcon} alt="" className="icon-small"/>
                                            Статус
                                        </span>
                                        <span
                                            className={`status-badge ${profile.openToWork ? 'status-active' : 'status-passive'}`}>
                                            {profile.openToWork ? 'Активно ищу работу' : 'Не ищу работу'}
                                        </span>
                                    </div>
                                    {profile.universityName && (
                                        <div className="profile-card__detail">
                                            <span className="profile-card__detail-label">
                                                <img src={calendarIcon} alt="" className="icon-small"/>
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
                                                <img src={locationIcon} alt="" className="icon-small"/>
                                                Город
                                            </span>
                                            <span className="profile-card__detail-value">{profile.cityName}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ФОРМА РЕДАКТИРОВАНИЯ ОСНОВНОЙ ИНФОРМАЦИИ */}
                        {isEditing && (
                            <div className="profile-edit-form">
                                <div className="profile-edit-form__header">
                                    <h3>Редактирование профиля</h3>
                                    <button
                                        className="profile-edit-form__close"
                                        onClick={() => setIsEditing(false)}
                                        aria-label="Закрыть"
                                    >
                                        ×
                                    </button>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Основная информация</h4>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Имя <span className="required-star">*</span></Label>
                                            <Input
                                                value={profile.firstName}
                                                onChange={(e) => handleFieldChange('firstName', e.target.value)}
                                                placeholder="Иван"
                                            />
                                            {errors.firstName && <p className="field-error">{errors.firstName}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Фамилия <span className="required-star">*</span></Label>
                                            <Input
                                                value={profile.lastName}
                                                onChange={(e) => handleFieldChange('lastName', e.target.value)}
                                                placeholder="Петров"
                                            />
                                            {errors.lastName && <p className="field-error">{errors.lastName}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Отчество</Label>
                                            <Input
                                                value={profile.middleName}
                                                onChange={(e) => handleFieldChange('middleName', e.target.value)}
                                                placeholder="Иванович"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="profile-edit-form__section">
                                    <h4>Образование</h4>
                                    <div className="form-group">
                                        <Label>Вуз</Label>
                                        <Input
                                            value={profile.universityName}
                                            onChange={(e) => handleFieldChange('universityName', e.target.value)}
                                            placeholder="МГУ им. Ломоносова"
                                        />
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Факультет</Label>
                                            <Input
                                                value={profile.facultyName}
                                                onChange={(e) => handleFieldChange('facultyName', e.target.value)}
                                                placeholder="Введите факультет"
                                            />
                                        </div>
                                        <div className="form-group">
                                            <Label>Образовательная программа</Label>
                                            <Input
                                                value={profile.studyProgram}
                                                onChange={(e) => handleFieldChange('studyProgram', e.target.value)}
                                                placeholder="Введите программу обучения"
                                            />
                                        </div>
                                    </div>
                                    <div className="form-row">
                                        <div className="form-group">
                                            <Label>Курс <span className="required-star">*</span></Label>
                                            <Input
                                                value={profile.course || ''}
                                                onChange={(e) => handleFieldChange('course', e.target.value)}
                                                placeholder="4"
                                            />
                                            {errors.course && <p className="field-error">{errors.course}</p>}
                                        </div>
                                        <div className="form-group">
                                            <Label>Год выпуска <span className="required-star">*</span></Label>
                                            <Input
                                                value={profile.graduationYear || ''}
                                                onChange={(e) => handleFieldChange('graduationYear', e.target.value)}
                                                placeholder="2025"
                                            />
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
                                        <CustomCheckbox
                                            checked={profile.openToWork}
                                            onChange={(val) => handleFieldChange('openToWork', val)}
                                            label="Ищу работу / стажировку"
                                        />
                                        <CustomCheckbox
                                            checked={profile.openToEvents}
                                            onChange={(val) => handleFieldChange('openToEvents', val)}
                                            label="Интересуюсь карьерными мероприятиями"
                                        />
                                    </div>
                                </div>

                                <div className="profile-edit-form__actions">
                                    <button
                                        className="btn-primary"
                                        onClick={handleSaveProfile}
                                        disabled={isLoading}
                                    >
                                        {isLoading ? 'Сохранение...' : 'Сохранить изменения'}
                                    </button>
                                    <button
                                        className="btn-secondary"
                                        onClick={() => setIsEditing(false)}
                                    >
                                        Отменить
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* БЛОКИ КОНТЕНТА */}
                        {!isEditing && (
                            <>
                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>О себе</h3>
                                        <button
                                            className="info-block__edit-btn"
                                            onClick={() => setIsEditingAbout(!isEditingAbout)}
                                        >
                                            <img src={pencilIcon} alt="" className="icon-small"/>
                                            {isEditingAbout ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingAbout ? (
                                        <div className="info-block__edit">
                                            <Textarea
                                                rows={4}
                                                value={profile.about}
                                                onChange={(e) => handleFieldChange('about', e.target.value)}
                                                placeholder="Расскажите о своих навыках, увлечениях, достижениях и карьерных целях"
                                            />
                                            <div className="info-block__actions">
                                                <button
                                                    className="btn-primary-small"
                                                    onClick={handleSaveAbout}
                                                    disabled={isLoading}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="btn-secondary-small"
                                                    onClick={() => setIsEditingAbout(false)}
                                                >
                                                    Отменить
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.about ? (
                                                <p>{profile.about}</p>
                                            ) : (
                                                <p className="info-block__empty">Расскажите о себе — это поможет работодателям узнать вас лучше</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Резюме</h3>
                                        <button
                                            className="info-block__edit-btn"
                                            onClick={() => setIsEditingResume(!isEditingResume)}
                                        >
                                            <img src={pencilIcon} alt="" className="icon-small"/>
                                            {isEditingResume ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingResume ? (
                                        <div className="info-block__edit">
                                            <Textarea
                                                rows={6}
                                                value={profile.resumeText}
                                                onChange={(e) => handleFieldChange('resumeText', e.target.value)}
                                                placeholder="Опишите ваш опыт работы, проекты, технологии и навыки"
                                            />
                                            <div className="info-block__actions">
                                                <button
                                                    className="btn-primary-small"
                                                    onClick={handleSaveResume}
                                                    disabled={isLoading}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="btn-secondary-small"
                                                    onClick={() => setIsEditingResume(false)}
                                                >
                                                    Отменить
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.resumeText ? (
                                                <p>{profile.resumeText}</p>
                                            ) : (
                                                <p className="info-block__empty">Добавьте резюме — расскажите о своих навыках, опыте и достижениях</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Портфолио</h3>
                                        <button
                                            className="info-block__edit-btn"
                                            onClick={handleOpenPortfolioEdit}
                                        >
                                            <img src={pencilIcon} alt="" className="icon-small"/>
                                            {isEditingPortfolio ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingPortfolio ? (
                                        <div className="info-block__edit">
                                            <LinksEditor
                                                label=""
                                                rows={tempPortfolioLinks}
                                                setRows={setTempPortfolioLinks}
                                                placeholderTitle="Название (GitHub, Portfolio...)"
                                                placeholderUrl="https://..."
                                            />
                                            <div className="info-block__actions">
                                                <button
                                                    className="btn-primary-small"
                                                    onClick={handleSavePortfolio}
                                                    disabled={isLoading}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="btn-secondary-small"
                                                    onClick={handleCancelPortfolioEdit}
                                                >
                                                    Отменить
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.portfolioLinks && profile.portfolioLinks.length > 0 ? (
                                                renderLinks(profile.portfolioLinks, 'Ссылки портфолио')
                                            ) : (
                                                <p className="info-block__empty">Добавьте ссылки на ваши проекты, GitHub, Behance и т.д.</p>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Контакты</h3>
                                        <button
                                            className="info-block__edit-btn"
                                            onClick={handleOpenContactsEdit}
                                        >
                                            <img src={pencilIcon} alt="" className="icon-small"/>
                                            {isEditingContacts ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    </div>
                                    {isEditingContacts ? (
                                        <div className="info-block__edit">
                                            <LinksEditor
                                                label=""
                                                rows={tempContactLinks}
                                                setRows={setTempContactLinks}
                                                placeholderTitle="Название (Telegram, LinkedIn...)"
                                                placeholderUrl="https://..."
                                            />
                                            <div className="info-block__actions">
                                                <button
                                                    className="btn-primary-small"
                                                    onClick={handleSaveContacts}
                                                    disabled={isLoading}
                                                >
                                                    Сохранить
                                                </button>
                                                <button
                                                    className="btn-secondary-small"
                                                    onClick={handleCancelContactsEdit}
                                                >
                                                    Отменить
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="info-block__content">
                                            {profile.contactLinks && profile.contactLinks.length > 0 ? (
                                                renderLinks(profile.contactLinks, 'Контакты для связи')
                                            ) : (
                                                <p className="info-block__empty">Добавьте ссылки на Telegram, LinkedIn, WhatsApp и т.д.</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Остальные табы */}
                {activeTab === 'applications' && (
                    <div className="seeker-applications">
                        <div className="section-header">
                            <h2>Мои отклики</h2>
                            <span className="section-count">{applications.length}</span>
                        </div>
                        {applications.length === 0 ? (
                            <div className="empty-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M9 12H15M9 16H15M17 21H7C5.9 21 5 20.1 5 19V5C5 3.9 5.9 3 7 3H12.6C12.8 3 13 3.1 13.1 3.2L18.8 8.9C18.9 9 19 9.2 19 9.4V19C19 20.1 18.1 21 17 21Z"/>
                                    <path d="M13 3V9H19"/>
                                </svg>
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
                                    )})}
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
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M12 21L10.6 19.8C7.5 17.1 5 14.9 5 12.2C5 9.9 6.9 8 9.2 8C10.5 8 11.8 8.7 12 9.6C12.2 8.7 13.5 8 14.8 8C17.1 8 19 9.9 19 12.2C19 14.9 16.5 17.1 13.4 19.8L12 21Z"/>
                                </svg>
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
                                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                                    <path d="M18 6L6 18M6 6L18 18" strokeWidth="1.5" strokeLinecap="round"/>
                                                </svg>
                                                Удалить
                                            </button>
                                        </div>
                                    )})}
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
                        {contacts.length === 0 ? (
                            <div className="empty-state">
                                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
                                    <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21"/>
                                    <circle cx="9" cy="7" r="4"/>
                                    <path d="M23 21V19C22.6 17 21 15.6 19 15.3"/>
                                    <path d="M16 3.3C18 3.6 19.6 5 20 7"/>
                                </svg>
                                <p>У вас пока нет контактов</p>
                                <span>Добавляйте интересных специалистов в их профилях</span>
                            </div>
                        ) : (
                            <div className="contacts-list">
                                {contacts.map(contact => (
                                    <div key={contact.id} className="contact-card">
                                        <div className="contact-card__avatar">
                                            {contact.firstName?.[0]}{contact.lastName?.[0]}
                                        </div>
                                        <div className="contact-card__info">
                                            <h3>{contact.firstName} {contact.lastName}</h3>
                                            <p>Статус: {contact.status}</p>
                                        </div>
                                        <button
                                            className="contact-card__remove"
                                            onClick={() => handleRemoveContact(contact.id)}
                                        >
                                            Удалить
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    )
}

export default SeekerDashboard