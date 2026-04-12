import Button from '@/components/Button'
import Input from '@/components/Input'
import Label from '@/components/Label'
import Textarea from '@/components/Textarea'
import CustomSelect from '@/components/CustomSelect'
import LinksEditor from '@/components/LinksEditor'

import { VERIFICATION_METHODS } from './employerDashboard.constants'

function EmployerVerificationModal({
                                       isOpen,
                                       verificationData,
                                       setVerificationData,
                                       verificationLinkRows,
                                       setVerificationLinkRows,
                                       onSubmit,
                                       onClose,
                                   }) {
    if (!isOpen) return null

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Верификация компании</h3>
                <p className="field-hint">
                    Подтвердите статус компании, чтобы получить доступ к публикации вакансий и мероприятий.
                </p>

                <div className="modal__field">
                    <Label>Способ верификации</Label>
                    <CustomSelect
                        value={verificationData.verificationMethod}
                        onChange={(val) => setVerificationData((prev) => ({ ...prev, verificationMethod: val }))}
                        options={VERIFICATION_METHODS}
                    />
                </div>

                {verificationData.verificationMethod === 'CORPORATE_EMAIL' && (
                    <div className="modal__field">
                        <Label>Корпоративная почта</Label>
                        <Input
                            value={verificationData.corporateEmail}
                            onChange={(e) => setVerificationData((prev) => ({ ...prev, corporateEmail: e.target.value }))}
                            placeholder="name@company.com"
                        />
                    </div>
                )}

                {verificationData.verificationMethod === 'TIN' && (
                    <div className="modal__field">
                        <Label>ИНН</Label>
                        <Input
                            value={verificationData.inn}
                            maxLength={12}
                            onChange={(e) => setVerificationData((prev) => ({
                                ...prev,
                                inn: e.target.value.replace(/[^\d]/g, '').slice(0, 12),
                            }))}
                            placeholder="1234567890"
                        />
                        <p className="field-hint">
                            Для проверки будет использован ИНН из реквизитов компании. Перед отправкой он сохранится в профиле.
                        </p>
                    </div>
                )}

                {verificationData.verificationMethod === 'PROFESSIONAL_LINKS' && (
                    <LinksEditor
                        label="Профессиональные ссылки"
                        rows={verificationLinkRows}
                        setRows={setVerificationLinkRows}
                        placeholderTitle="Площадка"
                        placeholderUrl="https://..."
                    />
                )}

                <div className="modal__field">
                    <Label>Комментарий</Label>
                    <Textarea
                        rows={3}
                        value={verificationData.submittedComment}
                        onChange={(e) => setVerificationData((prev) => ({ ...prev, submittedComment: e.target.value }))}
                        placeholder="Опишите, что прикладываете для верификации"
                    />
                </div>

                <div className="modal__actions">
                    <Button className="button--primary" onClick={onSubmit}>
                        Отправить
                    </Button>
                    <Button className="button--ghost" onClick={onClose}>
                        Отмена
                    </Button>
                </div>
            </div>
        </div>
    )
}

export default EmployerVerificationModal