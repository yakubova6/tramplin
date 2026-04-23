import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '@/shared/hooks/use-toast'
import { RUSSIAN_UNIVERSITIES } from '@/shared/lib/constants/universities'
import { INDUSTRIES } from '@/shared/lib/constants/industries'
import { FACULTIES } from '@/shared/lib/constants/faculties'
import { STUDY_PROGRAMS } from '@/shared/lib/constants/studyPrograms'
import {
    getApplicantProfile,
    getEmployerProfile,
    getCurrentSessionUser,
    updateApplicantProfile,
    updateEmployerCompanyData,
    updateEmployerProfile,
} from '@/shared/api/profile'
import {
    createEmployerLocation,
    getEmployerLocations,
    searchGeoCities,
    suggestGeoAddress,
} from '@/shared/api/geo'
import {
    clearSessionUser,
    getSessionUser,
    setSessionUser,
    subscribeSessionChange,
} from '@/shared/lib/utils/sessionStore'
import { createEmployerVerification } from '@/shared/api/profile'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/shared/ui/Card'
import Button from '@/shared/ui/Button'
import Input from '@/shared/ui/Input'
import Label from '@/shared/ui/Label'
import Textarea from '@/shared/ui/Textarea'
import Autocomplete from '@/shared/ui/Autocomplete'
import LinksEditor from '@/shared/ui/LinksEditor'
import CustomSelect from '@/shared/ui/CustomSelect'
import CustomCheckbox from '@/shared/ui/CustomCheckbox'
import { smartFilter } from '@/shared/lib/utils/searchHelpers'
import { toShort, cleanLinksToArray, createLinkRow } from '@/shared/lib/utils/formHelpers'
import './ProfileEdit.scss'

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'AUTHENTICATED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
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
        hint: 'Лучше указывать основную почту',
    },
    {
        id: 'phone',
        label: 'Телефон',
        shortLabel: 'Tel',
        placeholder: '+7 999 123-45-67',
        hint: 'Удобнее, если номер начинается с кода страны',
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
        hint: 'Подходит для делового контакта',
    },
    {
        id: 'github',
        label: 'GitHub',
        shortLabel: 'GH',
        placeholder: 'https://github.com/username',
        hint: 'Удобно для технического профиля',
    },
    {
        id: 'website',
        label: 'Сайт',
        shortLabel: 'Web',
        placeholder: 'https://your-site.com',
        hint: 'Личный сайт, портфолио или публичная страница',
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

function mapLinksToRows(items = [], valueKey = 'url') {
    if (!Array.isArray(items) || items.length === 0) {
        return [createLinkRow()]
    }

    return items.map((item, index) =>
        createLinkRow(
            item?.label || item?.title || `Ссылка ${index + 1}`,
            item?.[valueKey] || item?.url || item?.value || ''
        )
    )
}

function createContactLinkRow(presetId = 'website', value = '') {
    const preset = CONTACT_PRESET_BY_ID[presetId] || CONTACT_PRESET_BY_ID.website

    return {
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
        title: preset.label,
        url: value,
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

function splitApplicantContactRowsByType(items = []) {
    const rows = mapLinksToRows(items, 'value')
    const social = []
    const contacts = []

    rows.forEach((row) => {
        const preset = detectContactPreset(row)
        if (['telegram', 'linkedin', 'github', 'website'].includes(preset.id)) {
            social.push(row)
            return
        }
        contacts.push(row)
    })

    return {
        socialRows: social,
        contactRows: contacts,
    }
}

function buildEmployerLocationLabel(location) {
    const title = String(location?.title || '').trim()
    const address = String(location?.addressLine || '').trim()
    const cityName = String(location?.city?.name || '').trim()

    if (title && address) {
        return `${title} — ${address}`
    }

    if (address && cityName) {
        return `${address} (${cityName})`
    }

    return address || title || cityName || `Локация #${location?.id}`
}

function normalizeText(value) {
    return String(value || '').trim().toLowerCase()
}

function findMatchingLocation(locations, addressData) {
    const normalizedFiasId = normalizeText(addressData?.fiasId)
    const normalizedUnrestrictedValue = normalizeText(addressData?.unrestrictedValue)
    const normalizedAddressLine = normalizeText(addressData?.addressLine)
    const normalizedCityId = String(addressData?.cityId || '')

    return locations.find((location) => {
        const sameFiasId =
            normalizedFiasId &&
            normalizeText(location?.fiasId) &&
            normalizeText(location?.fiasId) === normalizedFiasId

        const sameUnrestrictedValue =
            normalizedUnrestrictedValue &&
            normalizeText(location?.unrestrictedValue) &&
            normalizeText(location?.unrestrictedValue) === normalizedUnrestrictedValue

        const sameAddress =
            normalizedAddressLine &&
            normalizeText(location?.addressLine) === normalizedAddressLine &&
            String(location?.cityId || '') === normalizedCityId

        return sameFiasId || sameUnrestrictedValue || sameAddress
    })
}

function createEmptyEmployerLocationForm() {
    return {
        title: 'Главный офис',
        cityId: '',
        cityName: '',
        addressLine: '',
        addressLine2: '',
        postalCode: '',
        latitude: '',
        longitude: '',
        fiasId: '',
        unrestrictedValue: '',
        qcGeo: '',
    }
}

function ProfileEdit() {
    const [, navigate] = useLocation()
    const { toast } = useToast()

    const [user, setUser] = useState(getSessionUser())
    const [isLoading, setIsLoading] = useState(true)
    const [isProfileLoading, setIsProfileLoading] = useState(false)
    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    const [isUniversityOpen, setIsUniversityOpen] = useState(false)
    const [isIndustryOpen, setIsIndustryOpen] = useState(false)
    const [isApplicantCityOpen, setIsApplicantCityOpen] = useState(false)
    const [isFacultyOpen, setIsFacultyOpen] = useState(false)
    const [isStudyProgramOpen, setIsStudyProgramOpen] = useState(false)

    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
    const [isLocationCityOpen, setIsLocationCityOpen] = useState(false)
    const [isLocationAddressOpen, setIsLocationAddressOpen] = useState(false)
    const [isLocationSaving, setIsLocationSaving] = useState(false)

    const [universityActiveIndex, setUniversityActiveIndex] = useState(-1)
    const [industryActiveIndex, setIndustryActiveIndex] = useState(-1)
    const [applicantCityActiveIndex, setApplicantCityActiveIndex] = useState(-1)
    const [facultyActiveIndex, setFacultyActiveIndex] = useState(-1)
    const [studyProgramActiveIndex, setStudyProgramActiveIndex] = useState(-1)

    const [locationCityActiveIndex, setLocationCityActiveIndex] = useState(-1)
    const [locationAddressActiveIndex, setLocationAddressActiveIndex] = useState(-1)

    const universityRef = useRef(null)
    const industryRef = useRef(null)
    const applicantCityRef = useRef(null)
    const facultyRef = useRef(null)
    const studyProgramRef = useRef(null)

    const locationCityRef = useRef(null)
    const locationAddressRef = useRef(null)

    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [middleName, setMiddleName] = useState('')
    const [universityName, setUniversityName] = useState('')
    const [universityQuery, setUniversityQuery] = useState('')
    const [facultyName, setFacultyName] = useState('')
    const [facultyQuery, setFacultyQuery] = useState('')
    const [studyProgram, setStudyProgram] = useState('')
    const [studyProgramQuery, setStudyProgramQuery] = useState('')
    const [course, setCourse] = useState('')
    const [graduationYear, setGraduationYear] = useState('')
    const [cityId, setCityId] = useState('')
    const [cityQuery, setCityQuery] = useState('')
    const [about, setAbout] = useState('')
    const [resumeText, setResumeText] = useState('')
    const [portfolioRows, setPortfolioRows] = useState([createLinkRow()])
    const [contactRows, setContactRows] = useState([createLinkRow()])
    const [profileVisibility, setProfileVisibility] = useState('PUBLIC')
    const [resumeVisibility, setResumeVisibility] = useState('AUTHENTICATED')
    const [applicationsVisibility, setApplicationsVisibility] = useState('PRIVATE')
    const [contactsVisibility, setContactsVisibility] = useState('AUTHENTICATED')
    const [openToWork, setOpenToWork] = useState(true)
    const [openToEvents, setOpenToEvents] = useState(true)

    const [companyName, setCompanyName] = useState('')
    const [legalName, setLegalName] = useState('')
    const [inn, setInn] = useState('')
    const [description, setDescription] = useState('')
    const [industry, setIndustry] = useState('')
    const [industryQuery, setIndustryQuery] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [selectedLocationId, setSelectedLocationId] = useState('')
    const [companySize, setCompanySize] = useState('')
    const [foundedYear, setFoundedYear] = useState('')
    const [socialRows, setSocialRows] = useState([createLinkRow()])
    const [publicContactRows, setPublicContactRows] = useState([createLinkRow()])

    const [locationForm, setLocationForm] = useState(createEmptyEmployerLocationForm())
    const [locationErrors, setLocationErrors] = useState({})
    const [locationCityOptions, setLocationCityOptions] = useState([])
    const [locationAddressOptions, setLocationAddressOptions] = useState([])

    const [applicantCityOptions, setApplicantCityOptions] = useState([])
    const [employerLocations, setEmployerLocations] = useState([])

    useEffect(() => {
        const unsubscribe = subscribeSessionChange((nextUser) => {
            setUser(nextUser)
            if (!nextUser) {
                setIsLoading(false)
            }
        })

        const loadUser = async () => {
            setIsLoading(true)

            try {
                const localUser = getSessionUser()
                if (localUser) {
                    setUser(localUser)
                    return
                }

                const apiUser = await getCurrentSessionUser()
                if (apiUser) {
                    setSessionUser(apiUser)
                    setUser(apiUser)
                    return
                }

                setUser(null)
            } catch (error) {
                console.error('Error loading user:', error)
                clearSessionUser()
                setUser(null)
            } finally {
                setIsLoading(false)
            }
        }

        loadUser()

        return unsubscribe
    }, [])

    const role = user?.role
    const isEmployer = role === 'EMPLOYER'

    useEffect(() => {
        if (!user?.id && !user?.userId) return

        let isCancelled = false

        const loadProfileData = async () => {
            setIsProfileLoading(true)

            try {
                if (isEmployer) {
                    const [profile, locations] = await Promise.all([
                        getEmployerProfile(),
                        getEmployerLocations().catch(() => []),
                    ])

                    if (isCancelled) return

                    const safeLocations = Array.isArray(locations) ? locations : []
                    setEmployerLocations(safeLocations)

                    if (profile) {
                        setCompanyName(profile.companyName || user?.displayName || '')
                        setLegalName(profile.legalName || '')
                        setInn(profile.inn || '')
                        setDescription(profile.description || '')
                        setIndustry(profile.industry || '')
                        setIndustryQuery(profile.industry || '')
                        setWebsiteUrl(profile.websiteUrl || '')
                        setSelectedLocationId(profile.locationId ? String(profile.locationId) : '')
                        setCompanySize(profile.companySize || '')
                        setFoundedYear(profile.foundedYear ? String(profile.foundedYear) : '')
                        setSocialRows(mapLinksToRows(profile.socialLinks, 'url'))
                        setPublicContactRows(mapLinksToRows(profile.publicContacts, 'value'))
                    } else {
                        setCompanyName(user?.displayName || '')
                    }
                } else {
                    const profile = await getApplicantProfile()

                    if (isCancelled) return

                    if (profile) {
                        setFirstName(profile.firstName || '')
                        setLastName(profile.lastName || '')
                        setMiddleName(profile.middleName || '')
                        setUniversityName(profile.universityName || '')
                        setUniversityQuery(profile.universityName || '')
                        setFacultyName(profile.facultyName || '')
                        setFacultyQuery(profile.facultyName || '')
                        setStudyProgram(profile.studyProgram || '')
                        setStudyProgramQuery(profile.studyProgram || '')
                        setCourse(profile.course ? String(profile.course) : '')
                        setGraduationYear(profile.graduationYear ? String(profile.graduationYear) : '')
                        setCityId(profile.cityId ? String(profile.cityId) : '')
                        setCityQuery(profile.cityName || '')
                        setAbout(profile.about || '')
                        setResumeText(profile.resumeText || '')
                        setPortfolioRows(mapLinksToRows(profile.portfolioLinks, 'url'))
                        const { socialRows: applicantSocialRows, contactRows: applicantContactRows } =
                            splitApplicantContactRowsByType(profile.contactLinks)
                        setSocialRows(applicantSocialRows)
                        setContactRows(applicantContactRows)
                        setProfileVisibility(profile.profileVisibility || 'PUBLIC')
                        setResumeVisibility(profile.resumeVisibility || 'AUTHENTICATED')
                        setApplicationsVisibility(profile.applicationsVisibility || 'PRIVATE')
                        setContactsVisibility(profile.contactsVisibility || 'AUTHENTICATED')
                        setOpenToWork(profile.openToWork ?? true)
                        setOpenToEvents(profile.openToEvents ?? true)
                    }
                }
            } catch (error) {
                console.error('[ProfileEdit] load profile error:', error)
            } finally {
                if (!isCancelled) {
                    setIsProfileLoading(false)
                }
            }
        }

        loadProfileData()

        return () => {
            isCancelled = true
        }
    }, [isEmployer, user?.id, user?.userId])

    useEffect(() => {
        if (user && isEmployer && !companyName) {
            setCompanyName(user.displayName || '')
        }
    }, [user, isEmployer, companyName])

    const universitySuggestions = useMemo(
        () => smartFilter(RUSSIAN_UNIVERSITIES, universityQuery),
        [universityQuery]
    )

    const industrySuggestions = useMemo(
        () => smartFilter(INDUSTRIES, industryQuery),
        [industryQuery]
    )

    const facultySuggestions = useMemo(
        () => smartFilter(FACULTIES, facultyQuery),
        [facultyQuery]
    )

    const studyProgramSuggestions = useMemo(
        () => smartFilter(STUDY_PROGRAMS, studyProgramQuery),
        [studyProgramQuery]
    )

    const applicantCitySuggestionLabels = useMemo(
        () => applicantCityOptions.map((city) => city.name),
        [applicantCityOptions]
    )

    const locationCitySuggestionLabels = useMemo(
        () => locationCityOptions.map((city) => city.name),
        [locationCityOptions]
    )

    const locationAddressSuggestionLabels = useMemo(
        () =>
            locationAddressOptions.map(
                (item) => item.value || item.unrestrictedValue || item.addressLine || ''
            ),
        [locationAddressOptions]
    )

    const employerLocationOptions = useMemo(() => {
        return employerLocations.map((location) => ({
            value: String(location.id),
            label: buildEmployerLocationLabel(location),
        }))
    }, [employerLocations])

    const selectedEmployerLocation = useMemo(
        () =>
            employerLocations.find(
                (location) => String(location.id) === String(selectedLocationId)
            ) || null,
        [employerLocations, selectedLocationId]
    )

    const updateContactRowsState = (setRows, id, patch) => {
        setRows((prev) => prev.map((row) => (row.id === id ? { ...row, ...patch } : row)))
    }

    const removeContactRowsState = (setRows, id) => {
        setRows((prev) => prev.filter((row) => row.id !== id))
    }

    const addContactRowsState = (setRows, presetId = 'website') => {
        setRows((prev) => [...prev, createContactLinkRow(presetId)])
    }

    const renderContactEditor = (
        label,
        rows,
        setRows,
        presets = CONTACT_LINK_PRESETS,
        editorClassName = '',
        presetGroups = null,
    ) => (
        <div className={`profile-contact-editor ${editorClassName}`.trim()}>
            <Label>{label}</Label>

            {Array.isArray(presetGroups) && presetGroups.length > 0 ? (
                <div className="profile-contact-editor__preset-groups">
                    {presetGroups.map((group) => (
                        <div key={group.id} className="profile-contact-editor__preset-group">
                            <p className="profile-contact-editor__preset-label">{group.label}</p>
                            <div className="profile-contact-editor__presets">
                                {group.presets.map((preset) => (
                                    <button
                                        key={preset.id}
                                        type="button"
                                        className="profile-contact-editor__preset"
                                        onClick={() => addContactRowsState(setRows, preset.id)}
                                    >
                                        <span className="profile-contact-editor__preset-badge">{preset.shortLabel}</span>
                                        <span>{preset.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="profile-contact-editor__presets">
                    {presets.map((preset) => (
                        <button
                            key={preset.id}
                            type="button"
                            className="profile-contact-editor__preset"
                            onClick={() => addContactRowsState(setRows, preset.id)}
                        >
                            <span className="profile-contact-editor__preset-badge">{preset.shortLabel}</span>
                            <span>{preset.label}</span>
                        </button>
                    ))}
                </div>
            )}

            <div className="profile-contact-editor__list">
                {rows.length === 0 && (
                    <div className="profile-contact-editor__empty">
                        Выберите тип контакта выше, чтобы добавить удобный способ связи
                    </div>
                )}

                {rows.map((row) => {
                    const preset = detectContactPreset(row)

                    return (
                        <div key={row.id} className="profile-contact-editor__card">
                            <div className="profile-contact-editor__card-header">
                                <div className="profile-contact-editor__card-title">
                                    <span className="profile-contact-editor__card-badge">{preset.shortLabel}</span>
                                    <div>
                                        <strong>{row.title || preset.label}</strong>
                                        <span>{preset.hint}</span>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="profile-contact-editor__remove"
                                    onClick={() => removeContactRowsState(setRows, row.id)}
                                    aria-label="Удалить контакт"
                                >
                                    ×
                                </button>
                            </div>

                            <Input
                                placeholder={preset.placeholder}
                                value={row.url}
                                onChange={(e) =>
                                    updateContactRowsState(setRows, row.id, {
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
    )

    useEffect(() => {
        const normalizedQuery = cityQuery.trim()

        if (normalizedQuery.length < 2) {
            setApplicantCityOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const cities = await searchGeoCities(normalizedQuery, 10)
                if (!isCancelled) {
                    setApplicantCityOptions(Array.isArray(cities) ? cities : [])
                }
            } catch {
                if (!isCancelled) {
                    setApplicantCityOptions([])
                }
            }
        }, 250)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [cityQuery])

    useEffect(() => {
        const normalizedQuery = locationForm.cityName.trim()

        if (!isLocationModalOpen || normalizedQuery.length < 2) {
            setLocationCityOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const cities = await searchGeoCities(normalizedQuery, 10)
                if (!isCancelled) {
                    setLocationCityOptions(Array.isArray(cities) ? cities : [])
                }
            } catch {
                if (!isCancelled) {
                    setLocationCityOptions([])
                }
            }
        }, 250)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [isLocationModalOpen, locationForm.cityName])

    useEffect(() => {
        const normalizedQuery = locationForm.addressLine.trim()

        if (!isLocationModalOpen || !locationForm.cityId || normalizedQuery.length < 3) {
            setLocationAddressOptions([])
            return
        }

        let isCancelled = false

        const timer = setTimeout(async () => {
            try {
                const suggestions = await suggestGeoAddress({
                    query: normalizedQuery,
                    cityId: Number(locationForm.cityId),
                })

                if (!isCancelled) {
                    setLocationAddressOptions(Array.isArray(suggestions) ? suggestions : [])
                }
            } catch {
                if (!isCancelled) {
                    setLocationAddressOptions([])
                }
            }
        }, 300)

        return () => {
            isCancelled = true
            clearTimeout(timer)
        }
    }, [isLocationModalOpen, locationForm.cityId, locationForm.addressLine])

    useEffect(() => {
        const handleOutsideClick = (event) => {
            if (universityRef.current && !universityRef.current.contains(event.target)) {
                setIsUniversityOpen(false)
                setUniversityActiveIndex(-1)
            }

            if (industryRef.current && !industryRef.current.contains(event.target)) {
                setIsIndustryOpen(false)
                setIndustryActiveIndex(-1)
            }

            if (applicantCityRef.current && !applicantCityRef.current.contains(event.target)) {
                setIsApplicantCityOpen(false)
                setApplicantCityActiveIndex(-1)
            }

            if (facultyRef.current && !facultyRef.current.contains(event.target)) {
                setIsFacultyOpen(false)
                setFacultyActiveIndex(-1)
            }

            if (studyProgramRef.current && !studyProgramRef.current.contains(event.target)) {
                setIsStudyProgramOpen(false)
                setStudyProgramActiveIndex(-1)
            }

            if (locationCityRef.current && !locationCityRef.current.contains(event.target)) {
                setIsLocationCityOpen(false)
                setLocationCityActiveIndex(-1)
            }

            if (locationAddressRef.current && !locationAddressRef.current.contains(event.target)) {
                setIsLocationAddressOpen(false)
                setLocationAddressActiveIndex(-1)
            }
        }

        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsUniversityOpen(false)
                setIsIndustryOpen(false)
                setIsApplicantCityOpen(false)
                setIsFacultyOpen(false)
                setIsStudyProgramOpen(false)
                setIsLocationCityOpen(false)
                setIsLocationAddressOpen(false)

                setUniversityActiveIndex(-1)
                setIndustryActiveIndex(-1)
                setApplicantCityActiveIndex(-1)
                setFacultyActiveIndex(-1)
                setStudyProgramActiveIndex(-1)
                setLocationCityActiveIndex(-1)
                setLocationAddressActiveIndex(-1)
                setIsLocationModalOpen(false)
            }
        }

        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEsc)

        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [])

    useEffect(() => {
        document.documentElement.classList.toggle('is-lock', isLocationModalOpen)
        return () => document.documentElement.classList.remove('is-lock')
    }, [isLocationModalOpen])

    if (isLoading || isProfileLoading) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Загрузка...</CardTitle>
                        <CardDescription>Пожалуйста, подождите</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Пользователь не найден</CardTitle>
                        <CardDescription>Сначала войдите в систему.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={() => navigate('/login')}>
                            Перейти ко входу
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    if (!role) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Ошибка данных</CardTitle>
                        <CardDescription>
                            В данных пользователя отсутствует роль. Попробуйте выйти и зайти снова.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button
                            onClick={() => {
                                clearSessionUser()
                                navigate('/login')
                            }}
                        >
                            Выйти и войти заново
                        </Button>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const validateApplicant = () => {
        const next = {}

        if (!firstName.trim()) next.firstName = 'Укажите имя'
        if (!lastName.trim()) next.lastName = 'Укажите фамилию'
        if (!universityName.trim()) next.universityName = 'Укажите вуз'

        if (!course.trim() || toShort(course) < 1 || toShort(course) > 6) {
            next.course = 'Курс от 1 до 6'
        }

        if (!graduationYear.trim() || toShort(graduationYear) < 1990 || toShort(graduationYear) > 2100) {
            next.graduationYear = 'Год выпуска 1990–2100'
        }

        if (!cityId) {
            next.cityId = 'Укажите город'
        }

        return next
    }

    const validateEmployer = () => {
        const next = {}

        if (!companyName.trim()) {
            next.companyName = 'Укажите название компании'
        }

        if (!legalName.trim()) {
            next.legalName = 'Укажите юридическое название'
        }

        if (!inn.trim() || !/^\d{10}(\d{2})?$/.test(inn.trim())) {
            next.inn = 'ИНН 10 или 12 цифр'
        }

        if (!industry.trim()) {
            next.industry = 'Укажите индустрию'
        }

        if (!selectedLocationId) {
            next.locationId = 'Добавьте и выберите основную локацию компании'
        }

        if (websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())) {
            next.websiteUrl = 'Ссылка должна начинаться с http:// или https://'
        }

        return next
    }

    const validateLocationForm = () => {
        const next = {}

        if (!locationForm.title.trim()) {
            next.title = 'Укажите название локации'
        }

        if (!locationForm.cityId) {
            next.cityId = 'Город работодателя обязателен'
        }

        if (!locationForm.addressLine.trim()) {
            next.addressLine = 'Укажите адрес'
        }

        return next
    }

    const handleSelectApplicantCity = (selectedLabel) => {
        const found = applicantCityOptions.find((city) => city.name === selectedLabel)
        if (!found) return

        setCityId(String(found.id))
        setCityQuery(found.name)
    }

    const handleSelectEmployerLocation = (locationIdValue) => {
        setSelectedLocationId(locationIdValue)
    }

    const openCreateLocationModal = () => {
        setLocationForm(createEmptyEmployerLocationForm())
        setLocationErrors({})
        setLocationAddressOptions([])
        setLocationCityOptions([])
        setIsLocationModalOpen(true)
    }

    const handleSelectLocationCity = (selectedLabel) => {
        const found = locationCityOptions.find((city) => city.name === selectedLabel)
        if (!found) return

        setLocationForm((prev) => ({
            ...prev,
            cityId: String(found.id),
            cityName: found.name,
        }))
    }

    const handleSelectLocationAddress = (selectedLabel) => {
        const found = locationAddressOptions.find(
            (item) =>
                (item.value || item.unrestrictedValue || item.addressLine || '') === selectedLabel
        )

        if (!found) return

        setLocationForm((prev) => ({
            ...prev,
            cityId: found.cityId ? String(found.cityId) : prev.cityId,
            cityName: found.cityName || prev.cityName,
            addressLine: found.addressLine || found.value || '',
            postalCode: found.postalCode || '',
            latitude: found.latitude ?? '',
            longitude: found.longitude ?? '',
            fiasId: found.fiasId || '',
            unrestrictedValue: found.unrestrictedValue || found.value || '',
            qcGeo: found.qcGeo ?? '',
        }))
    }

    const handleSaveLocation = async () => {
        const validation = validateLocationForm()
        setLocationErrors(validation)

        if (Object.keys(validation).length > 0) {
            toast({
                title: 'Проверьте форму',
                description: Object.values(validation)[0] || 'Заполните обязательные поля локации',
                variant: 'destructive',
            })
            return
        }

        setIsLocationSaving(true)

        try {
            const payload = {
                title: locationForm.title.trim(),
                cityId: Number(locationForm.cityId),
                addressLine: locationForm.addressLine.trim(),
                addressLine2: locationForm.addressLine2.trim() || null,
                postalCode: locationForm.postalCode || null,
                latitude:
                    locationForm.latitude !== '' && locationForm.latitude !== null
                        ? Number(locationForm.latitude)
                        : null,
                longitude:
                    locationForm.longitude !== '' && locationForm.longitude !== null
                        ? Number(locationForm.longitude)
                        : null,
                fiasId: locationForm.fiasId || null,
                unrestrictedValue:
                    locationForm.unrestrictedValue || locationForm.addressLine.trim(),
                qcGeo:
                    locationForm.qcGeo !== '' && locationForm.qcGeo !== null
                        ? Number(locationForm.qcGeo)
                        : null,
            }

            const createdLocation = await createEmployerLocation(payload)
            const refreshedLocations = await getEmployerLocations().catch(() => [])
            const safeLocations = Array.isArray(refreshedLocations) ? refreshedLocations : []

            setEmployerLocations(safeLocations)

            if (createdLocation?.id) {
                setSelectedLocationId(String(createdLocation.id))
            }

            setIsLocationModalOpen(false)

            toast({
                title: 'Локация создана',
                description: 'Главный офис добавлен и выбран в профиле',
            })
        } catch (error) {
            if (error?.code === 'employer_location_duplicate') {
                const refreshedLocations = await getEmployerLocations().catch(() => [])
                const safeLocations = Array.isArray(refreshedLocations) ? refreshedLocations : []
                setEmployerLocations(safeLocations)

                const matchedLocation = findMatchingLocation(safeLocations, {
                    cityId: locationForm.cityId,
                    addressLine: locationForm.addressLine,
                    unrestrictedValue: locationForm.unrestrictedValue || locationForm.addressLine,
                    fiasId: locationForm.fiasId,
                })

                if (matchedLocation?.id) {
                    setSelectedLocationId(String(matchedLocation.id))
                    setIsLocationModalOpen(false)

                    toast({
                        title: 'Локация уже существует',
                        description: 'Существующая локация выбрана как основная',
                    })
                    return
                }
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось создать локацию',
                variant: 'destructive',
            })
        } finally {
            setIsLocationSaving(false)
        }
    }

    const handleSubmit = async (event) => {
        event.preventDefault()

        const validation = isEmployer ? validateEmployer() : validateApplicant()
        setErrors(validation)

        if (Object.keys(validation).length > 0) {
            toast({
                title: 'Проверьте форму',
                description: 'Есть ошибки в обязательных полях',
                variant: 'destructive',
            })
            return
        }

        setIsSubmitting(true)

        try {
            if (isEmployer) {
                // Сохраняем профиль работодателя
                await updateEmployerProfile({
                    companyName: companyName.trim(),
                    description: description.trim() || null,
                    industry: industry.trim() || null,
                    websiteUrl: websiteUrl.trim() || null,
                    cityId: selectedEmployerLocation?.cityId
                        ? Number(selectedEmployerLocation.cityId)
                        : null,
                    locationId: selectedLocationId ? Number(selectedLocationId) : null,
                    companySize: companySize || null,
                    foundedYear: foundedYear ? toShort(foundedYear) : null,
                    socialLinks: socialRows
                        .filter((row) => row.url?.trim())
                        .map((row, index) => ({
                            label: row.title?.trim() || `Ссылка ${index + 1}`,
                            url: row.url.trim(),
                        })),
                    publicContacts: publicContactRows
                        .filter((row) => row.url?.trim())
                        .map((row, index) => ({
                            type: 'OTHER',
                            label: row.title?.trim() || `Контакт ${index + 1}`,
                            value: row.url.trim(),
                        })),
                })

                await updateEmployerCompanyData({
                    legalName: legalName.trim(),
                    inn: inn.trim(),
                })

                // Отправляем на верификацию
                try {
                    await createEmployerVerification({
                        verificationMethod: 'TIN',
                        inn: inn.trim(),
                        submittedComment: 'Автоматически создано при регистрации компании',
                    })
                    toast({
                        title: 'Профиль сохранён',
                        description: 'Заявка на верификацию отправлена. Вы будете перенаправлены в личный кабинет.',
                    })
                } catch (verifError) {
                    const code = String(verifError?.code || '').toLowerCase()
                    if (code === 'employer_verification_already_exists' || code === 'verification_already_exists') {
                        toast({
                            title: 'Профиль сохранён',
                            description: 'Заявка на верификацию уже существует.',
                        })
                    } else {
                        toast({
                            title: 'Профиль сохранён',
                            description: 'Не удалось отправить заявку на верификацию. Вы сможете отправить её позже в кабинете.',
                            variant: 'destructive',
                        })
                    }
                }

                navigate('/employer')
            } else {
                const applicantProfileData = {
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    middleName: middleName.trim() || null,
                    universityName: universityName.trim() || null,
                    facultyName: facultyName.trim() || null,
                    studyProgram: studyProgram.trim() || null,
                    course: course ? toShort(course) : null,
                    graduationYear: graduationYear ? toShort(graduationYear) : null,
                    cityId: cityId ? Number(cityId) : null,
                    about: about.trim() || null,
                    resumeText: resumeText.trim() || null,
                    portfolioLinks: cleanLinksToArray(portfolioRows),
                    contactLinks: cleanLinksToArray([...socialRows, ...contactRows]),
                    profileVisibility,
                    resumeVisibility,
                    applicationsVisibility,
                    contactsVisibility,
                    openToWork,
                    openToEvents,
                }

                await updateApplicantProfile(applicantProfileData)

                toast({
                    title: 'Профиль сохранён',
                    description: 'Ваши данные успешно обновлены',
                })

                navigate('/seeker')
            }
        } catch (error) {
            console.error('[ProfileEdit] Ошибка сохранения:', error)

            if ([401, 403].includes(error?.status)) {
                clearSessionUser()
                toast({
                    title: 'Сессия недоступна',
                    description: 'Пожалуйста, войдите снова',
                    variant: 'destructive',
                })
                navigate('/login')
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <div className="profile-edit">
            <Card className="profile-edit__card">
                <CardHeader>
                    <CardTitle>
                        {isEmployer ? 'Профиль компании' : 'Личная информация'}
                    </CardTitle>
                    <CardDescription>
                        {isEmployer
                            ? 'Заполните данные компании и выберите основную локацию. Если офиса ещё нет, создайте его прямо здесь.'
                            : 'Расскажите о себе — это поможет работодателям найти вас'}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <form className="profile-edit-form" onSubmit={handleSubmit}>
                        {isEmployer ? (
                            <>
                                <div className="profile-edit-form__grid-2">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Название компании
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="companyName"
                                            value={companyName}
                                            onChange={(e) => setCompanyName(e.target.value)}
                                            placeholder="Например: Яндекс, Сбер, Ozon"
                                        />
                                        {errors.companyName && <p className="field-error">{errors.companyName}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            ИНН
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="inn"
                                            value={inn}
                                            onChange={(e) => setInn(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
                                            placeholder="10 или 12 цифр"
                                        />
                                        {errors.inn && <p className="field-error">{errors.inn}</p>}
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>
                                        Юридическое название
                                        <span className="required-star"> *</span>
                                    </Label>
                                    <Input
                                        id="legalName"
                                        value={legalName}
                                        onChange={(e) => setLegalName(e.target.value)}
                                        placeholder="Полное наименование организации"
                                    />
                                    {errors.legalName && <p className="field-error">{errors.legalName}</p>}
                                </div>

                                <div className="profile-edit-form__field" ref={industryRef}>
                                    <Autocomplete
                                        label="Индустрия"
                                        required={true}
                                        value={industryQuery}
                                        onChange={(val) => {
                                            setIndustryQuery(val)
                                            setIndustry(val)
                                        }}
                                        suggestions={industrySuggestions}
                                        isOpen={isIndustryOpen}
                                        onOpenChange={setIsIndustryOpen}
                                        activeIndex={industryActiveIndex}
                                        onActiveIndexChange={setIndustryActiveIndex}
                                        inputRef={industryRef}
                                        placeholder="IT, Образование, Финансы, Ритейл..."
                                        error={errors.industry}
                                        onSelect={(selected) => {
                                            const value = typeof selected === 'string' ? selected : selected?.name || ''
                                            setIndustry(value)
                                            setIndustryQuery(value)
                                        }}
                                    />
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>
                                        Основная локация компании
                                        <span className="required-star"> *</span>
                                    </Label>

                                    {employerLocations.length > 0 ? (
                                        <CustomSelect
                                            value={selectedLocationId}
                                            onChange={handleSelectEmployerLocation}
                                            options={[
                                                { value: '', label: 'Выберите локацию' },
                                                ...employerLocationOptions,
                                            ]}
                                            placeholder="Выберите локацию"
                                        />
                                    ) : (
                                        <div className="field-hint">
                                            У компании пока нет созданных локаций.
                                        </div>
                                    )}

                                    {errors.locationId && <p className="field-error">{errors.locationId}</p>}

                                    <div className="profile-edit-form__actions-inline">
                                        <Button
                                            type="button"
                                            className="button--outline profile-edit__add-location-btn"
                                            onClick={openCreateLocationModal}
                                        >
                                            {employerLocations.length > 0
                                                ? 'Добавить локацию'
                                                : 'Добавить главный офис'}
                                        </Button>
                                    </div>

                                    {selectedEmployerLocation && (
                                        <div className="field-hint">
                                            Выбрано: {buildEmployerLocationLabel(selectedEmployerLocation)}
                                            {selectedEmployerLocation.addressLine2
                                                ? `, ${selectedEmployerLocation.addressLine2}`
                                                : ''}
                                        </div>
                                    )}
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>Сайт компании</Label>
                                    <Input
                                        id="websiteUrl"
                                        value={websiteUrl}
                                        onChange={(e) => setWebsiteUrl(e.target.value)}
                                        placeholder="https://company.ru"
                                    />
                                    {errors.websiteUrl && <p className="field-error">{errors.websiteUrl}</p>}
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="profile-edit-form__grid-2">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Имя
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="firstName"
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            placeholder="Иван"
                                        />
                                        {errors.firstName && <p className="field-error">{errors.firstName}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Фамилия
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="lastName"
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            placeholder="Петров"
                                        />
                                        {errors.lastName && <p className="field-error">{errors.lastName}</p>}
                                    </div>
                                </div>

                                <div className="profile-edit-form__field" ref={universityRef}>
                                    <Autocomplete
                                        label="Вуз"
                                        required={true}
                                        value={universityQuery}
                                        onChange={(val) => {
                                            setUniversityQuery(val)
                                            setUniversityName(val)
                                        }}
                                        suggestions={universitySuggestions}
                                        isOpen={isUniversityOpen}
                                        onOpenChange={setIsUniversityOpen}
                                        activeIndex={universityActiveIndex}
                                        onActiveIndexChange={setUniversityActiveIndex}
                                        inputRef={universityRef}
                                        placeholder="Начните вводить название вуза"
                                        error={errors.universityName}
                                        onSelect={(selected) => {
                                            const value = typeof selected === 'string' ? selected : selected?.name || ''
                                            setUniversityName(value)
                                            setUniversityQuery(value)
                                        }}
                                    />
                                </div>

                                <div className="profile-edit-form__grid-3">
                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Курс
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="course"
                                            value={course}
                                            onChange={(e) => setCourse(e.target.value)}
                                            placeholder="1–6"
                                        />
                                        {errors.course && <p className="field-error">{errors.course}</p>}
                                    </div>

                                    <div className="profile-edit-form__field">
                                        <Label>
                                            Год выпуска
                                            <span className="required-star"> *</span>
                                        </Label>
                                        <Input
                                            id="graduationYear"
                                            value={graduationYear}
                                            onChange={(e) => setGraduationYear(e.target.value)}
                                            placeholder="2028"
                                        />
                                        {errors.graduationYear && <p className="field-error">{errors.graduationYear}</p>}
                                    </div>

                                    <div className="profile-edit-form__field" ref={applicantCityRef}>
                                        <Autocomplete
                                            label="Город"
                                            required={true}
                                            value={cityQuery}
                                            onChange={(val) => {
                                                setCityQuery(val)
                                                setCityId('')
                                            }}
                                            suggestions={applicantCitySuggestionLabels}
                                            isOpen={isApplicantCityOpen}
                                            onOpenChange={setIsApplicantCityOpen}
                                            activeIndex={applicantCityActiveIndex}
                                            onActiveIndexChange={setApplicantCityActiveIndex}
                                            inputRef={applicantCityRef}
                                            placeholder="Начните вводить город"
                                            error={errors.cityId}
                                            onSelect={(selected) => {
                                                const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                handleSelectApplicantCity(value)
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>О себе</Label>
                                    <Textarea
                                        id="about"
                                        rows={3}
                                        value={about}
                                        onChange={(e) => setAbout(e.target.value)}
                                        placeholder="Расскажите о своих навыках, увлечениях, достижениях и карьерных целях"
                                    />
                                </div>
                            </>
                        )}

                        <button
                            type="button"
                            className={`advanced-toggle ${showAdvanced ? 'is-active' : ''}`}
                            onClick={() => setShowAdvanced((value) => !value)}
                        >
                            {showAdvanced ? 'Скрыть дополнительные поля' : 'Показать дополнительные поля'}
                        </button>

                        {showAdvanced && (
                            <div className="advanced-block">
                                {isEmployer ? (
                                    <>
                                        <CustomSelect
                                            label="Размер компании"
                                            value={companySize}
                                            onChange={setCompanySize}
                                            options={COMPANY_SIZE_OPTIONS}
                                            placeholder="Выберите масштаб бизнеса"
                                        />

                                        <div className="profile-edit-form__field">
                                            <Label>Год основания</Label>
                                            <Input
                                                id="foundedYear"
                                                value={foundedYear}
                                                onChange={(e) =>
                                                    setFoundedYear(
                                                        e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                                                    )
                                                }
                                                placeholder="2020"
                                            />
                                        </div>

                                        <div className="profile-edit-form__field">
                                            <Label>Описание компании</Label>
                                            <Textarea
                                                id="description"
                                                rows={4}
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                                placeholder="Расскажите о миссии, ценностях, продуктах и культуре компании"
                                            />
                                        </div>

                                        {renderContactEditor(
                                            'Социальные сети',
                                            socialRows,
                                            setSocialRows,
                                            SOCIAL_LINK_PRESETS,
                                        )}

                                        {renderContactEditor(
                                            'Контакты для связи',
                                            publicContactRows,
                                            setPublicContactRows,
                                            CONTACT_METHOD_PRESETS,
                                        )}
                                    </>
                                ) : (
                                    <>
                                        <div className="profile-edit-form__grid-3">
                                            <div className="profile-edit-form__field">
                                                <Label>Отчество</Label>
                                                <Input
                                                    id="middleName"
                                                    value={middleName}
                                                    onChange={(e) => setMiddleName(e.target.value)}
                                                    placeholder="Иванович"
                                                />
                                            </div>

                                            <div className="profile-edit-form__field" ref={facultyRef}>
                                                <Autocomplete
                                                    label="Факультет"
                                                    required={false}
                                                    value={facultyQuery}
                                                    onChange={(val) => {
                                                        setFacultyQuery(val)
                                                        setFacultyName(val)
                                                    }}
                                                    suggestions={facultySuggestions}
                                                    isOpen={isFacultyOpen}
                                                    onOpenChange={setIsFacultyOpen}
                                                    activeIndex={facultyActiveIndex}
                                                    onActiveIndexChange={setFacultyActiveIndex}
                                                    inputRef={facultyRef}
                                                    placeholder="Начните вводить факультет"
                                                    error={null}
                                                    onSelect={(selected) => {
                                                        const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                        setFacultyName(value)
                                                        setFacultyQuery(value)
                                                    }}
                                                />
                                            </div>

                                            <div className="profile-edit-form__field" ref={studyProgramRef}>
                                                <Autocomplete
                                                    label="Образовательная программа"
                                                    required={false}
                                                    value={studyProgramQuery}
                                                    onChange={(val) => {
                                                        setStudyProgramQuery(val)
                                                        setStudyProgram(val)
                                                    }}
                                                    suggestions={studyProgramSuggestions}
                                                    isOpen={isStudyProgramOpen}
                                                    onOpenChange={setIsStudyProgramOpen}
                                                    activeIndex={studyProgramActiveIndex}
                                                    onActiveIndexChange={setStudyProgramActiveIndex}
                                                    inputRef={studyProgramRef}
                                                    placeholder="Начните вводить программу"
                                                    error={null}
                                                    onSelect={(selected) => {
                                                        const value = typeof selected === 'string' ? selected : selected?.name || ''
                                                        setStudyProgram(value)
                                                        setStudyProgramQuery(value)
                                                    }}
                                                />
                                            </div>
                                        </div>

                                        <div className="profile-edit-form__field">
                                            <Label>Резюме</Label>
                                            <Textarea
                                                id="resumeText"
                                                rows={5}
                                                value={resumeText}
                                                onChange={(e) => setResumeText(e.target.value)}
                                                placeholder="Опишите опыт работы, ключевые проекты, технологии и навыки"
                                            />
                                        </div>

                                        <LinksEditor label="Портфолио" rows={portfolioRows} setRows={setPortfolioRows} />
                                        {renderContactEditor(
                                            'Социальные сети',
                                            socialRows,
                                            setSocialRows,
                                            SOCIAL_LINK_PRESETS,
                                        )}

                                        {renderContactEditor(
                                            'Контакты для связи',
                                            contactRows,
                                            setContactRows,
                                            CONTACT_METHOD_PRESETS,
                                        )}

                                        <div className="profile-edit-form__grid-2">
                                            <CustomSelect
                                                label="Видимость профиля"
                                                value={profileVisibility}
                                                onChange={setProfileVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость резюме"
                                                value={resumeVisibility}
                                                onChange={setResumeVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость откликов"
                                                value={applicationsVisibility}
                                                onChange={setApplicationsVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                            <CustomSelect
                                                label="Видимость контактов"
                                                value={contactsVisibility}
                                                onChange={setContactsVisibility}
                                                options={VISIBILITY_OPTIONS}
                                            />
                                        </div>

                                        <div className="profile-edit-form__checkboxes">
                                            <CustomCheckbox
                                                checked={openToWork}
                                                onChange={setOpenToWork}
                                                label="Открыт к работе"
                                            />
                                            <CustomCheckbox
                                                checked={openToEvents}
                                                onChange={setOpenToEvents}
                                                label="Открыт к мероприятиям"
                                            />
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? 'Сохранение...'
                                : isEmployer
                                    ? 'Сохранить и перейти в кабинет'
                                    : 'Сохранить профиль'}
                        </Button>
                    </form>
                </CardContent>
            </Card>

            {isLocationModalOpen && (
                <div className="modal-overlay" onClick={() => setIsLocationModalOpen(false)}>
                    <div className="modal" onClick={(e) => e.stopPropagation()}>
                        <h3>Добавить локацию компании</h3>

                        <div className="modal__field modal__field--location-title">
                            <Label>Название локации <span className="required-star">*</span></Label>
                            <Input
                                value={locationForm.title}
                                onChange={(e) =>
                                    setLocationForm((prev) => ({
                                        ...prev,
                                        title: e.target.value,
                                    }))
                                }
                                placeholder="Например: Главный офис"
                            />
                            {locationErrors.title && <p className="field-error">{locationErrors.title}</p>}
                        </div>

                        <div className="modal__field modal__field--city" ref={locationCityRef}>
                            <Autocomplete
                                label="Город работодателя"
                                required={true}
                                value={locationForm.cityName}
                                onChange={(val) =>
                                    setLocationForm((prev) => ({
                                        ...prev,
                                        cityId: '',
                                        cityName: val,
                                    }))
                                }
                                suggestions={locationCitySuggestionLabels}
                                isOpen={isLocationCityOpen}
                                onOpenChange={setIsLocationCityOpen}
                                activeIndex={locationCityActiveIndex}
                                onActiveIndexChange={setLocationCityActiveIndex}
                                inputRef={locationCityRef}
                                placeholder="Начните вводить город"
                                error={locationErrors.cityId}
                                onSelect={(selected) => {
                                    const value = typeof selected === 'string' ? selected : selected?.name || ''
                                    handleSelectLocationCity(value)
                                }}
                            />
                        </div>

                        <div className="modal__field modal__field--address" ref={locationAddressRef}>
                            <Autocomplete
                                label="Адрес"
                                required={true}
                                value={locationForm.addressLine}
                                onChange={(val) =>
                                    setLocationForm((prev) => ({
                                        ...prev,
                                        addressLine: val,
                                        unrestrictedValue: '',
                                        postalCode: '',
                                        latitude: '',
                                        longitude: '',
                                        fiasId: '',
                                        qcGeo: '',
                                    }))
                                }
                                suggestions={locationAddressSuggestionLabels}
                                isOpen={isLocationAddressOpen}
                                onOpenChange={setIsLocationAddressOpen}
                                activeIndex={locationAddressActiveIndex}
                                onActiveIndexChange={setLocationAddressActiveIndex}
                                inputRef={locationAddressRef}
                                placeholder="Например: Москва, ул. Тверская, д. 1"
                                error={locationErrors.addressLine}
                                onSelect={(selected) => {
                                    const value = typeof selected === 'string' ? selected : selected?.value || ''
                                    handleSelectLocationAddress(value)
                                }}
                            />
                        </div>

                        <div className="modal__field modal__field--address-extra">
                            <Label>Дополнительный адрес</Label>
                            <Input
                                value={locationForm.addressLine2}
                                onChange={(e) =>
                                    setLocationForm((prev) => ({
                                        ...prev,
                                        addressLine2: e.target.value,
                                    }))
                                }
                                placeholder="Этаж, офис, корпус"
                            />
                        </div>

                        <div className="modal__actions">
                            <Button
                                type="button"
                                className="button--primary"
                                onClick={handleSaveLocation}
                                disabled={isLocationSaving}
                            >
                                {isLocationSaving ? 'Сохранение...' : 'Сохранить локацию'}
                            </Button>

                            <Button
                                type="button"
                                className="button--ghost"
                                onClick={() => setIsLocationModalOpen(false)}
                                disabled={isLocationSaving}
                            >
                                Отменить
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ProfileEdit
