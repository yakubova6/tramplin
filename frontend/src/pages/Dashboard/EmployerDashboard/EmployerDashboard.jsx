import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useToast } from '@/hooks/use-toast'
import DashboardLayout from '@/pages/Dashboard/DashboardLayout'

import {
    getCurrentSessionUser,
    getEmployerProfileWorkspace,
    updateEmployerProfile,
    updateEmployerCompanyData,
    submitEmployerProfileForModeration,
    uploadEmployerLogo,
    deleteEmployerFile,
    getEmployerOpportunities,
    getEmployerOpportunityById,
    createOpportunity,
    updateOpportunity,
    updateOpportunityStatus,
    getEmployerApplications,
    updateApplicationStatus,
    getEmployerLocations,
    createEmployerLocation,
    updateEmployerLocation,
    deleteEmployerLocation,
    searchGeoCities,
    suggestGeoAddress,
    createEmployerVerification,
} from '@/api/profile'

import {
    getEntityModerationHistory,
    getModerationTaskDetail,
} from '@/api/moderation'

import { listTags } from '@/api/opportunities'

import '@/pages/Dashboard/DashboardBase.scss'
import './EmployerDashboard.scss'

import EmployerVerificationModal from './EmployerVerificationModal'
import EmployerLocationModal from './EmployerLocationModal'
import EmployerProfileSection from './EmployerProfileSection'
import EmployerOpportunityForm from './EmployerOpportunityForm'
import EmployerOpportunitiesSection from './EmployerOpportunitiesSection'
import EmployerApplicantsSection from './EmployerApplicantsSection'
import ApplicantPreviewModal from './ApplicantPreviewModal'
import EmployerTagsPage from './EmployerTagsPage';

import {
    createLinkRow,
    createEmptyLocationForm,
    detectEmployerContactType,
    extractModerationFeedback,
    getEmployerModerationStatusMeta,
    normalizeEmployerProfileState,
    normalizeLocationState,
    statusBucket,
} from './employerDashboard.helpers'

// ========== ХЕЛПЕРЫ ДЛЯ СРАВНЕНИЯ ==========
const areProfilePayloadsEqual = (a = {}, b = {}) => {
    return JSON.stringify({
        companyName: a.companyName || '',
        description: a.description || '',
        industry: a.industry || '',
        websiteUrl: a.websiteUrl || '',
        socialLinks: a.socialLinks || [],
        publicContacts: a.publicContacts || [],
        companySize: a.companySize || '',
        foundedYear: a.foundedYear || null,
        cityId: a.cityId || null,
        locationId: a.locationId || null,
    }) === JSON.stringify({
        companyName: b.companyName || '',
        description: b.description || '',
        industry: b.industry || '',
        websiteUrl: b.websiteUrl || '',
        socialLinks: b.socialLinks || [],
        publicContacts: b.publicContacts || [],
        companySize: b.companySize || '',
        foundedYear: b.foundedYear || null,
        cityId: b.cityId || null,
        locationId: b.locationId || null,
    })
}

const areCompanyPayloadsEqual = (a = {}, b = {}) => {
    return (
        String(a.legalName || '').trim() === String(b.legalName || '').trim() &&
        String(a.inn || '').trim() === String(b.inn || '').trim()
    )
}

