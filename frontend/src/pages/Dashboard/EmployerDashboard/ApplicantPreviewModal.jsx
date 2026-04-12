import Button from '@/components/Button'
import Label from '@/components/Label'
function ApplicantPreviewModal({
                                   isOpen,
                                   selectedApplicant,
                                   onClose,
                               }) {
    if (!isOpen || !selectedApplicant) return null

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <h3>Профиль кандидата</h3>

                <div className="employer-profile__grid">
                    <div className="employer-profile__field">
                        <Label>Имя</Label>
                        <div className="field-value">{selectedApplicant.fullName || selectedApplicant.displayName || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Вуз</Label>
                        <div className="field-value">{selectedApplicant.universityName || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Курс</Label>
                        <div className="field-value">{selectedApplicant.course || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Год выпуска</Label>
                        <div className="field-value">{selectedApplicant.graduationYear || '—'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Открыт к работе</Label>
                        <div className="field-value">{selectedApplicant.openToWork ? 'Да' : 'Нет'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Открыт к мероприятиям</Label>
                        <div className="field-value">{selectedApplicant.openToEvents ? 'Да' : 'Нет'}</div>
                    </div>
                    <div className="employer-profile__field">
                        <Label>Навыки</Label>
                        <div className="field-value">
                            {selectedApplicant.skills?.length > 0
                                ? selectedApplicant.skills.join(', ')
                                : '—'}
                        </div>
                    </div>
                </div>

                <div className="modal__actions">
                    <Button className="button--ghost" onClick={onClose}>
                        Закрыть
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default ApplicantPreviewModal