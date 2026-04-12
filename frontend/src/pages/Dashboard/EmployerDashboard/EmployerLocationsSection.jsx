import Button from '@/components/Button'
import CustomSelect from '@/components/CustomSelect'
import Label from '@/components/Label'

import { getLocationLabel } from './employerDashboard.helpers'

function EmployerLocationsSection({
                                      profile,
                                      employerLocations,
                                      selectedEmployerLocation,
                                      errors,
                                      onChangeProfile,
                                      onOpenCreateLocation,
                                      onOpenEditLocation,
                                      onDeleteLocation,
                                  }) {
    return (
        <div className="employer-profile__edit-section">
            <div className="employer-profile__edit-section-header">
                <h3 className="employer-profile__edit-section-title">Локации компании</h3>
                <p className="employer-profile__edit-section-text">
                    Создавайте офисы компании, редактируйте их и выбирайте основную локацию,
                    которая будет отображаться в профиле работодателя.
                </p>
            </div>

            <div className="employer-profile__edit-grid">
                <div className="employer-profile__edit-field">
                    <Label>Основная локация профиля <span className="required-star">*</span></Label>
                    <CustomSelect
                        value={profile.locationId ? String(profile.locationId) : ''}
                        onChange={(val) => {
                            const nextLocation =
                                employerLocations.find((item) => String(item.id) === String(val)) || null

                            onChangeProfile((prev) => ({
                                ...prev,
                                locationId: nextLocation?.id ?? null,
                                locationPreview: nextLocation || null,
                                cityId: nextLocation?.cityId ?? null,
                                cityName: nextLocation?.cityName || nextLocation?.city?.name || '',
                            }))
                        }}
                        options={[
                            {
                                value: '',
                                label: employerLocations.length > 0 ? 'Выберите локацию' : 'Нет созданных локаций',
                            },
                            ...employerLocations.map((location) => ({
                                value: String(location.id),
                                label: getLocationLabel(location),
                            })),
                        ]}
                    />
                    {errors.locationId && <p className="field-error">{errors.locationId}</p>}
                </div>

                <div className="employer-profile__edit-field">
                    <Label>Действия с локацией</Label>
                    <div className="employer-profile__location-actions">
                        <Button className="button--outline" onClick={onOpenCreateLocation}>
                            Добавить локацию
                        </Button>

                        {selectedEmployerLocation && (
                            <>
                                <Button
                                    className="button--ghost"
                                    onClick={() => onOpenEditLocation(selectedEmployerLocation)}
                                >
                                    Редактировать
                                </Button>

                                <Button
                                    className="button--ghost employer-profile__danger-button"
                                    onClick={() => onDeleteLocation(selectedEmployerLocation.id)}
                                >
                                    Удалить
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {selectedEmployerLocation && (
                <div className="employer-profile__field employer-profile__field--wide">
                    <Label>Выбранная локация</Label>
                    <div className="field-value">
                        {getLocationLabel(selectedEmployerLocation)}
                        {selectedEmployerLocation.addressLine2 ? `, ${selectedEmployerLocation.addressLine2}` : ''}
                        {selectedEmployerLocation.postalCode ? `, ${selectedEmployerLocation.postalCode}` : ''}
                    </div>
                </div>
            )}

            {employerLocations.length > 0 && (
                <div className="employer-profile__field employer-profile__field--wide">
                    <Label>Все офисы компании</Label>
                    <div className="field-value">
                        <div className="links-list">
                            {employerLocations.map((location) => (
                                <div key={location.id} className="link-item">
                                    <span>{getLocationLabel(location)}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EmployerLocationsSection