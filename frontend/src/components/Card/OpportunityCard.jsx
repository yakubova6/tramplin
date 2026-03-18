// src/components/Card/OpportunityCard.jsx
import React from 'react';
import { MapPin, Briefcase, Calendar, Bookmark, BookmarkCheck } from 'lucide-react';
import './OpportunityCard.scss';

const OpportunityCard = ({ opportunity, isFavorite = false, onToggleFavorite }) => {
    const {
        title,
        company,
        location,
        type,
        salary,
        tags = [],
        postedAt,
        format
    } = opportunity;

    const getTypeLabel = (type) => {
        const types = {
            internship: 'Стажировка',
            vacancy: 'Вакансия',
            mentorship: 'Менторство',
            event: 'Мероприятие'
        };
        return types[type] || type;
    };

    const getFormatIcon = (format) => {
        switch(format) {
            case 'office': return '🏢';
            case 'hybrid': return '🔄';
            case 'remote': return '🌐';
            default: return '📍';
        }
    };

    return (
        <div className="opportunity-card">
            <div className="card__header">
                <div className="card__title-section">
                    <h3 className="card__title">{title}</h3>
                    <span className="card__company">{company}</span>
                </div>
                <button
                    className={`card__favorite ${isFavorite ? 'card__favorite--active' : ''}`}
                    onClick={onToggleFavorite}
                >
                    {isFavorite ? <BookmarkCheck size={20} /> : <Bookmark size={20} />}
                </button>
            </div>

            <div className="card__tags">
                <span className="card__tag card__tag--type">{getTypeLabel(type)}</span>
                {tags.slice(0, 3).map((tag, index) => (
                    <span key={index} className="card__tag">{tag}</span>
                ))}
                {tags.length > 3 && (
                    <span className="card__tag card__tag--more">+{tags.length - 3}</span>
                )}
            </div>

            <div className="card__details">
                <div className="card__detail">
                    <MapPin size={16} />
                    <span>{location}</span>
                </div>
                <div className="card__detail">
                    <Briefcase size={16} />
                    <span>{getFormatIcon(format)} {format}</span>
                </div>
                {salary && (
                    <div className="card__detail card__detail--salary">
                        от {salary.from?.toLocaleString()} ₽
                        {salary.to && ` до ${salary.to.toLocaleString()} ₽`}
                    </div>
                )}
            </div>

            <div className="card__footer">
                <div className="card__date">
                    <Calendar size={14} />
                    <span>{new Date(postedAt).toLocaleDateString('ru-RU')}</span>
                </div>
                <button className="card__apply">Откликнуться</button>
            </div>
        </div>
    );
};

export default OpportunityCard;