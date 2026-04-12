import Input from '@/components/Input'
import Label from '@/components/Label'
import Button from '@/components/Button'
function EmployerLocationModal({
                                   isOpen,
                                   locationMode,
                                   isLocationSaving,
                                   locationForm,
                                   locationErrors,
                                   locationCitySearchRef,
                                   addressSearchRef,
                                   locationCitySearchQuery,
                                   locationCitySuggestions,
                                   isLocationCitySearchOpen,
                                   addressSearchQuery,
                                   addressSuggestions,
                                   isAddressSearchOpen,
                                   onClose,
                                   onSave,
                                   onChangeLocationForm,
                                   onLocationCitySearch,
                                   onSelectLocationCity,
                                   onAddressSuggest,
                                   onSelectAddressSuggestion,
                               }) {
    if (!isOpen) return null

    return (
        <div className="modal-overlay" onClick={() => !isLocationSaving && onClose()}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>{locationMode === 'edit' ? 'Редактирование локации' : 'Новая локация компании'}</h3>
                <p className="field-hint">
                    Укажите офис компании. Эта локация будет принадлежать текущему работодателю и станет доступна
                    для выбора в профиле и в вакансиях.
                </p>

                <div className="modal__field">
                    <Label>Название локации</Label>
                    <Input
                        value={locationForm.title}
                        onChange={(e) => onChangeLocationForm((prev) => ({ ...prev, title: e.target.value }))}
                        placeholder="Например, Главный офис"
                    />
                </div>

                <div className="modal__field" ref={locationCitySearchRef}>
                    <Label>Город <span className="required-star">*</span></Label>
                    <div className="autocomplete">
                        <Input
                            value={locationCitySearchQuery}
                            onChange={(e) => onLocationCitySearch(e.target.value)}
                            onFocus={() =>
                                locationCitySearchQuery.length >= 2 &&
                                locationCitySuggestions.length > 0 &&
                                onChangeLocationForm((prev) => prev)
                            }
                            placeholder="Начните вводить город"
                        />
                        {isLocationCitySearchOpen && locationCitySuggestions.length > 0 && (
                            <div className="autocomplete__list" role="listbox">
                                {locationCitySuggestions.map((city) => (
                                    <button
                                        key={city.id}
                                        type="button"
                                        className="autocomplete__item"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onSelectLocationCity(city)}
                                    >
                                        {city.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {locationErrors.cityId && <p className="field-error">{locationErrors.cityId}</p>}
                </div>

                <div className="modal__field" ref={addressSearchRef}>
                    <Label>Адрес <span className="required-star">*</span></Label>
                    <div className="autocomplete">
                        <Input
                            value={addressSearchQuery}
                            onChange={(e) => onAddressSuggest(e.target.value)}
                            placeholder="Начните вводить адрес"
                        />
                        {isAddressSearchOpen && addressSuggestions.length > 0 && (
                            <div className="autocomplete__list" role="listbox">
                                {addressSuggestions.map((item, index) => (
                                    <button
                                        key={`${item.unrestrictedValue}-${index}`}
                                        type="button"
                                        className="autocomplete__item"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => onSelectAddressSuggestion(item)}
                                    >
                                        {item.value || item.addressLine}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    {locationErrors.addressLine && <p className="field-error">{locationErrors.addressLine}</p>}
                </div>

                <div className="modal__field">
                    <Label>Дополнение к адресу</Label>
                    <Input
                        value={locationForm.addressLine2}
                        onChange={(e) => onChangeLocationForm((prev) => ({ ...prev, addressLine2: e.target.value }))}
                        placeholder="Офис, этаж, помещение"
                    />
                </div>

                <div className="modal__field">
                    <Label>Почтовый индекс</Label>
                    <Input
                        value={locationForm.postalCode}
                        onChange={(e) => onChangeLocationForm((prev) => ({ ...prev, postalCode: e.target.value }))}
                        placeholder="123456"
                    />
                </div>

                <div className="modal__actions">
                    <Button className="button--primary" onClick={onSave} disabled={isLocationSaving}>
                        {isLocationSaving
                            ? 'Сохранение...'
                            : locationMode === 'edit'
                                ? 'Сохранить локацию'
                                : 'Создать локацию'}
                    </Button>
                    <Button className="button--ghost" onClick={onClose} disabled={isLocationSaving}>
                        Отмена
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default EmployerLocationModal