import Input from '@/shared/ui/Input'
import CustomSelect from '@/shared/ui/CustomSelect'
import Button from '@/shared/ui/Button'

import {
    APPLICATION_STATUSES,
    APPLICATION_SORT_OPTIONS,
} from '../lib/employerDashboard.constants'
import { getStatusLabelRu } from '@/shared/lib/utils/statusLabels'

function EmployerApplicantsSection({
                                       responseFilters,
                                       setResponseFilters,
                                       responsesPage,
                                       onLoadEmployerResponsesData,
                                       onUpdateApplicationStatus,
                                       onOpenApplicant,
                                   }) {
    return (
        <div className="employer-applicants">
            <div className="employer-opportunities__header">
                <h2>Отклики</h2>
                <div className="employer-opportunities__filters">
                    <Input
                        value={responseFilters.search}
                        onChange={(e) => setResponseFilters((prev) => ({ ...prev, search: e.target.value }))}
                        placeholder="Поиск по кандидату или вакансии"
                    />
                    <CustomSelect
                        value={responseFilters.status}
                        onChange={(val) => setResponseFilters((prev) => ({ ...prev, status: val }))}
                        options={APPLICATION_STATUSES}
                    />
                    <CustomSelect
                        value={responseFilters.sortDirection}
                        onChange={(val) => setResponseFilters((prev) => ({ ...prev, sortDirection: val }))}
                        options={APPLICATION_SORT_OPTIONS}
                    />
                    <Button className="button--primary" onClick={onLoadEmployerResponsesData}>
                        Применить
                    </Button>
                </div>
            </div>

            {responsesPage.items.length === 0 ? (
                <p className="employer-empty">Пока нет откликов</p>
            ) : (
                <div className="employer-applicants__list">
                    {responsesPage.items.map((app) => (
                        <div key={app.id} className="employer-applicants__item">
                            <div className="employer-applicants__info">
                                <h3>{app.applicant?.fullName || app.applicant?.displayName || 'Соискатель'}</h3>
                                <p className="employer-applicants__position">На публикацию: {app.opportunityTitle}</p>
                                <p className="employer-applicants__message">
                                    {app.coverLetter || app.applicantComment || 'Комментарий не указан'}
                                </p>

                                <div className="employer-applicants__skills">
                                    {app.applicant?.skills?.map((skill, index) => (
                                        <span key={`${skill}-${index}`} className="skill-tag">{skill}</span>
                                    ))}
                                </div>

                                <div className="employer-applicants__meta">
                                    <span>Вуз: {app.applicant?.universityName || '—'}</span>
                                    <span>Курс: {app.applicant?.course || '—'}</span>
                                    <span>Год выпуска: {app.applicant?.graduationYear || '—'}</span>
                                </div>
                            </div>

                            <div className="employer-applicants__actions">
                                <span className={`status-badge status-${app.status?.toLowerCase?.() || 'default'}`}>
                                    {APPLICATION_STATUSES.find((item) => item.value === app.status)?.label || getStatusLabelRu(app.status)}
                                </span>

                                <div className="employer-applicants__buttons">
                                    <button className="btn-approve" onClick={() => onUpdateApplicationStatus(app.id, 'ACCEPTED')}>
                                        Принять
                                    </button>
                                    <button className="btn-reject" onClick={() => onUpdateApplicationStatus(app.id, 'REJECTED')}>
                                        Отклонить
                                    </button>
                                    <button className="btn-reserve" onClick={() => onUpdateApplicationStatus(app.id, 'RESERVE')}>
                                        В резерв
                                    </button>
                                </div>

                                <button className="employer-opportunities__view" onClick={() => onOpenApplicant(app.applicant)}>
                                    Профиль кандидата
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default EmployerApplicantsSection
