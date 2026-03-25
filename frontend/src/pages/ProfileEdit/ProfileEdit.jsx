import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'wouter'
import { useToast } from '../../hooks/use-toast'
import { RUSSIAN_UNIVERSITIES } from '../../constants/universities'
import { INDUSTRIES } from '../../constants/industries'
import { CITIES } from '../../constants/cities'
import { FACULTIES } from '../../constants/faculties'
import { STUDY_PROGRAMS } from '../../constants/studyPrograms'
import {
    getCurrentUser,
    saveProfile,
    setCurrentUser,
    submitVerificationRequest,
} from '../../utils/mockModeration'
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '../../components/Card'
import Button from '../../components/Button'
import Input from '../../components/Input'
import Label from '../../components/Label'
import Textarea from '../../components/Textarea'
import Autocomplete from '../../components/Autocomplete'
import CustomSelect from '../../components/CustomSelect'
import { smartFilter } from '../../utils/searchHelpers'
import { toShort, cleanLinks, createLinkRow } from '../../utils/formHelpers'
import './ProfileEdit.scss'

const VISIBILITY_OPTIONS = [
    { value: 'PUBLIC', label: 'Публично' },
    { value: 'REGISTERED', label: 'Только зарегистрированным' },
    { value: 'PRIVATE', label: 'Только мне' },
]

const COMPANY_SIZE_OPTIONS = [
    { value: 'STARTUP', label: 'Стартап (1–10)' },
    { value: 'SMALL', label: 'Малый бизнес (11–50)' },
    { value: 'MEDIUM', label: 'Средний (51–200)' },
    { value: 'LARGE', label: 'Крупный (201–1000)' },
    { value: 'ENTERPRISE', label: 'Корпорация (1000+)' },
]

// Компонент для редактирования ссылок
function LinksEditor({ label, rows, setRows }) {
    const updateRow = (id, patch) => {
        setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))
    }

    const removeRow = (id) => {
        setRows((prev) => prev.filter((r) => r.id !== id))
    }

    const addRow = () => setRows((prev) => [...prev, createLinkRow()])

    return (
        <div className="profile-edit-form__field">
            <Label>{label}</Label>
            <div className="links-editor">
                {rows.map((row) => (
                    <div key={row.id} className="links-editor__row">
                        <Input
                            placeholder="Название (GitHub, Telegram...)"
                            value={row.title}
                            onChange={(e) => updateRow(row.id, { title: e.target.value })}
                        />
                        <Input
                            placeholder="https://..."
                            value={row.url}
                            onChange={(e) => updateRow(row.id, { url: e.target.value })}
                        />
                        <button
                            type="button"
                            className="links-editor__remove"
                            onClick={() => removeRow(row.id)}
                            aria-label="Удалить ссылку"
                        >
                            ×
                        </button>
                    </div>
                ))}
                <button type="button" className="links-editor__add" onClick={addRow}>
                    + Добавить ссылку
                </button>
            </div>
        </div>
    )
}

// Компонент чекбокса
function CustomCheckbox({ checked, onChange, label }) {
    return (
        <button
            type="button"
            className={`custom-checkbox ${checked ? 'is-checked' : ''}`}
            onClick={() => onChange(!checked)}
            aria-pressed={checked}
        >
            <span className="custom-checkbox__box">{checked ? '✓' : ''}</span>
            <span className="custom-checkbox__label">{label}</span>
        </button>
    )
}