function EmployerDashboard() {
    const { toast } = useToast()

    const [activeTab, setActiveTab] = useState('opportunities')
    const [user, setUser] = useState(null)
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [isEditingCompanyData, setIsEditingCompanyData] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [errors, setErrors] = useState({})
    const [expandedOpportunityId, setExpandedOpportunityId] = useState(null)
    const [isLogoUploading, setIsLogoUploading] = useState(false)
    const [moderationFeedback, setModerationFeedback] = useState(null)
    const [isModerationFeedbackLoading, setIsModerationFeedbackLoading] = useState(false)

    const [opportunitySearchTerm, setOpportunitySearchTerm] = useState('')
    const [opportunityFilterStatus, setOpportunityFilterStatus] = useState('all')

    const [responseFilters, setResponseFilters] = useState({
        search: '',
        status: '',
        sortDirection: 'DESC',
    })

    const [selectedApplicant, setSelectedApplicant] = useState(null)
    const [isApplicantModalOpen, setIsApplicantModalOpen] = useState(false)

    const [socialRows, setSocialRows] = useState([createLinkRow()])
    const [contactRows, setContactRows] = useState([createLinkRow()])
    const [resourceRows, setResourceRows] = useState([createLinkRow()])

    const [verificationLinkRows, setVerificationLinkRows] = useState([createLinkRow()])
    const [showVerificationModal, setShowVerificationModal] = useState(false)
    const [verificationData, setVerificationData] = useState({
        verificationMethod: 'TIN',
        corporateEmail: '',
        inn: '',
        submittedComment: '',
    })

    const [profile, setProfile] = useState({
        userId: null,
        companyName: '',
        legalName: '',
        inn: '',
        description: '',
        industry: '',
        websiteUrl: '',
        cityId: null,
        cityName: '',
        locationId: null,
        locationPreview: null,
        companySize: '',
        foundedYear: '',
        socialLinks: [],
        publicContacts: [],
        verificationStatus: '',
        moderationStatus: 'DRAFT',
        logo: null,
    })

    const [publicProfile, setPublicProfile] = useState(null)
    const [hasApprovedPublicVersion, setHasApprovedPublicVersion] = useState(false)

    const [initialProfileSnapshot, setInitialProfileSnapshot] = useState(null)
    const [initialCompanySnapshot, setInitialCompanySnapshot] = useState(null)

    const [opportunityForm, setOpportunityForm] = useState({
        title: '',
        shortDescription: '',
        fullDescription: '',
        type: 'VACANCY',
        workFormat: 'REMOTE',
        cityId: null,
        cityName: '',
        locationId: null,
        expiresAt: '',
        eventDate: '',
        requirements: '',
        grade: 'JUNIOR',
        employmentType: 'FULL_TIME',
        salaryFrom: '',
        salaryTo: '',
        salaryCurrency: 'RUB',
        tagIds: [],
        contactEmail: '',
        contactPhone: '',
        contactTelegram: '',
        contactPerson: '',
        resourceLinks: [],
    })

    const [opportunityMode, setOpportunityMode] = useState('create')
    const [editingOpportunityId, setEditingOpportunityId] = useState(null)

    const [opportunities, setOpportunities] = useState([])
    const [responsesPage, setResponsesPage] = useState({ items: [], total: 0, limit: 50, offset: 0 })
    const [techTags, setTechTags] = useState([])

    const [employerLocations, setEmployerLocations] = useState([])
    const [isLocationModalOpen, setIsLocationModalOpen] = useState(false)
    const [locationMode, setLocationMode] = useState('create')
    const [editingLocationId, setEditingLocationId] = useState(null)
    const [locationForm, setLocationForm] = useState(createEmptyLocationForm())
    const [locationErrors, setLocationErrors] = useState({})
    const [locationCitySearchQuery, setLocationCitySearchQuery] = useState('')
    const [locationCitySuggestions, setLocationCitySuggestions] = useState([])
    const [isLocationCitySearchOpen, setIsLocationCitySearchOpen] = useState(false)
    const [addressSearchQuery, setAddressSearchQuery] = useState('')
    const [addressSuggestions, setAddressSuggestions] = useState([])
    const [isAddressSearchOpen, setIsAddressSearchOpen] = useState(false)
    const [isLocationSaving, setIsLocationSaving] = useState(false)

    const locationCitySearchRef = useRef(null)
    const addressSearchRef = useRef(null)
    const logoInputRef = useRef(null)

    const verificationState = profile.verificationStatus || 'NOT_STARTED'
    const moderationState = profile.moderationStatus || 'DRAFT'
    const isVerified = verificationState === 'APPROVED'
    const isVerificationRejected = verificationState === 'REJECTED'
    const moderationMeta = getEmployerModerationStatusMeta(moderationState)

    const selectedEmployerLocation = useMemo(
        () => employerLocations.find((item) => Number(item.id) === Number(profile.locationId)) || null,
        [employerLocations, profile.locationId]
    )

    const isProfileAlreadyOnModeration = useCallback((status) => {
        return ['PENDING_MODERATION', 'IN_PROGRESS', 'UNDER_REVIEW', 'ON_MODERATION'].includes(
            String(status || '').toUpperCase()
        )
    }, [])

    const linksToRows = (items = []) =>
        items.length > 0
            ? items.map((item) => createLinkRow(item.label || '', item.url || item.value || ''))
            : [createLinkRow()]

    const rowsToLinks = (rows = []) =>
        rows
            .filter((row) => row.url?.trim())
            .map((row, index) => ({
                label: row.title?.trim() || `Ссылка ${index + 1}`,
                url: row.url.trim(),
            }))

    const normalizeEmployerWorkspaceResponse = useCallback((workspaceData = {}, fallbackUser = null) => {
        const current = normalizeEmployerProfileState(workspaceData.currentProfile || {}, fallbackUser)
        const publicVersion = workspaceData.publicProfile
            ? normalizeEmployerProfileState(workspaceData.publicProfile, fallbackUser)
            : null

        return {
            current,
            publicProfile: publicVersion,
            moderationStatus: workspaceData.moderationStatus || current.moderationStatus || 'DRAFT',
            hasApprovedPublicVersion: Boolean(workspaceData.hasApprovedPublicVersion),
        }
    }, [])

    const syncWorkspaceProfileState = useCallback((workspaceData, fallbackUser = user) => {
        const normalizedWorkspace = normalizeEmployerWorkspaceResponse(workspaceData, fallbackUser)
        const normalized = normalizedWorkspace.current

        const nextProfile = {
            ...normalized,
            moderationStatus: normalizedWorkspace.moderationStatus || normalized.moderationStatus || 'DRAFT',
        }

        setProfile(nextProfile)
        setPublicProfile(normalizedWorkspace.publicProfile)
        setHasApprovedPublicVersion(normalizedWorkspace.hasApprovedPublicVersion)

        setInitialProfileSnapshot({
            companyName: nextProfile.companyName || '',
            description: nextProfile.description || '',
            industry: nextProfile.industry || '',
            websiteUrl: nextProfile.websiteUrl || '',
            socialLinks: nextProfile.socialLinks || [],
            publicContacts: nextProfile.publicContacts || [],
            companySize: nextProfile.companySize || '',
            foundedYear: nextProfile.foundedYear || null,
            cityId: nextProfile.cityId || null,
            locationId: nextProfile.locationId || null,
        })

        setInitialCompanySnapshot({
            legalName: nextProfile.legalName || '',
            inn: nextProfile.inn || '',
        })

        setVerificationData((prev) => ({
            ...prev,
            inn: nextProfile.inn || '',
        }))

        setSocialRows(linksToRows(nextProfile.socialLinks))
        setContactRows(
            nextProfile.publicContacts.length > 0
                ? nextProfile.publicContacts.map((item) =>
                    createLinkRow(item.label || item.type || 'Контакт', item.value || '')
                )
                : [createLinkRow()]
        )

        return normalizedWorkspace
    }, [normalizeEmployerWorkspaceResponse, user])

    const loadEmployerLocationsData = useCallback(async () => {
        try {
            const items = await getEmployerLocations()
            const normalizedItems = Array.isArray(items) ? items : []
            setEmployerLocations(normalizedItems)
            return normalizedItems
        } catch {
            setEmployerLocations([])
            return []
        }
    }, [])

    const loadModerationFeedback = useCallback(async (entityId) => {
        if (!entityId) {
            setModerationFeedback(null)
            return
        }

        setIsModerationFeedbackLoading(true)

        try {
            const history = await getEntityModerationHistory('EMPLOYER_PROFILE', entityId)
            const sortedHistory = Array.isArray(history)
                ? [...history].sort(
                    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
                )
                : []

            const latestRevisionEvent =
                sortedHistory.find((item) => item?.action === 'REQUESTED_CHANGES') ||
                sortedHistory.find((item) => item?.action === 'REJECTED') ||
                null

            let taskDetail = null
            if (latestRevisionEvent?.taskId) {
                try {
                    taskDetail = await getModerationTaskDetail(latestRevisionEvent.taskId)
                } catch {
                    taskDetail = null
                }
            }

            setModerationFeedback(extractModerationFeedback(sortedHistory, taskDetail))
        } catch (error) {
            if (error?.status === 403) {
                setModerationFeedback(null)
                return
            }
            setModerationFeedback(null)
        } finally {
            setIsModerationFeedbackLoading(false)
        }
    }, [])

    const reloadEmployerProfile = useCallback(async () => {
        if (!user?.userId) return null

        const [workspaceData, freshLocations] = await Promise.all([
            getEmployerProfileWorkspace(user.userId),
            loadEmployerLocationsData(),
        ])

        const normalizedWorkspace = syncWorkspaceProfileState(workspaceData || {}, user)
        const normalized = normalizedWorkspace.current

        const matchedLocation =
            freshLocations.find((item) => Number(item.id) === Number(normalized.locationId)) || null

        if (matchedLocation) {
            setProfile((prev) => ({
                ...prev,
                locationId: matchedLocation.id,
                locationPreview: matchedLocation,
                cityId: matchedLocation.cityId ?? prev.cityId,
                cityName: matchedLocation.cityName || matchedLocation.city?.name || prev.cityName,
            }))
        }

        if (normalizedWorkspace.publicProfile?.locationId) {
            const publicMatchedLocation =
                freshLocations.find(
                    (item) => Number(item.id) === Number(normalizedWorkspace.publicProfile.locationId)
                ) || null

            if (publicMatchedLocation) {
                setPublicProfile((prev) =>
                    prev
                        ? {
                            ...prev,
                            locationId: publicMatchedLocation.id,
                            locationPreview: publicMatchedLocation,
                            cityId: publicMatchedLocation.cityId ?? prev.cityId,
                            cityName:
                                publicMatchedLocation.cityName ||
                                publicMatchedLocation.city?.name ||
                                prev.cityName,
                        }
                        : prev
                )
            }
        }

        await loadModerationFeedback(normalized.userId || user.userId)
        return normalized
    }, [loadEmployerLocationsData, loadModerationFeedback, syncWorkspaceProfileState, user])

    const buildEmployerProfilePayload = () => {
        const payload = {
            companyName: profile.companyName?.trim() || '',
            description: profile.description?.trim() || '',
            industry: profile.industry?.trim() || '',
            websiteUrl: profile.websiteUrl?.trim() || '',
            socialLinks: rowsToLinks(socialRows),
            publicContacts: contactRows
                .filter((row) => row.url?.trim())
                .map((row, index) => ({
                    type: detectEmployerContactType(row.url.trim(), row.title?.trim() || ''),
                    label: row.title?.trim() || `Контакт ${index + 1}`,
                    value: row.url.trim(),
                })),
        }

        const chosenLocation = employerLocations.find(
            (item) => Number(item.id) === Number(profile.locationId)
        )

        if (chosenLocation) {
            payload.locationId = Number(chosenLocation.id)
            payload.cityId = Number(chosenLocation.cityId)
        }

        if (profile.companySize) {
            payload.companySize = profile.companySize
        }

        if (
            profile.foundedYear !== '' &&
            profile.foundedYear !== null &&
            Number.isFinite(Number(profile.foundedYear))
        ) {
            payload.foundedYear = Number(profile.foundedYear)
        }

        return payload
    }

    const buildEmployerCompanyPayload = () => ({
        legalName: profile.legalName?.trim() || '',
        inn: profile.inn?.trim() || '',
    })

    const openVerificationModalWithTinDefault = (companyInn = profile.inn || '') => {
        setVerificationLinkRows([createLinkRow()])
        setVerificationData((prev) => ({
            ...prev,
            verificationMethod: 'TIN',
            inn: companyInn,
            submittedComment: '',
        }))
        setShowVerificationModal(true)
    }

    const resetOpportunityForm = () => {
        setOpportunityMode('create')
        setEditingOpportunityId(null)
        setResourceRows([createLinkRow()])
        setOpportunityForm({
            title: '',
            shortDescription: '',
            fullDescription: '',
            type: 'VACANCY',
            workFormat: 'REMOTE',
            cityId: null,
            cityName: '',
            locationId: null,
            expiresAt: '',
            eventDate: '',
            requirements: '',
            grade: 'JUNIOR',
            employmentType: 'FULL_TIME',
            salaryFrom: '',
            salaryTo: '',
            salaryCurrency: 'RUB',
            tagIds: [],
            contactEmail: '',
            contactPhone: '',
            contactTelegram: '',
            contactPerson: '',
            resourceLinks: [],
        })
    }

    const resetLocationForm = useCallback(() => {
        setLocationMode('create')
        setEditingLocationId(null)
        setLocationForm(createEmptyLocationForm())
        setLocationErrors({})
        setLocationCitySearchQuery('')
        setLocationCitySuggestions([])
        setIsLocationCitySearchOpen(false)
        setAddressSearchQuery('')
        setAddressSuggestions([])
        setIsAddressSearchOpen(false)
    }, [])

    const validatePublicProfile = () => {
        const nextErrors = {}

        if (!profile.companyName?.trim()) nextErrors.companyName = 'Укажите название компании'
        if (!profile.industry?.trim()) nextErrors.industry = 'Укажите сферу деятельности'
        if (!profile.locationId) nextErrors.locationId = 'Выберите основную локацию профиля'

        const hasPublicChannel =
            Boolean(profile.websiteUrl?.trim()) ||
            (Array.isArray(socialRows) && socialRows.some((item) => item.url?.trim())) ||
            (Array.isArray(contactRows) && contactRows.some((item) => item.url?.trim()))

        if (!hasPublicChannel) {
            nextErrors.publicContacts = 'Добавьте сайт, социальную сеть или контакт для связи'
        }

        setErrors(nextErrors)

        return {
            isValid: Object.keys(nextErrors).length === 0,
            nextErrors,
        }
    }

    const validateCompanyData = () => {
        const nextErrors = {}

        if (!profile.legalName?.trim()) nextErrors.legalName = 'Укажите юридическое название'
        if (!profile.inn?.trim() || !/^\d{10}(\d{2})?$/.test(profile.inn.trim())) {
            nextErrors.inn = 'ИНН должен содержать 10 или 12 цифр'
        }

        setErrors(nextErrors)

        return {
            isValid: Object.keys(nextErrors).length === 0,
            nextErrors,
        }
    }

    const validateOpportunityForm = () => {
        const nextErrors = {}

        if (!opportunityForm.title.trim()) nextErrors.title = 'Укажите название'
        if (!opportunityForm.shortDescription.trim()) nextErrors.shortDescription = 'Укажите краткое описание'
        if (opportunityForm.type === 'EVENT' && !opportunityForm.eventDate) nextErrors.eventDate = 'Укажите дату мероприятия'
        if (opportunityForm.type !== 'EVENT' && !opportunityForm.expiresAt) nextErrors.expiresAt = 'Укажите срок действия'

        const isOfficeBasedWorkFormat = ['OFFICE', 'HYBRID'].includes(opportunityForm.workFormat)
        if (isOfficeBasedWorkFormat && !opportunityForm.locationId) {
            nextErrors.locationId = 'Для офисного или гибридного формата выберите офис'
        }

        setErrors(nextErrors)
        return Object.keys(nextErrors).length === 0
    }

    const validateLocationForm = () => {
        const nextErrors = {}

        if (!locationForm.cityId) nextErrors.cityId = 'Выберите город'
        if (!locationForm.addressLine?.trim()) nextErrors.addressLine = 'Укажите адрес'

        setLocationErrors(nextErrors)

        return {
            isValid: Object.keys(nextErrors).length === 0,
            nextErrors,
        }
    }

    const handleLocationCitySearch = async (value) => {
        setLocationCitySearchQuery(value)
        setLocationForm((prev) => ({
            ...prev,
            cityId: null,
            cityName: value,
        }))

        if (value.trim().length < 2) {
            setLocationCitySuggestions([])
            setIsLocationCitySearchOpen(false)
            return
        }

        try {
            const cities = await searchGeoCities(value, 20)
            setLocationCitySuggestions(cities || [])
            setIsLocationCitySearchOpen(true)
        } catch {
            setLocationCitySuggestions([])
            setIsLocationCitySearchOpen(false)
        }
    }

    const handleSelectLocationCity = (city) => {
        setLocationForm((prev) => ({
            ...prev,
            cityId: city.id,
            cityName: city.name,
        }))
        setLocationCitySearchQuery(city.name || '')
        setIsLocationCitySearchOpen(false)
        setAddressSuggestions([])
        setAddressSearchQuery('')
    }

    const handleAddressSuggest = async (value) => {
        setAddressSearchQuery(value)
        setLocationForm((prev) => ({
            ...prev,
            addressLine: value,
        }))

        if (value.trim().length < 3 || !locationForm.cityId) {
            setAddressSuggestions([])
            setIsAddressSearchOpen(false)
            return
        }

        try {
            const items = await suggestGeoAddress({
                query: value,
                cityId: locationForm.cityId,
            })
            setAddressSuggestions(items || [])
            setIsAddressSearchOpen(true)
        } catch {
            setAddressSuggestions([])
            setIsAddressSearchOpen(false)
        }
    }

    const handleSelectAddressSuggestion = (suggestion) => {
        setLocationForm((prev) => ({
            ...prev,
            cityId: suggestion.cityId ?? prev.cityId,
            cityName: suggestion.cityName || prev.cityName,
            addressLine: suggestion.addressLine || suggestion.value || '',
            postalCode: suggestion.postalCode || '',
            latitude: suggestion.latitude ?? '',
            longitude: suggestion.longitude ?? '',
            fiasId: suggestion.fiasId || '',
            unrestrictedValue: suggestion.unrestrictedValue || '',
            qcGeo: suggestion.qcGeo ?? '',
        }))

        if (suggestion.cityName) {
            setLocationCitySearchQuery(suggestion.cityName)
        }

        setAddressSearchQuery(suggestion.value || suggestion.addressLine || '')
        setIsAddressSearchOpen(false)
    }

    const handleOpenCreateLocation = () => {
        resetLocationForm()
        setLocationMode('create')
        setEditingLocationId(null)
        setIsLocationModalOpen(true)
    }

    const handleOpenEditLocation = (location) => {
        const normalized = normalizeLocationState(location)
        setLocationMode('edit')
        setEditingLocationId(normalized.id)
        setLocationForm(normalized)
        setLocationErrors({})
        setLocationCitySearchQuery(normalized.cityName || '')
        setAddressSearchQuery(normalized.unrestrictedValue || normalized.addressLine || '')
        setLocationCitySuggestions([])
        setAddressSuggestions([])
        setIsLocationCitySearchOpen(false)
        setIsAddressSearchOpen(false)
        setIsLocationModalOpen(true)
    }

    const handleSaveLocation = async () => {
        const validation = validateLocationForm()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Проверьте данные локации',
                variant: 'destructive',
            })
            return
        }

        setIsLocationSaving(true)

        try {
            const savedLocation =
                locationMode === 'edit' && editingLocationId
                    ? await updateEmployerLocation(editingLocationId, locationForm)
                    : await createEmployerLocation(locationForm)

            const freshLocations = await loadEmployerLocationsData()

            setProfile((prev) => ({
                ...prev,
                locationId: savedLocation.id,
                locationPreview: savedLocation,
                cityId: savedLocation.cityId,
                cityName: savedLocation.cityName || prev.cityName,
            }))

            resetLocationForm()
            setIsLocationModalOpen(false)

            toast({
                title: locationMode === 'edit' ? 'Локация обновлена' : 'Локация создана',
                description:
                    locationMode === 'edit'
                        ? 'Локация компании обновлена'
                        : 'Локация сохранена и выбрана как основная',
            })

            const matched = freshLocations.find((item) => Number(item.id) === Number(savedLocation.id))
            if (matched) {
                setProfile((prev) => ({
                    ...prev,
                    locationPreview: matched,
                    cityId: matched.cityId,
                    cityName: matched.cityName || prev.cityName,
                }))
            }
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить локацию',
                variant: 'destructive',
            })
        } finally {
            setIsLocationSaving(false)
        }
    }

    const handleDeleteLocation = async (locationId) => {
        if (!locationId) return

        try {
            await deleteEmployerLocation(locationId)
            const freshLocations = await loadEmployerLocationsData()

            setProfile((prev) => {
                if (Number(prev.locationId) !== Number(locationId)) return prev

                const fallbackLocation = freshLocations[0] || null
                return {
                    ...prev,
                    locationId: fallbackLocation?.id ?? null,
                    locationPreview: fallbackLocation || null,
                    cityId: fallbackLocation?.cityId ?? null,
                    cityName: fallbackLocation?.cityName || '',
                }
            })

            toast({
                title: 'Локация удалена',
                description: 'Локация работодателя удалена',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось удалить локацию',
                variant: 'destructive',
            })
        }
    }

    const handleSubmitVerification = async () => {
        const method = String(verificationData.verificationMethod || 'TIN').toUpperCase()

        if (!user?.userId) {
            toast({
                title: 'Ошибка',
                description: 'Не удалось определить пользователя',
                variant: 'destructive',
            })
            return
        }

        if (method === 'CORPORATE_EMAIL') {
            const email = String(verificationData.corporateEmail || user?.email || '').trim()
            if (!email) {
                toast({
                    title: 'Ошибка',
                    description: 'Укажите корпоративную почту',
                    variant: 'destructive',
                })
                return
            }
            if (!verificationData.corporateEmail && user?.email) {
                setVerificationData(prev => ({ ...prev, corporateEmail: user.email }))
            }
        }

        if (method === 'TIN') {
            const normalizedInn = String(profile.inn || verificationData.inn || '').trim()
            if (!normalizedInn || !/^\d{10}(\d{2})?$/.test(normalizedInn)) {
                toast({
                    title: 'Ошибка',
                    description: 'Чтобы пройти верификацию по ИНН, сначала заполните корректный ИНН в разделе «Реквизиты компании»',
                    variant: 'destructive',
                })
                return
            }
        }

        if (method === 'PROFESSIONAL_LINKS') {
            const hasLinks = verificationLinkRows.some((row) => row.url?.trim())
            if (!hasLinks) {
                toast({
                    title: 'Ошибка',
                    description: 'Добавьте хотя бы одну профессиональную ссылку',
                    variant: 'destructive',
                })
                return
            }
        }

        setIsLoading(true)

        try {
            const normalizedInn = String(profile.inn || verificationData.inn || '').trim()

            const payload = {
                verificationMethod: method,
                submittedComment: verificationData.submittedComment?.trim() || '',
            }

            if (method === 'TIN') {
                payload.inn = normalizedInn
            }

            if (method === 'CORPORATE_EMAIL') {
                payload.corporateEmail = String(verificationData.corporateEmail || user?.email || '').trim()
            }

            if (method === 'PROFESSIONAL_LINKS') {
                payload.professionalLinks = rowsToLinks(verificationLinkRows).map((item) => item.url)
            }

            await createEmployerVerification(payload)
            await reloadEmployerProfile()

            toast({
                title: 'Заявка отправлена',
                description: 'Заявка на верификацию компании успешно отправлена',
            })

            setShowVerificationModal(false)
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось отправить заявку на верификацию',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const loadEmployerResponsesData = useCallback(async () => {
        try {
            const page = await getEmployerApplications({
                limit: 50,
                offset: 0,
                sortDirection: responseFilters.sortDirection,
                status: responseFilters.status || undefined,
                search: responseFilters.search || undefined,
            })
            setResponsesPage(page || { items: [], total: 0, limit: 50, offset: 0 })
        } catch {
            toast({
                title: 'Ошибка',
                description: 'Не удалось загрузить отклики',
                variant: 'destructive',
            })
        }
    }, [responseFilters, toast])

    const loadData = useCallback(async () => {
        setIsLoading(true)

        try {
            const currentUser = await getCurrentSessionUser()
            setUser(currentUser)

            if (!currentUser?.userId) {
                setOpportunities([])
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
                setEmployerLocations([])
                return
            }

            const [workspaceData, locations] = await Promise.all([
                getEmployerProfileWorkspace(currentUser.userId),
                loadEmployerLocationsData(),
            ])

            const normalizedWorkspace = syncWorkspaceProfileState(workspaceData || {}, currentUser)
            const normalized = normalizedWorkspace.current

            const matchedLocation =
                locations.find((item) => Number(item.id) === Number(normalized.locationId)) || null

            if (matchedLocation) {
                setProfile((prev) => ({
                    ...prev,
                    locationPreview: matchedLocation,
                    cityId: matchedLocation.cityId,
                    cityName: matchedLocation.cityName || matchedLocation.city?.name || '',
                }))
            }

            if (normalizedWorkspace.publicProfile?.locationId) {
                const publicMatchedLocation =
                    locations.find(
                        (item) => Number(item.id) === Number(normalizedWorkspace.publicProfile.locationId)
                    ) || null

                if (publicMatchedLocation) {
                    setPublicProfile((prev) =>
                        prev
                            ? {
                                ...prev,
                                locationPreview: publicMatchedLocation,
                                cityId: publicMatchedLocation.cityId,
                                cityName:
                                    publicMatchedLocation.cityName ||
                                    publicMatchedLocation.city?.name ||
                                    prev.cityName,
                            }
                            : prev
                    )
                }
            }

            await loadModerationFeedback(normalized.userId || currentUser.userId)

            try {
                const opportunityPage = await getEmployerOpportunities()
                setOpportunities(Array.isArray(opportunityPage?.items) ? opportunityPage.items : [])
            } catch {
                setOpportunities([])
            }

            try {
                const page = await getEmployerApplications({
                    limit: 50,
                    offset: 0,
                    sortDirection: responseFilters.sortDirection,
                    status: responseFilters.status || undefined,
                    search: responseFilters.search || undefined,
                })
                setResponsesPage(page || { items: [], total: 0, limit: 50, offset: 0 })
            } catch {
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
            }
        } catch (error) {
            if ([401, 403].includes(error?.status)) {
                setUser(null)
                setOpportunities([])
                setResponsesPage({ items: [], total: 0, limit: 50, offset: 0 })
                setEmployerLocations([])
                return
            }

            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить кабинет работодателя',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }, [loadEmployerLocationsData, loadModerationFeedback, responseFilters, syncWorkspaceProfileState, toast])

    useEffect(() => {
        loadData()
    }, [loadData])

    useEffect(() => {
        listTags('TECH')
            .then((items) => setTechTags(items || []))
            .catch(() => setTechTags([]))
    }, [])

    useEffect(() => {
        if (activeTab === 'applicants' && user) {
            loadEmployerResponsesData()
        }
    }, [activeTab, user, loadEmployerResponsesData])

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (locationCitySearchRef.current && !locationCitySearchRef.current.contains(event.target)) {
                setIsLocationCitySearchOpen(false)
            }

            if (addressSearchRef.current && !addressSearchRef.current.contains(event.target)) {
                setIsAddressSearchOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => {
            document.removeEventListener('mousedown', handleClickOutside)
        }
    }, [])

    useEffect(() => {
        if (isEditingProfile) return

        setSocialRows(linksToRows(profile.socialLinks || []))
        setContactRows(
            (profile.publicContacts || []).length > 0
                ? profile.publicContacts.map((item) =>
                    createLinkRow(item.label || item.type || 'Контакт', item.value || '')
                )
                : [createLinkRow()]
        )
    }, [isEditingProfile, profile])

    useEffect(() => {
        setVerificationData((prev) => ({
            ...prev,
            inn: profile.inn || '',
        }))
    }, [profile.inn])

    useEffect(() => {
        if (showVerificationModal && verificationData.verificationMethod === 'CORPORATE_EMAIL') {
            if (user?.email && !verificationData.corporateEmail) {
                setVerificationData(prev => ({
                    ...prev,
                    corporateEmail: user.email
                }))
            }
        }
    }, [showVerificationModal, verificationData.verificationMethod, user?.email])

    const filteredOpportunities = useMemo(() => {
        return opportunities.filter((opp) => {
            const matchesSearch =
                opp.title?.toLowerCase().includes(opportunitySearchTerm.toLowerCase()) ||
                opp.shortDescription?.toLowerCase().includes(opportunitySearchTerm.toLowerCase())

            const matchesStatus =
                opportunityFilterStatus === 'all' || statusBucket(opp.status) === opportunityFilterStatus

            return matchesSearch && matchesStatus
        })
    }, [opportunities, opportunityFilterStatus, opportunitySearchTerm])

    const handleLogoUpload = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        try {
            setIsLogoUploading(true)
            await uploadEmployerLogo(file)
            await reloadEmployerProfile()

            toast({
                title: 'Логотип загружен',
                description: 'Логотип компании успешно обновлён',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось загрузить логотип',
                variant: 'destructive',
            })
        } finally {
            setIsLogoUploading(false)
            event.target.value = ''
        }
    }

    const handleDeleteLogo = async () => {
        if (!profile.logo?.fileId) return

        try {
            await deleteEmployerFile(profile.logo.fileId)
            await reloadEmployerProfile()

            toast({
                title: 'Логотип удалён',
                description: 'Логотип компании удалён из профиля',
            })
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось удалить логотип',
                variant: 'destructive',
            })
        }
    }

    const handleSaveProfile = async () => {
        const validation = validatePublicProfile()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Заполните обязательные поля',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const profilePayload = buildEmployerProfilePayload()
            const hasPublicChanges = !areProfilePayloadsEqual(profilePayload, initialProfileSnapshot)

            if (!hasPublicChanges) {
                toast({
                    title: 'Без изменений',
                    description: 'Публичный профиль не изменился',
                })
                setIsEditingProfile(false)
                return
            }

            await updateEmployerProfile(profilePayload)
            await reloadEmployerProfile()

            toast({
                title: 'Изменения сохранены',
                description: 'Публичный профиль сохранён',
            })

            setIsEditingProfile(false)
        } catch (error) {
            console.error('Save profile error:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить профиль',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveCompanyData = async () => {
        const validation = validateCompanyData()

        if (!validation.isValid) {
            toast({
                title: 'Ошибка',
                description: Object.values(validation.nextErrors)[0] || 'Проверьте реквизиты компании',
                variant: 'destructive',
            })
            return
        }

        const activeVerificationStates = ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW']
        const normalizedVerificationState = String(profile.verificationStatus || '').toUpperCase()
        const isVerificationFlowLocked = activeVerificationStates.includes(normalizedVerificationState)

        if (isVerificationFlowLocked) {
            toast({
                title: 'Верификация уже выполняется',
                description: 'Дождитесь завершения текущей проверки компании, чтобы отправить новую заявку',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const companyPayload = buildEmployerCompanyPayload()
            const hasCompanyChanges = !areCompanyPayloadsEqual(companyPayload, initialCompanySnapshot)
            const isAlreadyVerified = normalizedVerificationState === 'APPROVED'

            if (hasCompanyChanges) {
                await updateEmployerCompanyData(companyPayload)
                await reloadEmployerProfile()

                toast({
                    title: 'Реквизиты сохранены',
                    description: 'Теперь выберите способ верификации компании',
                })

                setIsEditingCompanyData(false)
                openVerificationModalWithTinDefault(companyPayload.inn)
                return
            }

            if (isAlreadyVerified) {
                toast({
                    title: 'Компания уже верифицирована',
                    description: 'Реквизиты не изменились. Повторная отправка не требуется',
                })
                setIsEditingCompanyData(false)
                return
            }

            toast({
                title: 'Реквизиты готовы',
                description: 'Теперь выберите способ верификации компании',
            })

            setIsEditingCompanyData(false)
            openVerificationModalWithTinDefault(companyPayload.inn)
        } catch (error) {
            console.error('Save company data error:', error)
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить реквизиты компании',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    const handleSubmitEmployerProfileForModeration = async () => {
        const publicValidation = validatePublicProfile()

        if (!publicValidation.isValid) {
            toast({
                title: 'Ошибка',
                description:
                    Object.values(publicValidation.nextErrors)[0] ||
                    'Заполните обязательные поля профиля',
                variant: 'destructive',
            })
            return
        }

        setIsLoading(true)

        try {
            const profilePayload = buildEmployerProfilePayload()
            const hasPublicChanges = !areProfilePayloadsEqual(profilePayload, initialProfileSnapshot)

            if (hasPublicChanges) {
                await updateEmployerProfile(profilePayload)
            }

            if (isProfileAlreadyOnModeration(profile.moderationStatus)) {
                toast({
                    title: 'Профиль уже на модерации',
                    description: 'Повторная отправка сейчас не требуется',
                })
                await reloadEmployerProfile()
                setIsEditingProfile(false)
                setIsEditingCompanyData(false)
                return
            }

            await submitEmployerProfileForModeration()
            await reloadEmployerProfile()

            toast({
                title: 'Профиль отправлен',
                description: 'Публичный профиль отправлен на модерацию',
            })

            setIsEditingProfile(false)
            setIsEditingCompanyData(false)
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

    const handleSaveOpportunity = async () => {
        if (!isVerified) {
            toast({
                title: 'Верификация обязательна',
                description: 'Сначала пройдите верификацию компании',
                variant: 'destructive',
            })
            return
        }

        if (!profile.companyName?.trim()) {
            toast({
                title: 'Ошибка',
                description: 'Сначала заполните название компании',
                variant: 'destructive',
            })
            return
        }

        if (!validateOpportunityForm()) {
            toast({
                title: 'Ошибка',
                description: 'Проверьте обязательные поля публикации',
                variant: 'destructive',
            })
            return
        }

        if (opportunityForm.type !== 'EVENT' && opportunityForm.expiresAt) {
            const selectedDate = new Date(`${opportunityForm.expiresAt}T23:59:59`)
            const now = new Date()

            if (Number.isNaN(selectedDate.getTime()) || selectedDate < now) {
                toast({
                    title: 'Ошибка',
                    description: 'Срок действия вакансии не может быть в прошлом',
                    variant: 'destructive',
                })
                return
            }
        }

        setIsLoading(true)

        try {
            const selectedLocation =
                employerLocations.find((item) => Number(item.id) === Number(opportunityForm.locationId)) || null

            const isOfficeBasedWorkFormat = ['OFFICE', 'HYBRID'].includes(opportunityForm.workFormat)

            const payload = {
                title: opportunityForm.title?.trim(),
                shortDescription: opportunityForm.shortDescription?.trim() || '',
                fullDescription:
                    opportunityForm.fullDescription?.trim() ||
                    opportunityForm.shortDescription?.trim() ||
                    '',
                requirements: opportunityForm.requirements?.trim() || null,
                companyName: profile.companyName.trim(),
                type: opportunityForm.type || 'VACANCY',
                workFormat: opportunityForm.workFormat || 'REMOTE',
                employmentType: opportunityForm.employmentType || 'FULL_TIME',
                grade: opportunityForm.grade || 'JUNIOR',
                salaryFrom:
                    opportunityForm.salaryFrom !== '' && opportunityForm.salaryFrom != null
                        ? Number(opportunityForm.salaryFrom)
                        : null,
                salaryTo:
                    opportunityForm.salaryTo !== '' && opportunityForm.salaryTo != null
                        ? Number(opportunityForm.salaryTo)
                        : null,
                salaryCurrency: (opportunityForm.salaryCurrency || 'RUB').trim().toUpperCase(),
                expiresAt:
                    opportunityForm.type === 'EVENT'
                        ? null
                        : new Date(`${opportunityForm.expiresAt}T23:59:59`).toISOString(),
                eventDate:
                    opportunityForm.type === 'EVENT'
                        ? opportunityForm.eventDate || null
                        : null,
                cityId: isOfficeBasedWorkFormat ? selectedLocation?.cityId ?? null : null,
                locationId: isOfficeBasedWorkFormat ? selectedLocation?.id ?? null : null,
                contactInfo: {
                    email: opportunityForm.contactEmail?.trim() || null,
                    phone: opportunityForm.contactPhone?.trim() || null,
                    telegram: opportunityForm.contactTelegram?.trim() || null,
                    contactPerson: opportunityForm.contactPerson?.trim() || null,
                },
                resourceLinks: rowsToLinks(resourceRows),
                tagIds: Array.isArray(opportunityForm.tagIds)
                    ? opportunityForm.tagIds.map(Number).filter((id) => Number.isFinite(id) && id > 0)
                    : [],
            }

            const isEdit = opportunityMode === 'edit' && editingOpportunityId

            if (isEdit) {
                await updateOpportunity(editingOpportunityId, payload)
            } else {
                await createOpportunity(payload)
            }

            const refreshed = await getEmployerOpportunities()
            setOpportunities(Array.isArray(refreshed?.items) ? refreshed.items : [])

            toast({
                title: isEdit ? 'Публикация обновлена' : 'Публикация создана',
                description: isEdit ? 'Изменения успешно сохранены' : 'Карточка отправлена в общий список',
            })

            resetOpportunityForm()
            setActiveTab('opportunities')
        } catch (error) {
            toast({
                title: 'Ошибка',
                description: error?.message || 'Не удалось сохранить публикацию',
                variant: 'destructive',
            })
        } finally {
            setIsLoading(false)
        }
    }

    if (isLoading && !profile.companyName && opportunities.length === 0) {
        return (
            <DashboardLayout title="Кабинет работодателя">
                <div className="dashboard-loading">
                    <div className="loading-spinner"></div>
                    <p>Загрузка кабинета...</p>
                </div>
            </DashboardLayout>
        )
    }

    return (
        <DashboardLayout
            title="Управление компанией"
            subtitle={profile.companyName || user?.displayName || 'Компания'}
        >
            {!isVerified && (
                <div className={`verification-banner ${isVerificationRejected ? 'verification-banner--warning' : ''}`}>
                    <div className="verification-banner__content">
                        <svg className="verification-banner__icon" width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                                d="M12 8V12M12 16H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                        <span>
                            {verificationState === 'NOT_STARTED' && 'Пройдите верификацию компании, чтобы публиковать вакансии и мероприятия.'}
                            {verificationState === 'PENDING' && 'Верификация компании на проверке. Публикация новых карточек временно ограничена.'}
                            {verificationState === 'REJECTED' && 'Верификация отклонена. Проверьте данные и отправьте заявку повторно.'}
                            {verificationState === 'REVOKED' && 'Верификация отозвана. Пройдите верификацию заново.'}
                            {verificationState === 'IN_PROGRESS' && 'Заявка на верификацию обрабатывается. Публикация новых карточек временно ограничена.'}
                            {verificationState === 'UNDER_REVIEW' && 'Верификация компании находится на рассмотрении. Публикация новых карточек временно ограничена.'}
                        </span>
                    </div>
                    <button className="verification-banner__button" onClick={() => setShowVerificationModal(true)}>
                        {verificationState === 'PENDING' || verificationState === 'IN_PROGRESS' || verificationState === 'UNDER_REVIEW'
                            ? 'Проверить статус'
                            : 'Пройти верификацию'}
                    </button>
                </div>
            )}

            <div className="dashboard-tabs">
                <button
                    className={`dashboard-tabs__btn ${activeTab
                    === 'opportunities' ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('opportunities')}
                >
                    Вакансии
                </button>

                <button
                    className={`dashboard-tabs__btn ${activeTab === 'create'
                        ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('create')}
                    disabled={!isVerified}
                >
                    {opportunityMode === 'edit' ? 'Редактирование' : 'Создать'}
                </button>

                <button
                    className={`dashboard-tabs__btn ${activeTab === 'applicants'
                        ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('applicants')}
                >
                    Отклики
                </button>

                <button
                    className={`dashboard-tabs__btn ${activeTab === 'profile'
                        ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('profile')}
                >
                    О компании
                </button>
                <button
                    className={`dashboard-tabs__btn ${activeTab === 'tags'
                        ? 'is-active' : ''}`}
                    onClick={() => setActiveTab('tags')}
                >
                    Мои теги
                </button>
            </div>

            <div className="dashboard-panel">
                {activeTab === 'opportunities' && (
                    <EmployerOpportunitiesSection
                        isVerified={isVerified}
                        opportunitySearchTerm={opportunitySearchTerm}
                        setOpportunitySearchTerm={setOpportunitySearchTerm}
                        opportunityFilterStatus={opportunityFilterStatus}
                        setOpportunityFilterStatus={setOpportunityFilterStatus}
                        filteredOpportunities={filteredOpportunities}
                        expandedOpportunityId={expandedOpportunityId}
                        setExpandedOpportunityId={setExpandedOpportunityId}
                        employerLocations={employerLocations}
                        onStartEditOpportunity={async (opportunityId) => {
                            const opportunity = await getEmployerOpportunityById(opportunityId)

                            setEditingOpportunityId(opportunity.id)
                            setOpportunityMode('edit')
                            setResourceRows(
                                opportunity.resourceLinks?.length > 0
                                    ? opportunity.resourceLinks.map((item) =>
                                        createLinkRow(item.label || '', item.url || '')
                                    )
                                    : [createLinkRow()]
                            )

                            setOpportunityForm({
                                title: opportunity.title || '',
                                shortDescription: opportunity.shortDescription || '',
                                fullDescription: opportunity.fullDescription || '',
                                type: opportunity.type || 'VACANCY',
                                workFormat: opportunity.workFormat || 'REMOTE',
                                cityId: opportunity.cityId ?? opportunity.city?.id ?? null,
                                cityName: opportunity.cityName || opportunity.city?.name || '',
                                locationId: opportunity.locationId ?? opportunity.location?.id ?? null,
                                expiresAt: opportunity.expiresAt ? opportunity.expiresAt.slice(0, 10) : '',
                                eventDate: opportunity.eventDate ? opportunity.eventDate.slice(0, 10) : '',
                                requirements: opportunity.requirements || '',
                                grade: opportunity.grade || 'JUNIOR',
                                employmentType: opportunity.employmentType || 'FULL_TIME',
                                salaryFrom: opportunity.salaryFrom ?? '',
                                salaryTo: opportunity.salaryTo ?? '',
                                salaryCurrency: opportunity.salaryCurrency || 'RUB',
                                tagIds: opportunity.tagIds || [],
                                contactEmail: opportunity.contactInfo?.email || opportunity.contactEmail || '',
                                contactPhone: opportunity.contactInfo?.phone || opportunity.contactPhone || '',
                                contactTelegram:
                                    opportunity.contactInfo?.telegram || opportunity.contactTelegram || '',
                                contactPerson:
                                    opportunity.contactInfo?.contactPerson || opportunity.contactPerson || '',
                                resourceLinks: opportunity.resourceLinks || [],
                            })

                            setActiveTab('create')
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                        }}
                        onUpdateOpportunityStatus={async (id, action, successText) => {
                            await updateOpportunityStatus(id, action)
                            const refreshed = await getEmployerOpportunities()
                            setOpportunities(refreshed.items || [])
                            toast({ title: 'Статус обновлён', description: successText })
                        }}
                        onDeleteOpportunity={async (id, title) => {
                            await updateOpportunityStatus(id, 'archive')
                            const refreshed = await getEmployerOpportunities()
                            setOpportunities(refreshed.items || [])
                            toast({
                                title: 'Публикация архивирована',
                                description: `«${title}» перемещена в архив`,
                            })
                        }}
                    />
                )}

                {activeTab === 'create' && (
                    <EmployerOpportunityForm
                        isVerified={isVerified}
                        isLoading={isLoading}
                        opportunityMode={opportunityMode}
                        opportunityForm={opportunityForm}
                        errors={errors}
                        techTags={techTags}
                        employerLocations={employerLocations}
                        resourceRows={resourceRows}
                        setResourceRows={setResourceRows}
                        onResetOpportunityForm={resetOpportunityForm}
                        onSaveOpportunity={handleSaveOpportunity}
                        onChangeOpportunityForm={setOpportunityForm}
                    />
                )}

                {activeTab === 'applicants' && (
                    <EmployerApplicantsSection
                        responseFilters={responseFilters}
                        setResponseFilters={setResponseFilters}
                        responsesPage={responsesPage}
                        onLoadEmployerResponsesData={loadEmployerResponsesData}
                        onUpdateApplicationStatus={async (applicationId, newStatus) => {
                            await updateApplicationStatus(applicationId, newStatus)
                            await loadEmployerResponsesData()

                            const labels = {
                                ACCEPTED: 'Принят',
                                REJECTED: 'Отклонён',
                                RESERVE: 'В резерве',
                                IN_REVIEW: 'На рассмотрении',
                            }

                            toast({
                                title: 'Статус обновлён',
                                description: `Статус изменён на «${labels[newStatus] || newStatus}»`,
                            })
                        }}
                        onOpenApplicant={(applicant) => {
                            setSelectedApplicant(applicant)
                            setIsApplicantModalOpen(true)
                        }}
                    />
                )}

                {activeTab === 'profile' && (
                    <EmployerProfileSection
                        user={user}
                        profile={profile}
                        publicProfile={publicProfile}
                        hasApprovedPublicVersion={hasApprovedPublicVersion}
                        errors={errors}
                        isLoading={isLoading}
                        isEditingProfile={isEditingProfile}
                        isEditingCompanyData={isEditingCompanyData}
                        setIsEditingProfile={setIsEditingProfile}
                        setIsEditingCompanyData={setIsEditingCompanyData}
                        setProfile={setProfile}
                        socialRows={socialRows}
                        setSocialRows={setSocialRows}
                        contactRows={contactRows}
                        setContactRows={setContactRows}
                        moderationMeta={moderationMeta}
                        moderationState={moderationState}
                        moderationFeedback={moderationFeedback}
                        isModerationFeedbackLoading={isModerationFeedbackLoading}
                        verificationState={verificationState}
                        logoInputRef={logoInputRef}
                        isLogoUploading={isLogoUploading}
                        onHandleLogoUpload={handleLogoUpload}
                        onHandleDeleteLogo={handleDeleteLogo}
                        onHandleSaveProfile={handleSaveProfile}
                        onHandleSaveCompanyData={handleSaveCompanyData}
                        onHandleSubmitEmployerProfileForModeration={handleSubmitEmployerProfileForModeration}
                        employerLocations={employerLocations}
                        selectedEmployerLocation={selectedEmployerLocation}
                        onOpenCreateLocation={handleOpenCreateLocation}
                        onOpenEditLocation={handleOpenEditLocation}
                        onDeleteLocation={handleDeleteLocation}
                    />
                )}
                {activeTab === 'tags' && <EmployerTagsPage />}
            </div>

            <EmployerVerificationModal
                isOpen={showVerificationModal}
                verificationData={verificationData}
                setVerificationData={setVerificationData}
                verificationLinkRows={verificationLinkRows}
                setVerificationLinkRows={setVerificationLinkRows}
                onSubmit={handleSubmitVerification}
                onClose={() => setShowVerificationModal(false)}
                userEmail={user?.email || ''}
                companyInn={profile.inn || ''}
            />

            <EmployerLocationModal
                isOpen={isLocationModalOpen}
                locationMode={locationMode}
                isLocationSaving={isLocationSaving}
                locationForm={locationForm}
                locationErrors={locationErrors}
                locationCitySearchRef={locationCitySearchRef}
                addressSearchRef={addressSearchRef}
                locationCitySearchQuery={locationCitySearchQuery}
                locationCitySuggestions={locationCitySuggestions}
                isLocationCitySearchOpen={isLocationCitySearchOpen}
                addressSearchQuery={addressSearchQuery}
                addressSuggestions={addressSuggestions}
                isAddressSearchOpen={isAddressSearchOpen}
                onClose={() => setIsLocationModalOpen(false)}
                onSave={handleSaveLocation}
                onChangeLocationForm={setLocationForm}
                onLocationCitySearch={handleLocationCitySearch}
                onSelectLocationCity={handleSelectLocationCity}
                onAddressSuggest={handleAddressSuggest}
                onSelectAddressSuggestion={handleSelectAddressSuggestion}
            />

            <ApplicantPreviewModal
                isOpen={isApplicantModalOpen}
                selectedApplicant={selectedApplicant}
                onClose={() => setIsApplicantModalOpen(false)}
            />
        </DashboardLayout>
    )
}

export default EmployerDashboard