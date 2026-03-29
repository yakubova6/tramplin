import { useState, useEffect, useRef } from 'react'
import { useToast } from '../../../hooks/use-toast'
import DashboardLayout from '../DashboardLayout'
import Button from '../../../components/Button'
import Input from '../../../components/Input'
import Label from '../../../components/Label'
import Textarea from '../../../components/Textarea'
import CustomSelect from '../../../components/CustomSelect'
import LinksEditor from '../../../components/LinksEditor'
import { clearSessionUser, getSessionUser, subscribeSessionChange } from '../../../utils/sessionStore'
import {
    getEmployerProfile,
    updateEmployerProfile,
    submitVerification,
    getEmployerOpportunities,
    createOpportunity,
    deleteOpportunity,
    getEmployerApplications,
    updateApplicationStatus,
    searchCities
} from '../../../api/profile'
import { listTags, OPPORTUNITY_LABELS } from '../../../api/opportunities'
import '../DashboardBase.scss'
import './EmployerDashboard.scss'

// Импорт иконок
import editIcon from '../../../assets/icons/edit.svg'
import linkIcon from '../../../assets/icons/link.svg'

const OPPORTUNITY_TYPES = [
    { value: 'VACANCY', label: 'Вакансия' },
    { value: 'INTERNSHIP', label: 'Стажировка' },
    { value: 'MENTORING', label: 'Менторская программа' },
    { value: 'EVENT', label: 'Мероприятие' },
]

const WORK_FORMATS = [
    { value: 'OFFICE', label: 'Офис' },
    { value: 'HYBRID', label: 'Гибрид' },
    { value: 'REMOTE', label: 'Удалённо' },
]

const EXPERIENCE_LEVELS = [
    { value: 'INTERN', label: 'Intern' },
    { value: 'JUNIOR', label: 'Junior' },
    { value: 'MIDDLE', label: 'Middle' },
    { value: 'SENIOR', label: 'Senior' },
]

const EMPLOYMENT_TYPES = [
    { value: 'FULL_TIME', label: 'Полная занятость' },
    { value: 'PART_TIME', label: 'Частичная занятость' },
    { value: 'PROJECT', label: 'Проектная работа' },
]

const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
]

const VERIFICATION_METHODS = [
    { value: 'CORPORATE_EMAIL', label: 'Корпоративная почта' },
    { value: 'TIN', label: 'ИНН' },
    { value: 'PROFESSIONAL_LINKS', label: 'Ссылки на проф. сети' },
]