function ProfileEdit() {
    const [, setLocation] = useLocation()
    const { toast } = useToast()

    const user = useMemo(() => getCurrentUser(), [])
    const role = user?.role
    const isEmployer = role === 'EMPLOYER'

    const [errors, setErrors] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showAdvanced, setShowAdvanced] = useState(false)

    // ===== AUTOCOMPLETE STATE =====
    const [isUniversityOpen, setIsUniversityOpen] = useState(false)
    const [isIndustryOpen, setIsIndustryOpen] = useState(false)
    const [isCityOpen, setIsCityOpen] = useState(false)
    const [isFacultyOpen, setIsFacultyOpen] = useState(false)
    const [isStudyProgramOpen, setIsStudyProgramOpen] = useState(false)

    const [universityActiveIndex, setUniversityActiveIndex] = useState(-1)
    const [industryActiveIndex, setIndustryActiveIndex] = useState(-1)
    const [cityActiveIndex, setCityActiveIndex] = useState(-1)
    const [facultyActiveIndex, setFacultyActiveIndex] = useState(-1)
    const [studyProgramActiveIndex, setStudyProgramActiveIndex] = useState(-1)

    const universityRef = useRef(null)
    const industryRef = useRef(null)
    const cityRef = useRef(null)
    const facultyRef = useRef(null)
    const studyProgramRef = useRef(null)

    // ===== APPLICANT =====
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
    const [resumeVisibility, setResumeVisibility] = useState('REGISTERED')
    const [applicationsVisibility, setApplicationsVisibility] = useState('PRIVATE')
    const [contactsVisibility, setContactsVisibility] = useState('REGISTERED')
    const [openToWork, setOpenToWork] = useState(true)
    const [openToEvents, setOpenToEvents] = useState(true)

    // ===== EMPLOYER =====
    const [companyName, setCompanyName] = useState(user?.displayName || '')
    const [legalName, setLegalName] = useState('')
    const [inn, setInn] = useState('')
    const [description, setDescription] = useState('')
    const [industry, setIndustry] = useState('')
    const [industryQuery, setIndustryQuery] = useState('')
    const [websiteUrl, setWebsiteUrl] = useState('')
    const [cityIdEmployer, setCityIdEmployer] = useState('')
    const [cityQueryEmployer, setCityQueryEmployer] = useState('')
    const [addressLine, setAddressLine] = useState('')
    const [companySize, setCompanySize] = useState('')
    const [foundedYear, setFoundedYear] = useState('')
    const [socialRows, setSocialRows] = useState([createLinkRow()])
    const [publicContactRows, setPublicContactRows] = useState([createLinkRow()])

    // Подсказки
    const universitySuggestions = useMemo(
        () => smartFilter(RUSSIAN_UNIVERSITIES, universityQuery),
        [universityQuery]
    )
    const industrySuggestions = useMemo(
        () => smartFilter(INDUSTRIES, industryQuery),
        [industryQuery]
    )
    const citySuggestions = useMemo(
        () => smartFilter(CITIES, cityQuery),
        [cityQuery]
    )
    const citySuggestionsEmployer = useMemo(
        () => smartFilter(CITIES, cityQueryEmployer),
        [cityQueryEmployer]
    )
    const facultySuggestions = useMemo(
        () => smartFilter(FACULTIES, facultyQuery),
        [facultyQuery]
    )
    const studyProgramSuggestions = useMemo(
        () => smartFilter(STUDY_PROGRAMS, studyProgramQuery),
        [studyProgramQuery]
    )

    // Закрытие выпадающих списков при клике вне
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
            if (cityRef.current && !cityRef.current.contains(event.target)) {
                setIsCityOpen(false)
                setCityActiveIndex(-1)
            }
            if (facultyRef.current && !facultyRef.current.contains(event.target)) {
                setIsFacultyOpen(false)
                setFacultyActiveIndex(-1)
            }
            if (studyProgramRef.current && !studyProgramRef.current.contains(event.target)) {
                setIsStudyProgramOpen(false)
                setStudyProgramActiveIndex(-1)
            }
        }
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setIsUniversityOpen(false)
                setIsIndustryOpen(false)
                setIsCityOpen(false)
                setIsFacultyOpen(false)
                setIsStudyProgramOpen(false)
                setUniversityActiveIndex(-1)
                setIndustryActiveIndex(-1)
                setCityActiveIndex(-1)
                setFacultyActiveIndex(-1)
                setStudyProgramActiveIndex(-1)
            }
        }
        document.addEventListener('mousedown', handleOutsideClick)
        document.addEventListener('keydown', handleEsc)
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick)
            document.removeEventListener('keydown', handleEsc)
        }
    }, [])

    if (!user || !role) {
        return (
            <div className="profile-edit">
                <Card className="profile-edit__card">
                    <CardHeader>
                        <CardTitle>Пользователь не найден</CardTitle>
                        <CardDescription>Сначала зарегистрируйтесь.</CardDescription>
                    </CardHeader>
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
        if (!cityId) next.cityId = 'Укажите город'
        return next
    }

    const validateEmployer = () => {
        const next = {}
        if (!companyName.trim()) next.companyName = 'Укажите название компании'
        if (!inn.trim() || !/^\d{10}(\d{2})?$/.test(inn.trim())) {
            next.inn = 'ИНН 10 или 12 цифр'
        }
        if (!industry.trim()) next.industry = 'Укажите индустрию'
        if (!cityIdEmployer) next.cityIdEmployer = 'Укажите город'
        if (websiteUrl.trim() && !/^https?:\/\//i.test(websiteUrl.trim())) {
            next.websiteUrl = 'Ссылка должна начинаться с http:// или https://'
        }
        return next
    }

    const handleSubmit = (event) => {
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

        const applicantProfile = {
            user,
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            middleName: middleName.trim(),
            universityName: universityName.trim(),
            facultyName: facultyName.trim(),
            studyProgram: studyProgram.trim(),
            course: toShort(course),
            graduationYear: toShort(graduationYear),
            cityId: Number(cityId),
            about: about.trim(),
            resumeText: resumeText.trim(),
            portfolioLinks: cleanLinks(portfolioRows),
            contactLinks: cleanLinks(contactRows),
            profileVisibility,
            resumeVisibility,
            applicationsVisibility,
            contactsVisibility,
            openToWork,
            openToEvents,
        }

        const employerProfile = {
            user,
            companyName: companyName.trim(),
            legalName: legalName.trim(),
            inn: inn.trim(),
            description: description.trim(),
            industry: industry.trim(),
            websiteUrl: websiteUrl.trim(),
            cityId: Number(cityIdEmployer),
            addressLine: addressLine.trim(),
            companySize,
            foundedYear: foundedYear ? toShort(foundedYear) : null,
            socialLinks: cleanLinks(socialRows),
            publicContacts: cleanLinks(publicContactRows),
            verificationStatus: 'PENDING',
        }

        const payload = isEmployer
            ? { role: 'EMPLOYER', email: user.email, displayName: user.displayName, profile: employerProfile }
            : { role: 'APPLICANT', email: user.email, displayName: user.displayName, profile: applicantProfile }

        saveProfile(payload)

        if (isEmployer) {
            submitVerificationRequest({
                role,
                type: 'company_verification',
                userEmail: user.email,
                userDisplayName: user.displayName,
                payload,
            })
            setCurrentUser({ ...user, profileStatus: 'PENDING_VERIFICATION' })
            toast({
                title: 'Заявка отправлена',
                description: 'Профиль компании отправлен на проверку. Обычно это занимает до 2 рабочих дней.',
            })
        } else {
            setCurrentUser({ ...user, profileStatus: 'COMPLETED' })
            toast({
                title: 'Профиль сохранён',
                description: 'Ваши данные успешно обновлены',
            })
        }

        setIsSubmitting(false)
        setLocation(isEmployer ? '/employer' : '/seeker')
    }

    return (
        <div className="profile-edit">
            <Card className="profile-edit__card">
                <CardHeader>
                    <CardTitle>
                        {isEmployer ? 'Карточка компании' : 'Личная информация'}
                    </CardTitle>
                    <CardDescription>
                        {isEmployer
                            ? 'Заполните информацию о компании. После проверки профиль станет доступен соискателям.'
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
                                            onChange={(e) => setInn(e.target.value)}
                                            placeholder="10 или 12 цифр"
                                        />
                                        {errors.inn && <p className="field-error">{errors.inn}</p>}
                                    </div>
                                </div>

                                <div className="profile-edit-form__grid-2">
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
                                                const val = typeof selected === 'string' ? selected : selected.name
                                                setIndustry(val)
                                                setIndustryQuery(val)
                                            }}
                                        />
                                    </div>

                                    <div className="profile-edit-form__field" ref={cityRef}>
                                        <Autocomplete
                                            label="Город"
                                            required={true}
                                            value={cityQueryEmployer}
                                            onChange={(val) => {
                                                setCityQueryEmployer(val)
                                                const found = CITIES.find(c => c.name === val)
                                                if (found) {
                                                    setCityIdEmployer(String(found.id))
                                                } else {
                                                    setCityIdEmployer('')
                                                }
                                            }}
                                            suggestions={citySuggestionsEmployer}
                                            isOpen={isCityOpen}
                                            onOpenChange={setIsCityOpen}
                                            activeIndex={cityActiveIndex}
                                            onActiveIndexChange={setCityActiveIndex}
                                            inputRef={cityRef}
                                            placeholder="Начните вводить город"
                                            error={errors.cityIdEmployer}
                                            onSelect={(selected) => {
                                                const val = typeof selected === 'string' ? selected : selected.name
                                                const found = CITIES.find(c => c.name === val)
                                                if (found) {
                                                    setCityIdEmployer(String(found.id))
                                                    setCityQueryEmployer(found.name)
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="profile-edit-form__field">
                                    <Label>Адрес компании</Label>
                                    <Input
                                        id="addressLine"
                                        value={addressLine}
                                        onChange={(e) => setAddressLine(e.target.value)}
                                        placeholder="г. Москва, ул. Тверская, д. 1"
                                    />
                                    <div className="field-hint">Формат: город, улица, дом</div>
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
                                            const val = typeof selected === 'string' ? selected : selected.name
                                            setUniversityName(val)
                                            setUniversityQuery(val)
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

                                    <div className="profile-edit-form__field" ref={cityRef}>
                                        <Autocomplete
                                            label="Город"
                                            required={true}
                                            value={cityQuery}
                                            onChange={(val) => {
                                                setCityQuery(val)
                                                const found = CITIES.find(c => c.name === val)
                                                if (found) {
                                                    setCityId(String(found.id))
                                                } else {
                                                    setCityId('')
                                                }
                                            }}
                                            suggestions={citySuggestions}
                                            isOpen={isCityOpen}
                                            onOpenChange={setIsCityOpen}
                                            activeIndex={cityActiveIndex}
                                            onActiveIndexChange={setCityActiveIndex}
                                            inputRef={cityRef}
                                            placeholder="Начните вводить город"
                                            error={errors.cityId}
                                            onSelect={(selected) => {
                                                const val = typeof selected === 'string' ? selected : selected.name
                                                const found = CITIES.find(c => c.name === val)
                                                if (found) {
                                                    setCityId(String(found.id))
                                                    setCityQuery(found.name)
                                                }
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
                            className="advanced-toggle"
                            onClick={() => setShowAdvanced((v) => !v)}
                        >
                            {showAdvanced ? 'Скрыть дополнительные поля' : 'Показать дополнительные поля'}
                        </button>

                        {showAdvanced && (
                            <div className="advanced-block">
                                {isEmployer ? (
                                    <>
                                        <div className="profile-edit-form__field">
                                            <Label>Юридическое название</Label>
                                            <Input
                                                id="legalName"
                                                value={legalName}
                                                onChange={(e) => setLegalName(e.target.value)}
                                                placeholder="Полное наименование организации"
                                            />
                                        </div>

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
                                                onChange={(e) => setFoundedYear(e.target.value)}
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

                                        <LinksEditor label="Социальные сети" rows={socialRows} setRows={setSocialRows} />
                                        <LinksEditor label="Контакты для связи" rows={publicContactRows} setRows={setPublicContactRows} />
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
                                                        const val = typeof selected === 'string' ? selected : selected.name
                                                        setFacultyName(val)
                                                        setFacultyQuery(val)
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
                                                        const val = typeof selected === 'string' ? selected : selected.name
                                                        setStudyProgram(val)
                                                        setStudyProgramQuery(val)
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
                                        <LinksEditor label="Контакты" rows={contactRows} setRows={setContactRows} />

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
                                    ? 'Сохранить и отправить на проверку'
                                    : 'Сохранить профиль'}
                        </Button>
                    </form>
                </CardContent>
            </Card>
        </div>
    )
}

export default ProfileEdit