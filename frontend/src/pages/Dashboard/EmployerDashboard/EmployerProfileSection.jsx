import { useMemo, useState, useEffect } from 'react'

import Button from '@/components/Button'
import Input from '@/components/Input'
import Label from '@/components/Label'
import Textarea from '@/components/Textarea'
import LinksEditor from '@/components/LinksEditor'
import CustomSelect from '@/components/CustomSelect'

import { getFileDownloadUrlByUserAndFile } from '@/api/profile'

import editIcon from '@/assets/icons/edit.svg'
import linkIcon from '@/assets/icons/link.svg'

import { COMPANY_SIZE_OPTIONS } from './employerDashboard.constants'
import {
    getLocationLabel,
    renderContactMethod,
} from './employerDashboard.helpers'

import EmployerLocationsSection from './EmployerLocationsSection'

function EmployerProfileSection({
                                    user,
                                    profile,
                                    publicProfile,
                                    hasApprovedPublicVersion,
                                    errors,
                                    isLoading,
                                    isEditingProfile,
                                    isEditingCompanyData,
                                    setIsEditingProfile,
                                    setIsEditingCompanyData,
                                    setProfile,
                                    socialRows,
                                    setSocialRows,
                                    contactRows,
                                    setContactRows,
                                    moderationMeta,
                                    moderationState,
                                    moderationFeedback,
                                    isModerationFeedbackLoading,
                                    verificationState,
                                    logoInputRef,
                                    isLogoUploading,
                                    onHandleLogoUpload,
                                    onHandleDeleteLogo,
                                    onHandleSaveProfile,
                                    onHandleSaveCompanyData,
                                    onHandleSubmitEmployerProfileForModeration,
                                    employerLocations,
                                    selectedEmployerLocation,
                                    onOpenCreateLocation,
                                    onOpenEditLocation,
                                    onDeleteLocation,
                                }) {
    const [profileVersionView, setProfileVersionView] = useState('current')

    const shouldShowVersionSwitch = Boolean(
        hasApprovedPublicVersion &&
        publicProfile &&
        moderationState === 'PENDING_MODERATION'
    )

    useEffect(() => {
        if (!shouldShowVersionSwitch) {
            setProfileVersionView('current')
        }
    }, [shouldShowVersionSwitch])

    const currentLogoUrl = profile.logo?.fileId && profile.userId
        ? getFileDownloadUrlByUserAndFile('EMPLOYER', profile.userId, profile.logo.fileId)
        : null

    const publicLogoUrl = publicProfile?.logo?.fileId && publicProfile?.userId
        ? getFileDownloadUrlByUserAndFile('EMPLOYER', publicProfile.userId, publicProfile.logo.fileId)
        : null

    const publicSelectedLocation = useMemo(() => {
        if (!publicProfile?.locationId) return null
        return employerLocations.find((item) => Number(item.id) === Number(publicProfile.locationId)) || null
    }, [employerLocations, publicProfile?.locationId])

    const displayedProfile = shouldShowVersionSwitch && profileVersionView === 'public'
        ? publicProfile
        : profile

    const displayedLogoUrl = shouldShowVersionSwitch && profileVersionView === 'public'
        ? publicLogoUrl
        : currentLogoUrl

    const displayedLocation = shouldShowVersionSwitch && profileVersionView === 'public'
        ? publicSelectedLocation
        : selectedEmployerLocation

    const displayedModerationTone = shouldShowVersionSwitch && profileVersionView === 'public'
        ? 'approved'
        : moderationMeta.tone

    const displayedModerationLabel = shouldShowVersionSwitch && profileVersionView === 'public'
        ? 'Одобрен'
        : moderationMeta.label

    const displayedHeroText = shouldShowVersionSwitch && profileVersionView === 'public'
        ? 'Это версия профиля, которую сейчас видят другие пользователи платформы.'
        : shouldShowVersionSwitch
            ? 'Это текущая версия профиля в вашем кабинете. После одобрения модератором она заменит публичную.'
            : moderationMeta.description

    const showInitialModerationAction = ['DRAFT', 'NEEDS_REVISION'].includes(moderationState)
    const isPublicView = shouldShowVersionSwitch && profileVersionView === 'public'
    const showSensitiveFields = !isPublicView
    const isVerificationFlowLocked = ['PENDING', 'IN_PROGRESS', 'UNDER_REVIEW'].includes(
        String(verificationState || '').toUpperCase()
    )

    return (
        <div className="employer-profile">
            <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                hidden
                onChange={onHandleLogoUpload}
            />

            {!isEditingProfile && !isEditingCompanyData ? (
                <div className="employer-profile__view">
                    <div className="employer-profile__view-header">
                        <h2>Информация о компании</h2>
                        <div className="employer-profile__view-actions">
                            <button
                                type="button"
                                className="profile-card__edit-btn"
                                onClick={() => setIsEditingProfile(true)}
                            >
                                <img src={editIcon} alt="" className="icon" />
                                Публичный профиль
                            </button>
                            <button
                                type="button"
                                className="profile-card__edit-btn"
                                onClick={() => setIsEditingCompanyData(true)}
                            >
                                <img src={editIcon} alt="" className="icon" />
                                Реквизиты компании
                            </button>
                        </div>
                    </div>

                    {showInitialModerationAction && (
                        <div className="employer-profile__moderation-actions">
                            <div className="employer-profile__moderation-hint">
                                {moderationState === 'NEEDS_REVISION'
                                    ? 'После правок сохраните данные и снова отправьте публичный профиль на модерацию отдельной кнопкой.'
                                    : 'Вы уже сохранили черновик профиля. Чтобы профиль впервые попал на проверку к куратору, отправьте его на модерацию отдельной кнопкой.'}
                            </div>

                            <Button
                                className="button--primary"
                                onClick={onHandleSubmitEmployerProfileForModeration}
                                disabled={isLoading}
                            >
                                {isLoading ? 'Отправка...' : 'Отправить профиль на модерацию'}
                            </Button>
                        </div>
                    )}

                    {shouldShowVersionSwitch && (
                        <div className="employer-profile__moderation-hint">
                            У вас есть изменения, которые ещё не одобрены модератором. Переключайтесь между
                            текущей версией профиля и публичной версией, которую сейчас видят пользователи.
                        </div>
                    )}

                    {shouldShowVersionSwitch && (
                        <div className="employer-profile__version-switch">
                            <button
                                type="button"
                                className={`employer-profile__version-switch-btn ${profileVersionView === 'current' ? 'is-active' : ''}`}
                                onClick={() => setProfileVersionView('current')}
                            >
                                Текущая версия
                            </button>
                            <button
                                type="button"
                                className={`employer-profile__version-switch-btn ${profileVersionView === 'public' ? 'is-active' : ''}`}
                                onClick={() => setProfileVersionView('public')}
                            >
                                Публичная версия
                            </button>
                        </div>
                    )}

                    {moderationState === 'NEEDS_REVISION' && !shouldShowVersionSwitch && (
                        <div className="employer-profile__revision-card">
                            <div className="employer-profile__revision-header">
                                <h3>Профиль требует доработки</h3>
                                {isModerationFeedbackLoading && (
                                    <span className="employer-profile__revision-meta">
                                        Загружаем комментарий куратора…
                                    </span>
                                )}
                            </div>

                            <p className="employer-profile__revision-text">
                                Куратор вернул профиль на правки. Исправьте данные и сохраните изменения.
                            </p>

                            {moderationFeedback?.comment && (
                                <div className="employer-profile__revision-block">
                                    <span className="employer-profile__revision-label">Комментарий куратора</span>
                                    <p>{moderationFeedback.comment}</p>
                                </div>
                            )}

                            {moderationFeedback?.fieldIssues?.length > 0 && (
                                <div className="employer-profile__revision-block">
                                    <span className="employer-profile__revision-label">Что нужно исправить</span>
                                    <ul className="employer-profile__revision-list">
                                        {moderationFeedback.fieldIssues.map((issue, index) => (
                                            <li key={`${issue.field || 'field'}-${index}`}>
                                                <strong>{issue.field || 'Поле'}:</strong> {issue.message}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="employer-profile__hero">
                        <div className="employer-profile__logo-card">
                            {displayedLogoUrl ? (
                                <img
                                    src={displayedLogoUrl}
                                    alt={displayedProfile.companyName || 'Логотип компании'}
                                    className="employer-profile__logo-image"
                                />
                            ) : (
                                <div className="employer-profile__logo-placeholder">
                                    {(displayedProfile.companyName?.trim()?.[0] || 'C').toUpperCase()}
                                </div>
                            )}
                        </div>

                        <div className="employer-profile__hero-info">
                            <div className="employer-profile__hero-title-row">
                                <h3>{displayedProfile.companyName || 'Компания без названия'}</h3>
                            </div>

                            <div className="employer-profile__hero-submeta">
                                <div
                                    className={`employer-profile__status-chip employer-profile__status-chip--${displayedModerationTone}`}>
                                    <span className="employer-profile__status-chip-label">
                                        {shouldShowVersionSwitch
                                            ? profileVersionView === 'public'
                                                ? 'Публичная версия'
                                                : 'Текущая версия'
                                            : 'Профиль'}
                                    </span>
                                    <span className="employer-profile__status-chip-value">
                                        {displayedModerationLabel}
                                    </span>
                                </div>

                                <div
                                    className={`employer-profile__status-chip employer-profile__status-chip--verification-${(verificationState || 'not_started').toLowerCase()}`}>
                                    <span className="employer-profile__status-chip-label">Верификация</span>
                                    <span className="employer-profile__status-chip-value">
                                        {verificationState === 'APPROVED' && 'Пройдена'}
                                        {verificationState === 'PENDING' && 'На проверке'}
                                        {verificationState === 'REJECTED' && 'Отклонена'}
                                        {verificationState === 'REVOKED' && 'Отозвана'}
                                        {verificationState === 'NOT_STARTED' && 'Не начата'}
                                        {!['APPROVED', 'PENDING', 'REJECTED', 'REVOKED', 'NOT_STARTED'].includes(verificationState) && verificationState}
                                    </span>
                                </div>
                            </div>

                            <p className="employer-profile__hero-text">
                                {displayedHeroText}
                            </p>
                        </div>
                    </div>

                    <div className="employer-profile__grid">
                        <div className="employer-profile__field">
                            <Label>Название</Label>
                            <div className="field-value">{displayedProfile.companyName || '—'}</div>
                        </div>

                        {showSensitiveFields && (
                            <>
                                <div className="employer-profile__field">
                                    <Label>ИНН</Label>
                                    <div className="field-value">{displayedProfile.inn || '—'}</div>
                                </div>

                                <div className="employer-profile__field">
                                    <Label>Юр. название</Label>
                                    <div className="field-value">{displayedProfile.legalName || '—'}</div>
                                </div>
                            </>
                        )}

                        <div className="employer-profile__field">
                            <Label>Сфера</Label>
                            <div className="field-value">{displayedProfile.industry || '—'}</div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Сайт</Label>
                            <div className="field-value">
                                {displayedProfile.websiteUrl ? (
                                    <a href={displayedProfile.websiteUrl} target="_blank" rel="noopener noreferrer">
                                        {displayedProfile.websiteUrl}
                                    </a>
                                ) : '—'}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Локация</Label>
                            <div className="field-value">
                                {displayedLocation ? getLocationLabel(displayedLocation) : displayedProfile.cityName || '—'}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Размер</Label>
                            <div className="field-value">
                                {COMPANY_SIZE_OPTIONS.find((item) => item.value === displayedProfile.companySize)?.label || '—'}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Год основания</Label>
                            <div className="field-value">{displayedProfile.foundedYear || '—'}</div>
                        </div>

                        <div className="employer-profile__field employer-profile__field--wide">
                            <Label>Описание</Label>
                            <div className="field-value">{displayedProfile.description || '—'}</div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Социальные сети</Label>
                            <div className="field-value">
                                {displayedProfile.socialLinks?.length > 0 ? (
                                    <div className="links-list">
                                        {displayedProfile.socialLinks.map((item, index) => (
                                            <a
                                                key={`${item.url}-${index}`}
                                                href={item.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="link-item"
                                            >
                                                <img src={linkIcon} alt="" className="icon-small"/>
                                                <span>{item.label || item.url}</span>
                                            </a>
                                        ))}
                                    </div>
                                ) : '—'}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Контакты для связи</Label>
                            <div className="field-value">
                                {displayedProfile.publicContacts?.length > 0 ? (
                                    <div className="links-list">
                                        {displayedProfile.publicContacts.map((item, index) => (
                                            <div key={`${item.value}-${index}`} className="link-item">
                                                <img src={linkIcon} alt="" className="icon-small"/>
                                                <span>{item.label ? `${item.label}: ` : ''}</span>
                                                {renderContactMethod(item)}
                                            </div>
                                        ))}
                                    </div>
                                ) : '—'}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Статус верификации</Label>
                            <div
                                className={`field-value verification-status status-${(verificationState || 'not_started').toLowerCase()}`}>
                                {verificationState === 'APPROVED' && 'Верифицирован'}
                                {verificationState === 'PENDING' && 'На проверке'}
                                {verificationState === 'REJECTED' && 'Отклонён'}
                                {verificationState === 'REVOKED' && 'Отозвана'}
                                {verificationState === 'NOT_STARTED' && 'Не начата'}
                                {!['APPROVED', 'PENDING', 'REJECTED', 'REVOKED', 'NOT_STARTED'].includes(verificationState) && verificationState}
                            </div>
                        </div>

                        <div className="employer-profile__field">
                            <Label>Статус модерации</Label>
                            <div
                                className={`field-value employer-profile__moderation-state employer-profile__moderation-state--${displayedModerationTone}`}>
                                {displayedModerationLabel}
                            </div>
                        </div>
                    </div>
                </div>
            ) : isEditingCompanyData ? (
                <div className="employer-profile__edit">
                    <div className="employer-profile__edit-header">
                        <h2>Реквизиты компании</h2>

                        <button
                            type="button"
                            className="employer-profile__edit-close"
                            onClick={() => setIsEditingCompanyData(false)}
                            aria-label="Закрыть форму редактирования"
                        >
                            ×
                        </button>
                    </div>

                    <p className="employer-profile__section-hint">
                        Здесь хранятся юридическое название и ИНН. После сохранения реквизитов откроется шаг
                        верификации компании, где можно выбрать способ подтверждения: по ИНН, корпоративной почте
                        или профессиональным ссылкам. Название компании для карточки редактируется в публичном профиле.
                    </p>

                    {isVerificationFlowLocked && (
                        <p className="employer-profile__section-hint">
                            По компании уже идёт активная проверка. Дождитесь её завершения, чтобы обновить
                            реквизиты и отправить новую заявку на верификацию.
                        </p>
                    )}

                    <div className="employer-profile__edit-field">
                        <Label>Юридическое название <span className="required-star">*</span></Label>
                        <Input
                            value={profile.legalName || ''}
                            onChange={(e) => setProfile((prev) => ({ ...prev, legalName: e.target.value }))}
                        />
                        {errors.legalName && <p className="field-error">{errors.legalName}</p>}
                    </div>

                    <div className="employer-profile__edit-field">
                        <Label>ИНН <span className="required-star">*</span></Label>
                        <Input
                            value={profile.inn || ''}
                            maxLength={12}
                            onChange={(e) =>
                                setProfile((prev) => ({
                                    ...prev,
                                    inn: e.target.value.replace(/[^\d]/g, '').slice(0, 12),
                                }))
                            }
                        />
                        {errors.inn && <p className="field-error">{errors.inn}</p>}
                    </div>

                    <div className="employer-profile__edit-actions">
                        <Button
                            className="button--primary"
                            onClick={onHandleSaveCompanyData}
                            disabled={isLoading || isVerificationFlowLocked}
                        >
                            {isLoading ? 'Сохранение...' : 'Сохранить и продолжить верификацию'}
                        </Button>
                        <Button className="button--ghost" onClick={() => setIsEditingCompanyData(false)}>
                            Отменить
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="employer-profile__edit">
                    <div className="employer-profile__edit-header">
                        <h2>Публичный профиль компании</h2>

                        <button
                            type="button"
                            className="employer-profile__edit-close"
                            onClick={() => setIsEditingProfile(false)}
                            aria-label="Закрыть форму редактирования"
                        >
                            ×
                        </button>
                    </div>

                    <p className="employer-profile__section-hint">
                        {['DRAFT', 'NEEDS_REVISION'].includes(moderationState)
                            ? 'Сохранение обновляет черновик профиля. Когда всё будет готово, отправьте публичный профиль на модерацию отдельной кнопкой.'
                            : 'После сохранения изменения профиля будут автоматически отправлены на модерацию.'}
                    </p>

                    <div className="employer-profile__edit-section employer-profile__edit-section--accent">
                        <div className="employer-profile__edit-section-header">
                            <h3 className="employer-profile__edit-section-title">Брендинг</h3>
                            <p className="employer-profile__edit-section-text">
                                Загрузите логотип, который будет отображаться в публичном профиле компании.
                            </p>
                        </div>

                        <div className="employer-profile__logo-manager">
                            <div className="employer-profile__logo-manager-card">
                                <div className="employer-profile__logo-manager-preview">
                                    {currentLogoUrl ? (
                                        <img
                                            src={currentLogoUrl}
                                            alt={profile.companyName || 'Логотип компании'}
                                            className="employer-profile__logo-image"
                                        />
                                    ) : (
                                        <div className="employer-profile__logo-placeholder">
                                            {(profile.companyName?.trim()?.[0] || 'C').toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div className="employer-profile__logo-manager-body">
                                    <div className="employer-profile__logo-manager-actions">
                                        <Button
                                            className="button--outline"
                                            onClick={() => logoInputRef.current?.click()}
                                            disabled={isLogoUploading}
                                        >
                                            {isLogoUploading
                                                ? 'Загрузка...'
                                                : profile.logo
                                                    ? 'Заменить логотип'
                                                    : 'Загрузить логотип'}
                                        </Button>

                                        {profile.logo && (
                                            <Button
                                                className="button--ghost employer-profile__danger-button"
                                                onClick={onHandleDeleteLogo}
                                                disabled={isLogoUploading}
                                            >
                                                Удалить
                                            </Button>
                                        )}
                                    </div>

                                    <p className="employer-profile__upload-hint">
                                        Поддерживаются форматы: JPG, PNG, WEBP.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="employer-profile__edit-section">
                        <div className="employer-profile__edit-section-header">
                            <h3 className="employer-profile__edit-section-title">Основная информация</h3>
                            <p className="employer-profile__edit-section-text">
                                Эти данные увидят соискатели в карточке и в публичном профиле компании.
                            </p>
                        </div>

                        <div className="employer-profile__edit-field">
                            <Label>Название компании <span className="required-star">*</span></Label>
                            <Input
                                value={profile.companyName}
                                onChange={(e) =>
                                    setProfile((prev) => ({
                                        ...prev,
                                        companyName: e.target.value,
                                    }))
                                }
                                placeholder="Как компания будет отображаться на платформе"
                            />
                            {errors.companyName && <p className="field-error">{errors.companyName}</p>}
                        </div>

                        <div className="employer-profile__edit-grid">
                            <div className="employer-profile__edit-field">
                                <Label>Сфера деятельности <span className="required-star">*</span></Label>
                                <Input
                                    value={profile.industry}
                                    onChange={(e) =>
                                        setProfile((prev) => ({
                                            ...prev,
                                            industry: e.target.value,
                                        }))
                                    }
                                />
                                {errors.industry && <p className="field-error">{errors.industry}</p>}
                            </div>

                            <div className="employer-profile__edit-field">
                                <Label>Сайт компании</Label>
                                <Input
                                    value={profile.websiteUrl}
                                    onChange={(e) =>
                                        setProfile((prev) => ({
                                            ...prev,
                                            websiteUrl: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>
                    </div>

                    <EmployerLocationsSection
                        profile={profile}
                        employerLocations={employerLocations}
                        selectedEmployerLocation={selectedEmployerLocation}
                        errors={errors}
                        onChangeProfile={setProfile}
                        onOpenCreateLocation={onOpenCreateLocation}
                        onOpenEditLocation={onOpenEditLocation}
                        onDeleteLocation={onDeleteLocation}
                    />

                    <div className="employer-profile__edit-section">
                        <div className="employer-profile__edit-section-header">
                            <h3 className="employer-profile__edit-section-title">Параметры компании</h3>
                            <p className="employer-profile__edit-section-text">
                                Укажите размер компании и дополнительные сведения для карточки работодателя.
                            </p>
                        </div>

                        <div className="employer-profile__edit-grid">
                            <CustomSelect
                                label="Размер компании"
                                value={profile.companySize}
                                onChange={(val) => setProfile((prev) => ({ ...prev, companySize: val }))}
                                options={COMPANY_SIZE_OPTIONS}
                            />
                        </div>

                        <div className="employer-profile__edit-field">
                            <Label>Год основания</Label>
                            <Input
                                value={profile.foundedYear || ''}
                                onChange={(e) =>
                                    setProfile((prev) => ({
                                        ...prev,
                                        foundedYear: e.target.value.replace(/[^\d]/g, '').slice(0, 4),
                                    }))
                                }
                            />
                        </div>
                    </div>

                    <div className="employer-profile__edit-section">
                        <div className="employer-profile__edit-section-header">
                            <h3 className="employer-profile__edit-section-title">Описание и публичные каналы</h3>
                            <p className="employer-profile__edit-section-text">
                                Добавьте описание, ссылки на сайт и способы связи, чтобы профиль выглядел завершённым
                                и вызывал доверие.
                            </p>
                        </div>

                        <div className="employer-profile__edit-field">
                            <Label>Описание компании</Label>
                            <Textarea
                                rows={4}
                                value={profile.description}
                                onChange={(e) =>
                                    setProfile((prev) => ({
                                        ...prev,
                                        description: e.target.value,
                                    }))
                                }
                            />
                        </div>

                        <div className="employer-profile__edit-stack">
                            <LinksEditor
                                label="Социальные сети"
                                rows={socialRows}
                                setRows={setSocialRows}
                                placeholderTitle="Название"
                                placeholderUrl="https://..."
                            />

                            <div className="employer-profile__contacts-block">
                                <LinksEditor
                                    label="Контакты для связи"
                                    rows={contactRows}
                                    setRows={setContactRows}
                                    placeholderTitle="Тип контакта"
                                    placeholderUrl="mailto: / tel: / https://..."
                                />
                            </div>

                            {errors.publicContacts && <p className="field-error">{errors.publicContacts}</p>}
                        </div>
                    </div>

                    <div className="employer-profile__edit-actions">
                        <Button className="button--primary" onClick={onHandleSaveProfile} disabled={isLoading}>
                            {isLoading ? 'Сохранение...' : 'Сохранить'}
                        </Button>
                        <Button className="button--ghost" onClick={() => setIsEditingProfile(false)}>
                            Отменить
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EmployerProfileSection