function EmployerDashboard() {
    const [activeTab, setActiveTab] = useState('opportunities')
    const [user, setUser] = useState(null)
    const [isEditing, setIsEditing] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errors, setErrors] = useState({})
    const [selectedOpportunity, setSelectedOpportunity] = useState(null)
    const [showVerificationModal, setShowVerificationModal] = useState(false)
    const [searchTerm, setSearchTerm] = useState('')
    const [filterStatus, setFilterStatus] = useState('all')
    const { toast } = useToast()

    // Состояние для городов
    const [isCitySearchOpen, setIsCitySearchOpen] = useState(false)
    const [citySearchQuery, setCitySearchQuery] = useState('')
    const [citySuggestions, setCitySuggestions] = useState([])
    const [cityActiveIndex, setCityActiveIndex] = useState(-1)
    const citySearchRef = useRef(null)

    // Состояния для ссылок - это копии данных из profile для редактирования
    const [socialRows, setSocialRows] = useState([])
    const [contactRows, setContactRows] = useState([])

    const [verificationData, setVerificationData] = useState({
        method: 'CORPORATE_EMAIL',
        corporateEmail: '',
        inn: '',
        submittedComment: '',
    })

    const [profile, setProfile] = useState({
        companyName: '',
        legalName: '',
        inn: '',
        description: '',
        industry: '',
        websiteUrl: '',
        cityId: null,
        cityName: '',
        locationId: null,
        companySize: '',
        foundedYear: null,
        socialLinks: [],
        publicContacts: {},
        verificationStatus: 'PENDING',
    })

    const [newOpportunity, setNewOpportunity] = useState({
        title: '',
        shortDescription: '',
        fullDescription: '',
        type: 'VACANCY',
        workFormat: 'REMOTE',
        cityId: null,
        cityName: '',
        expiresAt: '',
        requirements: '',
        grade: 'JUNIOR',
        employmentType: 'FULL_TIME',
        salaryFrom: '',
        salaryTo: '',
        tagIds: [],
        contactEmail: '',
        contactPhone: '',
        contactPerson: '',
    })

    const [opportunities, setOpportunities] = useState([])
    const [applicants, setApplicants] = useState([])
    const [techTags, setTechTags] = useState([])

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

    // Преобразование массива строк (из бэкенда) в массив для LinksEditor
    const socialLinksToRows = (socialLinks) => {
        if (!socialLinks || !Array.isArray(socialLinks)) return []
        return socialLinks
            .filter(url => url && typeof url === 'string' && url.trim())
            .map((url, index) => ({
                id: Date.now() + index,
                title: `Ссылка ${index + 1}`,
                url: url.trim()
            }))
    }

    // Преобразование объекта (из бэкенда) в массив для LinksEditor
    const contactsToRows = (contacts) => {
        if (!contacts || typeof contacts !== 'object') return []
        return Object.entries(contacts)
            .filter(([title, url]) => title && url && typeof url === 'string' && url.trim())
            .map(([title, url], index) => ({
                id: Date.now() + index,
                title: title,
                url: url.trim()
            }))
    }

    // Преобразование массива из LinksEditor в массив строк для бэкенда
    const rowsToSocialLinks = (rows) => {
        return rows
            .filter(row => row.url && typeof row.url === 'string' && row.url.trim())
            .map(row => row.url.trim())
    }

    // Преобразование массива из LinksEditor в объект для бэкенда
    const rowsToContacts = (rows) => {
        const result = {}
        rows.forEach(row => {
            const title = row.title && typeof row.title === 'string' ? row.title.trim() : ''
            const url = row.url && typeof row.url === 'string' ? row.url.trim() : ''
            if (title && url) {
                result[title] = url
            }
        })
        return result
    }

    // Функция для отображения ссылок
    const renderLink = (url, title) => {
        let displayName = title || url
        try {
            const urlObj = new URL(url)
            displayName = urlObj.hostname
        } catch {
            displayName = title || url
        }
        return (
            <a key={url + title} href={url} target="_blank" rel="noopener noreferrer" className="link-item">
                <img src={linkIcon} alt="" className="icon-small" />
                <span>{displayName}</span>
            </a>
        )
    }

    // Загрузка данных с бэкенда
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
                    setOpportunities([])
                    setApplicants([])
                    return
                }

                const profileData = await getEmployerProfile()
                if (profileData) {
                    setProfile(prev => ({
                        ...prev,
                        companyName: profileData.companyName || currentUser?.displayName || '',
                        legalName: profileData.legalName || '',
                        inn: profileData.inn || '',
                        description: profileData.description || '',
                        industry: profileData.industry || '',
                        websiteUrl: profileData.websiteUrl || '',
                        cityId: profileData.cityId,
                        cityName: profileData.cityName || '',
                        locationId: profileData.locationId,
                        companySize: profileData.companySize || '',
                        foundedYear: profileData.foundedYear,
                        socialLinks: profileData.socialLinks || [],
                        publicContacts: profileData.publicContacts || {},
                        verificationStatus: profileData.verificationStatus || 'PENDING',
                    }))

                    setSocialRows(socialLinksToRows(profileData.socialLinks || []))
                    setContactRows(contactsToRows(profileData.publicContacts || {}))

                    if (profileData.cityName) {
                        setCitySearchQuery(profileData.cityName)
                    }
                }

                const opportunitiesData = await getEmployerOpportunities()
                setOpportunities(opportunitiesData)

                const applicantsData = await getEmployerApplications()
                setApplicants(applicantsData)
            } catch (error) {
                console.error('Load error:', error)

                if ([401, 403, 500, 503].includes(error?.status)) {
                    clearSessionUser()
                    setUser(null)
                    setOpportunities([])
                    setApplicants([])
                    return
                }

                toast({
                    title: 'Ошибка',
                    description: 'Не удалось загрузить профиль',
                    variant: 'destructive'
                })
            } finally {
                setIsLoading(false)
            }
        }

        loadData()

        return unsubscribe
    }, [toast])

    useEffect(() => {
        listTags('TECH')
            .then((items) => setTechTags(items || []))
            .catch(() => setTechTags([]))
    }, [])

    // Закрываем редактирование при смене вкладки
    useEffect(() => {
        if (isEditing) {
            setIsEditing(false)
            // Восстанавливаем данные из profile при закрытии
            setSocialRows(socialLinksToRows(profile.socialLinks || []))
            setContactRows(contactsToRows(profile.publicContacts || {}))
        }
    }, [activeTab])

    const validateProfile = () => {
        const newErrors = {}
        if (!profile.companyName?.trim()) newErrors.companyName = 'Укажие название компании'
        if (!profile.inn?.trim() || !/^\d{10}(\d{2})?$/.test(profile.inn.trim())) {
            newErrors.inn = 'ИНН должен содержать 10 или 12 цифр'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSaveProfile = async () => {
        if (!validateProfile()) {
            toast({ title: 'Ошибка', description: 'Заполните обязательные поля', variant: 'destructive' })
            return
        }
        setIsLoading(true)
        try {
            // Преобразуем данные из редакторов в формат для бэкенда
            const socialLinksToSave = rowsToSocialLinks(socialRows)
            const contactsToSave = rowsToContacts(contactRows)

            const updatedProfile = {
                ...profile,
                socialLinks: socialLinksToSave,
                publicContacts: contactsToSave,
            }

            console.log('[Save] Sending to backend:', {
                socialLinks: socialLinksToSave,
                publicContacts: contactsToSave
            })

            // Отправляем на бэкенд
            const result = await updateEmployerProfile(updatedProfile)
            console.log('[Save] Backend response:', result)

            // Обновляем локальный profile
            setProfile(updatedProfile)

            // Синхронизируем редакторы с сохраненными данными
            setSocialRows(socialLinksToRows(socialLinksToSave))
            setContactRows(contactsToRows(contactsToSave))

            setIsEditing(false)
            setErrors({})

            window.dispatchEvent(new CustomEvent('profile-updated', {
                detail: {
                    companyName: updatedProfile.companyName,
                    role: 'EMPLOYER'
                }
            }))

            toast({ title: 'Профиль сохранён', description: 'Информация о компании обновлена' })
        } catch (error) {
            console.error('Save error:', error)
            toast({ title: 'Ошибка', description: error?.message || 'Не удалось сохранить профиль', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmitVerification = async () => {
        if (!profile.companyName || !profile.inn) {
            toast({ title: 'Ошибка', description: 'Заполните название компании и ИНН', variant: 'destructive' })
            return
        }
        setIsLoading(true)
        try {
            await submitVerification(verificationData)
            setProfile(prev => ({ ...prev, verificationStatus: 'PENDING' }))
            setShowVerificationModal(false)
            toast({ title: 'Заявка отправлена', description: 'Профиль отправлен на проверку' })
        } catch {
            toast({ title: 'Ошибка', description: 'Не удалось отправить заявку', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleCreateOpportunity = async () => {
        if (!newOpportunity.title.trim() || !newOpportunity.shortDescription.trim()) {
            toast({ title: 'Ошибка', description: 'Заполните название и краткое описание', variant: 'destructive' })
            return
        }
        setIsLoading(true)
        try {
            const created = await createOpportunity({
                ...newOpportunity,
                companyName: profile.companyName || user?.displayName,
            })
            setOpportunities(prev => [created, ...prev])
            setNewOpportunity({
                title: '',
                shortDescription: '',
                fullDescription: '',
                type: 'VACANCY',
                workFormat: 'REMOTE',
                cityId: null,
                cityName: '',
                expiresAt: '',
                requirements: '',
                grade: 'JUNIOR',
                employmentType: 'FULL_TIME',
                salaryFrom: '',
                salaryTo: '',
                tagIds: [],
                contactEmail: '',
                contactPhone: '',
                contactPerson: '',
            })
            toast({ title: 'Публикация создана', description: 'Карточка отправлена на модерацию' })
            setActiveTab('opportunities')
        } catch (error) {
            toast({ title: 'Ошибка', description: error?.message || 'Не удалось создать публикацию', variant: 'destructive' })
        } finally {
            setIsLoading(false)
        }
    }

    const handleDeleteOpportunity = async (id, title) => {
        try {
            await deleteOpportunity(id)
            setOpportunities(prev => prev.filter(opp => opp.id !== id))
            toast({ title: 'Удалено', description: `"${title}" удалена` })
        } catch {
            toast({ title: 'Ошибка', description: 'Не удалось удалить', variant: 'destructive' })
        }
    }

    const handleUpdateApplicationStatus = async (id, newStatus) => {
        try {
            await updateApplicationStatus(id, newStatus)
            setApplicants(prev => prev.map(app => app.id === id ? { ...app, status: newStatus } : app))
            const statusText = newStatus === 'approved' ? 'Принят' : newStatus === 'rejected' ? 'Отклонён' : 'В резерве'
            toast({ title: 'Статус обновлён', description: `Статус изменён на "${statusText}"` })
        } catch {
            toast({ title: 'Ошибка', description: 'Не удалось обновить статус', variant: 'destructive' })
        }
    }

    const handleFieldChange = (field, value) => {
        setProfile(prev => ({ ...prev, [field]: value }))
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }))
        }
    }

    // Фильтрация вакансий
    const filteredOpportunities = opportunities.filter(opp => {
        const matchesSearch = opp.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            opp.shortDescription?.toLowerCase().includes(searchTerm.toLowerCase())
        const statusMap = {
            active: ['PUBLISHED', 'PENDING_MODERATION', 'PLANNED'],
            closed: ['CLOSED', 'ARCHIVED'],
        }
        const matchesStatus = filterStatus === 'all' || statusMap[filterStatus]?.includes(opp.status)
        return matchesSearch && matchesStatus
    })

    const isVerified = profile.verificationStatus === 'APPROVED'
    const isPending = profile.verificationStatus === 'PENDING'

    if (isLoading && !profile.companyName) {
        return (
            <DashboardLayout title="Кабинет работодателя">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Загрузка профиля...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout title="Управление компанией" subtitle={profile.companyName || user?.displayName}>
            {!isVerified && (
                <div className={`verification-banner ${isPending ? '' : 'verification-banner--warning'}`}>
                    <div className="verification-banner__content">
                        <svg className="verification-banner__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                        <span>{isPending ? 'Профиль на проверке. После верификации вы сможете публиковать вакансии.' : 'Для публикации вакансий пройдите верификацию.'}</span>
                    </div>
                    {!isPending && (
                        <button className="verification-banner__button" onClick={() => setShowVerificationModal(true)}>
                            Пройти верификацию
                        </button>
                    )}
                </div>
            )}

            <div className="dashboard-tabs">
                <button className={`dashboard-tabs__btn ${activeTab === 'opportunities' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('opportunities')}>
                    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="7" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M16 21V5C16 3.9 15.1 3 14 3H10C8.9 3 8 3.9 8 5V21" stroke="currentColor"
                              strokeWidth="1.5"/>
                    </svg>
                    Вакансии
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'create' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('create')} disabled={!isVerified}>
                    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 4V20M4 12H20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                    Создать
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'applicants' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('applicants')}>
                    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <path d="M17 21V19C17 16.8 15.2 15 13 15H5C2.8 15 1 16.8 1 19V21" stroke="currentColor"
                              strokeWidth="1.5"/>
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M23 21V19C22.6 17 21 15.6 19 15.3" stroke="currentColor" strokeWidth="1.5"
                              strokeLinecap="round"/>
                        <path d="M16 3.3C18 3.6 19.6 5 20 7" stroke="currentColor" strokeWidth="1.5"
                              strokeLinecap="round"/>
                    </svg>
                    Отклики
                </button>
                <button className={`dashboard-tabs__btn ${activeTab === 'profile' ? 'is-active' : ''}`}
                        onClick={() => setActiveTab('profile')}>
                    <svg className="icon" width="18" height="18" viewBox="0 0 24 24" fill="none"
                         xmlns="http://www.w3.org/2000/svg">
                        <rect x="4" y="2" width="16" height="20" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M8 6H16M8 10H16M8 14H12" stroke="currentColor" strokeWidth="1.5"
                              strokeLinecap="round"/>
                    </svg>
                    О компании
                </button>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'opportunities' && (
                    <div className="employer-opportunities">
                        <div className="employer-opportunities__header">
                            <h2>Мои вакансии</h2>
                            <div className="employer-opportunities__filters">
                                <input
                                    type="text"
                                    placeholder="Поиск по названию..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="search-input"
                                />
                                <CustomSelect
                                    value={filterStatus}
                                    onChange={setFilterStatus}
                                    options={[
                                        {value: 'all', label: 'Все'},
                                        {value: 'active', label: 'Активные'},
                                        {value: 'closed', label: 'Закрытые'},
                                    ]}
                                    placeholder="Статус"
                                />
                            </div>
                        </div>
                        {filteredOpportunities.length === 0 ? (
                            <p className="employer-empty">{isVerified ? 'Создайте первую вакансию' : 'После верификации вы сможете создавать вакансии'}</p>
                        ) : (
                            <div className="employer-opportunities__list">
                                {filteredOpportunities.map(opp => (
                                    <div key={opp.id} className="employer-opportunities__item">
                                        <div className="employer-opportunities__info">
                                            <h3>{opp.title}</h3>
                                            <p className="employer-opportunities__type">
                                                {OPPORTUNITY_LABELS.type[opp.type] || opp.type} • {OPPORTUNITY_LABELS.workFormat[opp.workFormat] || opp.workFormat}
                                            </p>
                                            <p className="employer-opportunities__description">{opp.shortDescription}</p>
                                            <div className="employer-opportunities__skills">
                                                {opp.tags?.map((tag) => <span key={tag.id}
                                                                              className="skill-tag">{tag.name}</span>)}
                                            </div>
                                        </div>
                                        <div className="employer-opportunities__meta">
                                            <span className={`status-badge status-${opp.status}`}>
                                                {OPPORTUNITY_LABELS.status[opp.status] || opp.status}
                                            </span>
                                            <span className="employer-opportunities__date">
                                                {new Date(opp.updatedAt || opp.createdAt).toLocaleDateString('ru-RU')}
                                            </span>
                                            <div className="employer-opportunities__actions">
                                                <button className="employer-opportunities__view"
                                                        onClick={() => setSelectedOpportunity(selectedOpportunity === opp ? null : opp)}>
                                                    {selectedOpportunity === opp ? 'Скрыть' : 'Подробнее'}
                                                </button>
                                                <button className="employer-opportunities__delete"
                                                        onClick={() => handleDeleteOpportunity(opp.id, opp.title)}>
                                                    Удалить
                                                </button>
                                            </div>
                                            {selectedOpportunity === opp && (
                                                <div className="employer-opportunities__details">
                                                    <h4>Подробнее</h4>
                                                    <p><strong>Требования:</strong> {opp.requirements || '—'}</p>
                                                    <p>
                                                        <strong>Уровень:</strong> {OPPORTUNITY_LABELS.grade[opp.grade] || opp.grade}
                                                    </p>
                                                    <p>
                                                        <strong>Занятость:</strong> {OPPORTUNITY_LABELS.employmentType[opp.employmentType] || opp.employmentType}
                                                    </p>
                                                    <p><strong>Место:</strong> {opp.city?.name || opp.locationPreview?.addressLine || '—'}</p>
                                                    {opp.expiresAt && <p><strong>Срок
                                                        до:</strong> {new Date(opp.expiresAt).toLocaleDateString('ru-RU')}
                                                    </p>}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'create' && isVerified && (
                    <div className="employer-create-form">
                        <h2>Новая публикация</h2>
                        <div className="employer-create-form__field">
                            <Label>Название <span className="required-star">*</span></Label>
                            <Input value={newOpportunity.title}
                                   onChange={e => setNewOpportunity({...newOpportunity, title: e.target.value})}
                                   placeholder="Frontend Developer"/>
                        </div>
                        <div className="employer-create-form__grid-2">
                            <CustomSelect label="Тип" value={newOpportunity.type}
                                          onChange={val => setNewOpportunity({...newOpportunity, type: val})}
                                          options={OPPORTUNITY_TYPES}/>
                            <CustomSelect label="Формат" value={newOpportunity.workFormat}
                                          onChange={val => setNewOpportunity({...newOpportunity, workFormat: val})}
                                          options={WORK_FORMATS}/>
                        </div>
                        <div className="employer-create-form__field">
                            <Label>Краткое описание <span className="required-star">*</span></Label>
                            <Textarea rows={3} value={newOpportunity.shortDescription}
                                      onChange={e => setNewOpportunity({...newOpportunity, shortDescription: e.target.value})}
                                      placeholder="Кратко о вакансии/стажировке"/>
                        </div>
                        <div className="employer-create-form__field">
                            <Label>Полное описание</Label>
                            <Textarea rows={5} value={newOpportunity.fullDescription} onChange={e => setNewOpportunity({
                                ...newOpportunity,
                                fullDescription: e.target.value
                            })} placeholder="Обязанности, требования, условия..."/>
                        </div>
                        <div className="employer-create-form__grid-3">
                            <CustomSelect label="Уровень" value={newOpportunity.grade}
                                          onChange={val => setNewOpportunity({...newOpportunity, grade: val})}
                                          options={EXPERIENCE_LEVELS}/>
                            <CustomSelect label="Занятость" value={newOpportunity.employmentType}
                                          onChange={val => setNewOpportunity({...newOpportunity, employmentType: val})}
                                          options={EMPLOYMENT_TYPES}/>
                            <div className="employer-create-form__field">
                                <Label>Срок до</Label>
                                <Input type="date" value={newOpportunity.expiresAt} onChange={e => setNewOpportunity({
                                    ...newOpportunity,
                                    expiresAt: e.target.value
                                })}/>
                            </div>
                        </div>
                        <div className="employer-create-form__grid-3">
                            <Input type="number" value={newOpportunity.salaryFrom}
                                   onChange={e => setNewOpportunity({...newOpportunity, salaryFrom: e.target.value})}
                                   placeholder="Зарплата от"/>
                            <Input type="number" value={newOpportunity.salaryTo}
                                   onChange={e => setNewOpportunity({...newOpportunity, salaryTo: e.target.value})}
                                   placeholder="Зарплата до"/>
                            <Input value={newOpportunity.contactEmail}
                                   onChange={e => setNewOpportunity({...newOpportunity, contactEmail: e.target.value})}
                                   placeholder="Контактный email"/>
                        </div>
                        <div className="employer-create-form__field">
                            <Label>Теги</Label>
                            <div className="employer-opportunities__skills">
                                {techTags.map((tag) => (
                                    <button
                                        key={tag.id}
                                        type="button"
                                        className={`skill-tag ${newOpportunity.tagIds.includes(tag.id) ? 'skill-tag--active' : ''}`}
                                        onClick={() => setNewOpportunity((prev) => ({
                                            ...prev,
                                            tagIds: prev.tagIds.includes(tag.id)
                                                ? prev.tagIds.filter((id) => id !== tag.id)
                                                : [...prev.tagIds, tag.id],
                                        }))}
                                    >
                                        #{tag.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="employer-create-form__actions">
                            <button className="btn-primary" onClick={handleCreateOpportunity} disabled={isLoading}>
                                {isLoading ? 'Создание...' : 'Опубликовать'}
                            </button>
                            <button className="btn-secondary" onClick={() => setActiveTab('opportunities')}>
                                Отменить
                            </button>
                        </div>
                    </div>
                )}

                {activeTab === 'applicants' && (
                    <div className="employer-applicants">
                        <h2>Отклики</h2>
                        {applicants.length === 0 ? (
                            <p className="employer-empty">Пока нет откликов</p>
                        ) : (
                            <div className="employer-applicants__list">
                                {applicants.map(app => (
                                    <div key={app.id} className="employer-applicants__item">
                                        <div className="employer-applicants__info">
                                            <h3>{app.applicantName}</h3>
                                            <p className="employer-applicants__position">На
                                                вакансию: {app.opportunityTitle}</p>
                                            <p className="employer-applicants__message">{app.message}</p>
                                            <div className="employer-applicants__skills">
                                                {app.skills?.split(',').map((s, i) => <span key={i}
                                                                                            className="skill-tag">{s.trim()}</span>)}
                                            </div>
                                        </div>
                                        <div className="employer-applicants__actions">
                                            <span className={`status-badge status-${app.status}`}>
                                                {app.status === 'pending' ? 'На рассмотрении' : app.status === 'approved' ? 'Принят' : app.status === 'rejected' ? 'Отклонён' : 'В резерве'}
                                            </span>
                                            <div className="employer-applicants__buttons">
                                                <button className="btn-approve"
                                                        onClick={() => handleUpdateApplicationStatus(app.id, 'approved')}>Принять
                                                </button>
                                                <button className="btn-reject"
                                                        onClick={() => handleUpdateApplicationStatus(app.id, 'rejected')}>Отклонить
                                                </button>
                                                <button className="btn-reserve"
                                                        onClick={() => handleUpdateApplicationStatus(app.id, 'reserve')}>В
                                                    резерв
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'profile' && (
                    <div className="employer-profile">
                        {!isEditing ? (
                            <div className="employer-profile__view">
                                <div className="employer-profile__view-header">
                                    <h2>Информация о компании</h2>
                                    <button className="profile-card__edit-btn" onClick={() => setIsEditing(true)}>
                                        <img src={editIcon} alt="" className="icon"/>
                                        Редактировать
                                    </button>
                                </div>
                                <div className="employer-profile__grid">
                                    <div className="employer-profile__field">
                                        <Label>Название</Label>
                                        <div className="field-value">{profile.companyName}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>ИНН</Label>
                                        <div className="field-value">{profile.inn}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Юр. название</Label>
                                        <div className="field-value">{profile.legalName || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Сфера</Label>
                                        <div className="field-value">{profile.industry || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Сайт</Label>
                                        <div className="field-value">
                                            {profile.websiteUrl ? <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer">{profile.websiteUrl}</a> : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Город</Label>
                                        <div className="field-value">{profile.cityName || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Размер</Label>
                                        <div className="field-value">{COMPANY_SIZE_OPTIONS.find(s => s.value === profile.companySize)?.label || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Год основания</Label>
                                        <div className="field-value">{profile.foundedYear || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Описание</Label>
                                        <div className="field-value">{profile.description || '—'}</div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Социальные сети</Label>
                                        <div className="field-value">
                                            {profile.socialLinks && profile.socialLinks.length > 0 ? (
                                                <div className="links-list">
                                                    {profile.socialLinks.map((url, idx) => renderLink(url, `Ссылка ${idx + 1}`))}
                                                </div>
                                            ) : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Контакты для связи</Label>
                                        <div className="field-value">
                                            {profile.publicContacts && Object.keys(profile.publicContacts).length > 0 ? (
                                                <div className="links-list">
                                                    {Object.entries(profile.publicContacts).map(([title, url]) => renderLink(url, title))}
                                                </div>
                                            ) : '—'}
                                        </div>
                                    </div>
                                    <div className="employer-profile__field">
                                        <Label>Статус</Label>
                                        <div className={`field-value verification-status status-${profile.verificationStatus.toLowerCase()}`}>
                                            {profile.verificationStatus === 'APPROVED' ? 'Верифицирован' : profile.verificationStatus === 'PENDING' ? 'На проверке' : 'Не верифицирован'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="employer-profile__edit">
                                <div className="employer-profile__edit-header">
                                    <h2>Редактирование компании</h2>
                                </div>

                                <div className="employer-profile__edit-grid">
                                    <div className="employer-profile__edit-field">
                                        <Label>Название компании <span className="required-star">*</span></Label>
                                        <Input value={profile.companyName} onChange={e => handleFieldChange('companyName', e.target.value)} disabled/>
                                        {errors.companyName && <p className="field-error">{errors.companyName}</p>}
                                    </div>
                                    <div className="employer-profile__edit-field">
                                        <Label>ИНН <span className="required-star">*</span></Label>
                                        <Input value={profile.inn} onChange={e => handleFieldChange('inn', e.target.value)} disabled/>
                                        {errors.inn && <p className="field-error">{errors.inn}</p>}
                                    </div>
                                </div>

                                <div className="employer-profile__edit-field">
                                    <Label>Юридическое название</Label>
                                    <Input value={profile.legalName} onChange={e => handleFieldChange('legalName', e.target.value)} placeholder="Полное наименование"/>
                                </div>

                                <div className="employer-profile__edit-grid">
                                    <div className="employer-profile__edit-field">
                                        <Label>Сфера деятельности</Label>
                                        <Input value={profile.industry} onChange={e => handleFieldChange('industry', e.target.value)} placeholder="IT, Образование, Финансы..."/>
                                    </div>
                                    <div className="employer-profile__edit-field">
                                        <Label>Сайт компании</Label>
                                        <Input value={profile.websiteUrl} onChange={e => handleFieldChange('websiteUrl', e.target.value)} placeholder="https://example.com"/>
                                    </div>
                                </div>

                                <div className="employer-profile__edit-grid">
                                    <div className="employer-profile__edit-field" ref={citySearchRef}>
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
                                    <CustomSelect
                                        label="Размер компании"
                                        value={profile.companySize}
                                        onChange={val => handleFieldChange('companySize', val)}
                                        options={COMPANY_SIZE_OPTIONS}
                                        placeholder="Выберите размер"
                                    />
                                </div>

                                <div className="employer-profile__edit-field">
                                    <Label>Год основания</Label>
                                    <Input value={profile.foundedYear || ''} onChange={e => handleFieldChange('foundedYear', e.target.value)} placeholder="2020"/>
                                </div>

                                <div className="employer-profile__edit-field">
                                    <Label>Описание компании</Label>
                                    <Textarea rows={4} value={profile.description} onChange={e => handleFieldChange('description', e.target.value)} placeholder="Расскажите о миссии, ценностях, продуктах и культуре компании"/>
                                </div>

                                {/* Редакторы ссылок */}
                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Социальные сети</h3>
                                    </div>
                                    <div className="info-block__edit">
                                        <LinksEditor
                                            label=""
                                            rows={socialRows}
                                            setRows={setSocialRows}
                                            placeholderTitle="Название (Telegram, LinkedIn, GitHub...)"
                                            placeholderUrl="https://..."
                                        />
                                    </div>
                                </div>

                                <div className="info-block">
                                    <div className="info-block__header">
                                        <h3>Контакты для связи</h3>
                                    </div>
                                    <div className="info-block__edit">
                                        <LinksEditor
                                            label=""
                                            rows={contactRows}
                                            setRows={setContactRows}
                                            placeholderTitle="Название (Email, Phone, WhatsApp...)"
                                            placeholderUrl="https:// или mailto:..."
                                        />
                                    </div>
                                </div>

                                <div className="employer-profile__edit-actions">
                                    <button className="btn-primary" onClick={handleSaveProfile} disabled={isLoading}>
                                        {isLoading ? 'Сохранение...' : 'Сохранить все изменения'}
                                    </button>
                                    <button className="btn-secondary" onClick={() => {
                                        setIsEditing(false)
                                        // Восстанавливаем данные из profile при отмене
                                        setSocialRows(socialLinksToRows(profile.socialLinks || []))
                                        setContactRows(contactsToRows(profile.publicContacts || {}))
                                    }}>
                                        Отменить
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showVerificationModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Верификация компании</h3>
                        <div className="modal__field">
                            <Label>Способ верификации</Label>
                            <CustomSelect value={verificationData.method}
                                          onChange={val => setVerificationData({...verificationData, method: val})}
                                          options={VERIFICATION_METHODS}/>
                        </div>
                        {verificationData.method === 'CORPORATE_EMAIL' && (
                            <div className="modal__field">
                                <Label>Корпоративная почта</Label>
                                <Input value={verificationData.corporateEmail} onChange={e => setVerificationData({
                                    ...verificationData,
                                    corporateEmail: e.target.value
                                })} placeholder="name@company.com"/>
                            </div>
                        )}
                        {verificationData.method === 'TIN' && (
                            <div className="modal__field">
                                <Label>ИНН</Label>
                                <Input value={verificationData.inn}
                                       onChange={e => setVerificationData({...verificationData, inn: e.target.value})}
                                       placeholder="123456789012"/>
                            </div>
                        )}
                        <div className="modal__field">
                            <Label>Комментарий</Label>
                            <Textarea rows={3} value={verificationData.submittedComment}
                                      onChange={e => setVerificationData({
                                          ...verificationData,
                                          submittedComment: e.target.value
                                      })} placeholder="Дополнительная информация"/>
                        </div>
                        <div className="modal__actions">
                            <button className="btn-primary" onClick={handleSubmitVerification}>Отправить</button>
                            <button className="btn-secondary" onClick={() => setShowVerificationModal(false)}>Отмена
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardLayout>
    )
}

export default EmployerDashboard