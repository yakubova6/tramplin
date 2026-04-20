import Button from '@/components/Button'
import Input from '@/components/Input'
import Label from '@/components/Label'
import Textarea from '@/components/Textarea'
import CustomSelect from '@/components/CustomSelect'
import LinksEditor from '@/components/LinksEditor'
import MediaGallery from './MediaGallery'

import {
    OPPORTUNITY_TYPES,
    WORK_FORMATS,
    EXPERIENCE_LEVELS,
    EMPLOYMENT_TYPES,
} from './employerDashboard.constants'

function EmployerOpportunityForm({
                                     isVerified,
                                     verificationState,
                                     isLoading,
                                     opportunityMode,
                                     opportunityForm,
                                     errors,
                                     techTags,
                                     employerLocations,
                                     resourceRows,
                                     setResourceRows,
                                     onResetOpportunityForm,
                                     onSaveOpportunity,
                                     onChangeOpportunityForm,
                                     media,
                                     mediaOpportunityId,
                                     onMediaUpdate,
                                 }) {
    const isOfficeBasedWorkFormat = ['OFFICE', 'HYBRID'].includes(opportunityForm.workFormat)
    const isVerificationPending = verificationState === 'PENDING'
    const isVerificationRejected = verificationState === 'REJECTED'
    const isVerificationApproved = verificationState === 'APPROVED'

    return (
        <div className="employer-create-form">
            <div className="employer-create-form__header">
                <h2>{opportunityMode === 'edit' ? 'Редактирование публикации' : 'Новая публикация'}</h2>
                {opportunityMode === 'edit' && (
                    <Button className="button--ghost" onClick={onResetOpportunityForm}>
                        Отменить редактирование
                    </Button>
                )}
            </div>

            {!isVerificationApproved && (
                <p className="field-hint">
                    Создание и редактирование публикаций доступно после верификации компании.
                </p>
            )}

            {isVerificationPending && (
                <p className="field-hint field-hint--warning">
                    Верификация компании на проверке. Публикация новых карточек временно ограничена.
                </p>
            )}

            {isVerificationRejected && (
                <p className="field-hint field-hint--error">
                    Верификация компании отклонена. Для публикации новых карточек отправьте заявку повторно.
                </p>
            )}

            <div className="employer-create-form__field">
                <Label>Название <span className="required-star">*</span></Label>
                <Input
                    value={opportunityForm.title}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Например, Junior Java Developer"
                />
                {errors.title && <p className="field-error">{errors.title}</p>}
            </div>

            <div className="employer-create-form__grid-2">
                <CustomSelect
                    label="Тип"
                    value={opportunityForm.type}
                    onChange={(val) => onChangeOpportunityForm((prev) => ({ ...prev, type: val }))}
                    options={OPPORTUNITY_TYPES}
                />
                <CustomSelect
                    label="Формат"
                    value={opportunityForm.workFormat}
                    onChange={(val) =>
                        onChangeOpportunityForm((prev) => {
                            const isOfficeBased = ['OFFICE', 'HYBRID'].includes(val)

                            return {
                                ...prev,
                                workFormat: val,
                                locationId: isOfficeBased ? prev.locationId : null,
                                cityId: isOfficeBased ? prev.cityId : null,
                                cityName: isOfficeBased ? prev.cityName : '',
                            }
                        })
                    }
                    options={WORK_FORMATS}
                />
            </div>

            <div className="employer-create-form__grid-2">
                <div className={!isOfficeBasedWorkFormat ? 'select-disabled' : ''}>
                    <CustomSelect
                        label="Офис"
                        value={opportunityForm.locationId ? String(opportunityForm.locationId) : ''}
                        onChange={(val) => {
                            if (!isOfficeBasedWorkFormat) return

                            const selectedLocation =
                                employerLocations.find((item) => String(item.id) === String(val)) || null

                            onChangeOpportunityForm((prev) => ({
                                ...prev,
                                locationId: selectedLocation?.id ?? null,
                                cityId: selectedLocation?.cityId ?? null,
                                cityName: selectedLocation?.cityName || selectedLocation?.city?.name || '',
                            }))
                        }}
                        options={[
                            {
                                value: '',
                                label: !isOfficeBasedWorkFormat
                                    ? 'Для удаленного формата офис не требуется'
                                    : employerLocations.length
                                        ? 'Выберите офис'
                                        : 'Нет созданных офисов',
                            },
                            ...employerLocations.map((location) => ({
                                value: String(location.id),
                                label: [
                                    location.title,
                                    location.cityName || location.city?.name,
                                    location.addressLine,
                                ].filter(Boolean).join(' • '),
                            })),
                        ]}
                    />
                </div>

                <div className="employer-create-form__field">
                    <Label>Город</Label>
                    <Input
                        value={
                            isOfficeBasedWorkFormat
                                ? (opportunityForm.cityName || '—')
                                : 'Для удаленного формата город не требуется'
                        }
                        readOnly
                        className={!isOfficeBasedWorkFormat ? 'input--disabled' : ''}
                        placeholder="Будет подставлен из офиса"
                    />
                </div>
            </div>

            <div className="employer-create-form__field">
                <Label>Краткое описание <span className="required-star">*</span></Label>
                <Textarea
                    rows={3}
                    value={opportunityForm.shortDescription}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, shortDescription: e.target.value }))}
                    placeholder="Кратко: формат, аудитория, ключевая польза"
                />
                {errors.shortDescription && <p className="field-error">{errors.shortDescription}</p>}
            </div>

            <div className="employer-create-form__field">
                <Label>Полное описание</Label>
                <Textarea
                    rows={5}
                    value={opportunityForm.fullDescription}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, fullDescription: e.target.value }))}
                    placeholder="Подробности о вакансии, стажировке, мероприятии или менторской программе"
                />
            </div>

            <div className="employer-create-form__field">
                <Label>Требования</Label>
                <Textarea
                    rows={4}
                    value={opportunityForm.requirements}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, requirements: e.target.value }))}
                    placeholder="Навыки, стек, ожидания к кандидату"
                />
            </div>

            <div className="employer-create-form__grid-3">
                <CustomSelect
                    label="Уровень"
                    value={opportunityForm.grade}
                    onChange={(val) => onChangeOpportunityForm((prev) => ({ ...prev, grade: val }))}
                    options={EXPERIENCE_LEVELS}
                />
                <CustomSelect
                    label="Занятость"
                    value={opportunityForm.employmentType}
                    onChange={(val) => onChangeOpportunityForm((prev) => ({ ...prev, employmentType: val }))}
                    options={EMPLOYMENT_TYPES}
                />
                {opportunityForm.type === 'EVENT' ? (
                    <div className="employer-create-form__field">
                        <Label>Дата мероприятия <span className="required-star">*</span></Label>
                        <Input
                            type="date"
                            value={opportunityForm.eventDate}
                            onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, eventDate: e.target.value }))}
                        />
                        {errors.eventDate && <p className="field-error">{errors.eventDate}</p>}
                    </div>
                ) : (
                    <div className="employer-create-form__field">
                        <Label>Срок действия <span className="required-star">*</span></Label>
                        <Input
                            type="date"
                            value={opportunityForm.expiresAt}
                            onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, expiresAt: e.target.value }))}
                        />
                        {errors.expiresAt && <p className="field-error">{errors.expiresAt}</p>}
                    </div>
                )}
            </div>

            <div className="employer-create-form__grid-3">
                <Input
                    type="number"
                    value={opportunityForm.salaryFrom}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, salaryFrom: e.target.value }))}
                    placeholder="Зарплата от"
                />
                <Input
                    type="number"
                    value={opportunityForm.salaryTo}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, salaryTo: e.target.value }))}
                    placeholder="Зарплата до"
                />
                <Input
                    value={opportunityForm.contactEmail}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactEmail: e.target.value }))}
                    placeholder="Контактный email"
                />
            </div>

            <div className="employer-create-form__grid-3">
                <Input
                    value={opportunityForm.contactPhone}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactPhone: e.target.value }))}
                    placeholder="Телефон"
                />
                <Input
                    value={opportunityForm.contactTelegram}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactTelegram: e.target.value }))}
                    placeholder="Telegram"
                />
                <Input
                    value={opportunityForm.contactPerson}
                    onChange={(e) => onChangeOpportunityForm((prev) => ({ ...prev, contactPerson: e.target.value }))}
                    placeholder="Контактное лицо"
                />
            </div>

            <div className="employer-create-form__field">
                <Label>Теги</Label>
                <div className="employer-opportunities__skills">
                    {techTags.map((tag) => (
                        <button
                            key={tag.id}
                            type="button"
                            className={`skill-tag ${opportunityForm.tagIds.includes(tag.id) ? 'skill-tag--active' : ''}`}
                            onClick={() =>
                                onChangeOpportunityForm((prev) => ({
                                    ...prev,
                                    tagIds: prev.tagIds.includes(tag.id)
                                        ? prev.tagIds.filter((id) => id !== tag.id)
                                        : [...prev.tagIds, tag.id],
                                }))
                            }
                        >
                            #{tag.name}
                        </button>
                    ))}
                </div>
            </div>

            {opportunityMode === 'edit' && mediaOpportunityId && (
                <div className="employer-create-form__field">
                    <Label>Медиафайлы</Label>
                    <MediaGallery
                        opportunityId={mediaOpportunityId}
                        media={media || []}
                        onMediaUpdate={onMediaUpdate}
                    />
                </div>
            )}

            <LinksEditor
                label="Полезные ссылки / ресурсы"
                rows={resourceRows}
                setRows={setResourceRows}
                placeholderTitle="Название ссылки"
                placeholderUrl="https://..."
            />

            <div className="employer-create-form__actions">
                <Button className="button--primary" onClick={onSaveOpportunity} disabled={isLoading || !isVerified}>
                    {isLoading ? 'Сохранение...' : opportunityMode === 'edit' ? 'Сохранить изменения' : 'Опубликовать'}
                </Button>
                <Button className="button--ghost" onClick={onResetOpportunityForm}>
                    Очистить форму
                </Button>
            </div>
        </div>
    )
}

export default EmployerOpportunityForm