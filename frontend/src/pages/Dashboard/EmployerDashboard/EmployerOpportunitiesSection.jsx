import Input from '@/components/Input'
import CustomSelect from '@/components/CustomSelect'

import { OPPORTUNITY_LABELS } from '@/api/opportunities'
import { formatDate, statusBucket } from './employerDashboard.helpers'

import linkIcon from '@/assets/icons/link.svg'

function EmployerOpportunitiesSection({
                                          isVerified,
                                          opportunitySearchTerm,
                                          setOpportunitySearchTerm,
                                          opportunityFilterStatus,
                                          setOpportunityFilterStatus,
                                          filteredOpportunities,
                                          expandedOpportunityId,
                                          setExpandedOpportunityId,
                                          onStartEditOpportunity,
                                          onUpdateOpportunityStatus,
                                          onDeleteOpportunity,
                                          employerLocations,
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
        if (!location) return '—'

        return location.title || location.addressLine || '—'
    }

    const getOpportunityCityLabel = (opp) => {
        const location = getOpportunityLocation(opp)

        if (location?.cityName) return location.cityName
        if (location?.city?.name) return location.city.name
        if (opp.cityName) return opp.cityName
        if (opp.city?.name) return opp.city.name

        return '—'
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
                    {filteredOpportunities.map((opp) => (
                        <div key={opp.id} className="employer-opportunities__item">
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
                                <span className={`status-badge status-${opp.status?.toLowerCase?.() || 'default'}`}>
                                    {OPPORTUNITY_LABELS.status[opp.status] || opp.status}
                                </span>

                                <span className="employer-opportunities__date">
                                    Обновлено: {formatDate(opp.updatedAt || opp.createdAt)}
                                </span>

                                <div className="employer-opportunities__actions">
                                    <button
                                        className="employer-opportunities__view"
                                        onClick={() =>
                                            setExpandedOpportunityId((prev) => (prev === opp.id ? null : opp.id))
                                        }
                                    >
                                        {expandedOpportunityId === opp.id ? 'Скрыть' : 'Подробнее'}
                                    </button>

                                    <button
                                        className="employer-opportunities__view"
                                        onClick={() => onStartEditOpportunity(opp.id)}
                                    >
                                        Редактировать
                                    </button>

                                    {statusBucket(opp.status) !== 'closed' && (
                                        <button
                                            className="employer-opportunities__view"
                                            onClick={() => onUpdateOpportunityStatus(opp.id, 'close', 'Публикация закрыта')}
                                        >
                                            Закрыть
                                        </button>
                                    )}

                                    {opp.status !== 'DRAFT' && (
                                        <button
                                            className="employer-opportunities__view"
                                            onClick={() => onUpdateOpportunityStatus(opp.id, 'draft', 'Публикация возвращена в черновик')}
                                        >
                                            В черновик
                                        </button>
                                    )}

                                    <button
                                        className="employer-opportunities__delete"
                                        onClick={() => onDeleteOpportunity(opp.id, opp.title)}
                                    >
                                        Архив
                                    </button>
                                </div>

                                {expandedOpportunityId === opp.id && (
                                    <div className="employer-opportunities__details">
                                        <h4>Подробности</h4>
                                        <p><strong>Требования:</strong> {opp.requirements || '—'}</p>
                                        <p>
                                            <strong>Уровень:</strong> {OPPORTUNITY_LABELS.grade[opp.grade] || opp.grade || '—'}
                                        </p>
                                        <p>
                                            <strong>Занятость:</strong> {OPPORTUNITY_LABELS.employmentType[opp.employmentType] || opp.employmentType || '—'}
                                        </p>
                                        <p><strong>Город:</strong> {getOpportunityCityLabel(opp)}</p>
                                        <p><strong>Офис:</strong> {getOpportunityOfficeLabel(opp)}</p>
                                        <p><strong>Дата мероприятия:</strong> {formatDate(opp.eventDate)}</p>
                                        <p><strong>Срок действия:</strong> {formatDate(opp.expiresAt)}</p>

                                        {opp.resourceLinks?.length > 0 && (
                                            <div className="links-list">
                                                {opp.resourceLinks.map((item, index) => (
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
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

export default EmployerOpportunitiesSection