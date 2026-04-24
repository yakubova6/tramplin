import Input from '@/shared/ui/Input'
import CustomSelect from '@/shared/ui/CustomSelect'
import OpportunityStatusManager from '../components/OpportunityStatusManager'

import { OPPORTUNITY_LABELS } from '@/shared/api/opportunities'
import { formatDate } from '../lib/employerDashboard.helpers'

import linkIcon from '@/assets/icons/link.svg'

function EmployerOpportunitiesSection({
                                          isVerified,
                                          opportunitySearchTerm,
                                          setOpportunitySearchTerm,
                                          opportunityFilterStatus,
                                          setOpportunityFilterStatus,
                                          filteredOpportunities,
                                          expandedOpportunityId,
                                          onToggleOpportunityDetails,
                                          opportunityDetailsById,
                                          onStartEditOpportunity,
                                          onUpdateOpportunityStatus,
                                          onDeleteOpportunity,
                                          employerLocations,
                                      onRefreshOpportunities,
                                      }) {

    const getOpportunityLocation = (opp) => {
        if (opp.locationPreview || opp.location) {
            return opp.locationPreview || opp.location
        }

        if (!opp.locationId) return null

        return employerLocations.find((item) => Number(item.id) === Number(opp.locationId)) || null
    }

    const getOpportunityOfficeLabel = (opp) => {
        const location = getOpportunityLocation(opp)
        if (!location) return ''

        return location.title || location.addressLine || ''
    }

    const getOpportunityCityLabel = (opp) => {
        const location = getOpportunityLocation(opp)

        if (location?.cityName) return location.cityName
        if (location?.city?.name) return location.city.name
        if (opp.cityName) return opp.cityName
        if (opp.city?.name) return opp.city.name

        return ''
    }

    return (
        <div className="employer-opportunities">
            <div className="employer-opportunities__header">
                <h2>Мои публикации</h2>
                <div className="employer-opportunities__filters">
                    <Input
                        value={opportunitySearchTerm}
                        onChange={(e) => setOpportunitySearchTerm(e.target.value)}
                        placeholder="Поиск по названию..."
                    />
                    <CustomSelect
                        value={opportunityFilterStatus}
                        onChange={setOpportunityFilterStatus}
                        options={[
                            { value: 'all', label: 'Все' },
                            { value: 'active', label: 'Активные' },
                            { value: 'planned', label: 'Запланированные' },
                            { value: 'draft', label: 'Черновики' },
                            { value: 'closed', label: 'Закрытые' },
                            { value: 'archived', label: 'Архив' },
                        ]}
                    />
                </div>
            </div>

            {filteredOpportunities.length === 0 ? (
                <p className="employer-empty">
                    {isVerified ? 'Пока нет публикаций' : 'После верификации вы сможете публиковать вакансии и мероприятия'}
                </p>
            ) : (
                <div className="employer-opportunities__list">
                    {filteredOpportunities.map((opp) => {
                        const detailedOpportunity = opportunityDetailsById?.[opp.id] || opp
                        const normalizedStatus = String(opp.status || '').toUpperCase()
                        const canClose = ['PUBLISHED', 'PLANNED'].includes(normalizedStatus)
                        const canReturnToDraft = ['PUBLISHED', 'REJECTED', 'CLOSED', 'PLANNED'].includes(normalizedStatus)
                        const canRestoreFromArchive = normalizedStatus === 'ARCHIVED'
                        const canArchive = normalizedStatus !== 'ARCHIVED'
                        const requirementsText = String(detailedOpportunity.requirements || '').trim()
                        const descriptionText = String(
                            detailedOpportunity.fullDescription || detailedOpportunity.shortDescription || ''
                        ).trim()
                        const isOfficeBasedWorkFormat = ['OFFICE', 'HYBRID'].includes(detailedOpportunity.workFormat)
                        const cityLabel = getOpportunityCityLabel(detailedOpportunity)
                        const officeLabel = getOpportunityOfficeLabel(detailedOpportunity)

                        return (
                        <div key={`${opp.id}-${opp.status}`} className="employer-opportunities__item">
                            <div className="employer-opportunities__info">
                                <h3>{opp.title}</h3>
                                <p className="employer-opportunities__type">
                                    {OPPORTUNITY_LABELS.type[opp.type] || opp.type} • {OPPORTUNITY_LABELS.workFormat[opp.workFormat] || opp.workFormat}
                                </p>
                                <p className="employer-opportunities__description">{opp.shortDescription}</p>
                                <div className="employer-opportunities__skills">
                                    {opp.tags?.map((tag) => (
                                        <span key={tag.id} className="skill-tag">
                                            #{tag.name}
                                        </span>
                                    ))}
                                </div>
                            </div>

                            <div className="employer-opportunities__meta">
                                <OpportunityStatusManager
                                    opportunity={opp}
                                    onStatusChange={onRefreshOpportunities}
                                    onReturnToDraft={(id) => onUpdateOpportunityStatus(id, 'draft', 'Публикация возвращена в черновик')}
                                />

                                <span className="employer-opportunities__date">
                                    Обновлено: {formatDate(opp.updatedAt || opp.createdAt)}
                                </span>

                                <div className="employer-opportunities__actions">
                                    <button
                                        className="employer-opportunities__view"
                                        onClick={() => onToggleOpportunityDetails?.(opp.id)}
                                    >
                                        {expandedOpportunityId === opp.id ? 'Скрыть' : 'Подробнее'}
                                    </button>

                                    <button
                                        className="employer-opportunities__view"
                                        onClick={() => onStartEditOpportunity(opp.id)}
                                    >
                                        Редактировать
                                    </button>

                                    {canClose && (
                                        <button
                                            className="employer-opportunities__view"
                                            onClick={() => onUpdateOpportunityStatus(opp.id, 'close', 'Публикация закрыта')}
                                        >
                                            Закрыть
                                        </button>
                                    )}

                                    {canReturnToDraft && (
                                        <button
                                            className="employer-opportunities__view"
                                            onClick={() => onUpdateOpportunityStatus(opp.id, 'draft', 'Публикация возвращена в черновик')}
                                        >
                                            В черновик
                                        </button>
                                    )}

                                    {canRestoreFromArchive && (
                                        <button
                                            className="employer-opportunities__view"
                                            onClick={() => onUpdateOpportunityStatus(opp.id, 'draft', 'Публикация восстановлена из архива в черновик')}
                                        >
                                            Из архива в черновик
                                        </button>
                                    )}

                                    {canArchive && (
                                        <button
                                            className="employer-opportunities__delete"
                                            onClick={() => onDeleteOpportunity(opp.id, opp.title)}
                                        >
                                            В архив
                                        </button>
                                    )}
                                </div>

                                {expandedOpportunityId === opp.id && (
                                    <div className="employer-opportunities__details">
                                        <h4>Подробности</h4>
                                        {requirementsText && (
                                            <p><strong>Требования:</strong> {requirementsText}</p>
                                        )}
                                        {descriptionText && (
                                            <p><strong>Описание:</strong> {descriptionText}</p>
                                        )}
                                        <p>
                                            <strong>Уровень:</strong> {OPPORTUNITY_LABELS.grade[detailedOpportunity.grade] || detailedOpportunity.grade || '—'}
                                        </p>
                                        <p>
                                            <strong>Занятость:</strong> {OPPORTUNITY_LABELS.employmentType[detailedOpportunity.employmentType] || detailedOpportunity.employmentType || '—'}
                                        </p>
                                        {isOfficeBasedWorkFormat && cityLabel && (
                                            <p><strong>Город:</strong> {cityLabel}</p>
                                        )}
                                        {isOfficeBasedWorkFormat && officeLabel && (
                                            <p><strong>Офис:</strong> {officeLabel}</p>
                                        )}
                                        {detailedOpportunity.type === 'EVENT' && (
                                            <p>
                                                <strong>Дата мероприятия:</strong> {formatDate(detailedOpportunity.eventDate)}
                                            </p>
                                        )}
                                        {detailedOpportunity.type !== 'EVENT' && detailedOpportunity.expiresAt && (
                                            <p><strong>Срок действия:</strong> {formatDate(detailedOpportunity.expiresAt)}</p>
                                        )}

                                        {detailedOpportunity.resourceLinks?.length > 0 && (
                                            <div className="links-list">
                                                {detailedOpportunity.resourceLinks.map((item, index) => (
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
                                        )}

                                        {detailedOpportunity.media && detailedOpportunity.media.length > 0 && (
                                            <div className="media-preview">
                                                <div className="media-preview__title">
                                                    <strong>Медиафайлы:</strong>
                                                </div>
                                                <div className="media-preview__list">
                                                    {detailedOpportunity.media.slice(0, 3).map((item) => (
                                                        <div key={item.attachmentId} className="media-preview__item">
                                                            {item.mediaType?.startsWith('image/') ? (
                                                                <img src={item.downloadUrl} alt={item.originalFileName} />
                                                            ) : (
                                                                <span>Файл {item.originalFileName}</span>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {detailedOpportunity.media.length > 3 && (
                                                        <span>+ ещё {detailedOpportunity.media.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )})}
                </div>
            )}
        </div>
    )
}

export default EmployerOpportunitiesSection
