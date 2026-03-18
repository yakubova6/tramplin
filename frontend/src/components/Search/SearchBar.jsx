// src/components/Search/SearchBar.jsx
import React, { useState } from 'react';
import { Search, MapPin, SlidersHorizontal, X } from 'lucide-react';
import './SearchBar.scss';

const SearchBar = () => {
    const [query, setQuery] = useState('');
    const [location, setLocation] = useState('');
    const [showFilters, setShowFilters] = useState(false);

    const clearQuery = () => setQuery('');
    const clearLocation = () => setLocation('');

    return (
        <div className="search-section">
            <div className="container">
                <div className="search-wrapper">
                    <div className="search__header">
                        <h1 className="search__title">
                            Найди стажировку или ментора
                        </h1>
                        <p className="search__subtitle">
                            Более 1000 возможностей для старта карьеры в IT
                        </p>
                    </div>

                    <div className="search__main">
                        <div className="search__bar">
                            <div className="search__input-group search__input-group--query">
                                <Search className="search__icon" size={20} />
                                <input
                                    type="text"
                                    placeholder="Должность, навыки или компания"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    className="search__input"
                                />
                                {query && (
                                    <button onClick={clearQuery} className="search__clear">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <div className="search__divider" />

                            <div className="search__input-group search__input-group--location">
                                <MapPin className="search__icon" size={20} />
                                <input
                                    type="text"
                                    placeholder="Город или метро"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    className="search__input"
                                />
                                {location && (
                                    <button onClick={clearLocation} className="search__clear">
                                        <X size={16} />
                                    </button>
                                )}
                            </div>

                            <button className="search__filters-btn" onClick={() => setShowFilters(!showFilters)}>
                                <SlidersHorizontal size={18} />
                                <span>Фильтры</span>
                            </button>

                            <button className="search__submit">
                                Найти
                            </button>
                        </div>

                        {showFilters && (
                            <div className="search__filters-panel">
                                <div className="filters__row">
                                    <div className="filter__group">
                                        <label className="filter__label">Тип занятости</label>
                                        <div className="filter__options">
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Полная
                                            </label>
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Частичная
                                            </label>
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Проектная
                                            </label>
                                        </div>
                                    </div>
                                    <div className="filter__group">
                                        <label className="filter__label">Формат работы</label>
                                        <div className="filter__options">
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Офис
                                            </label>
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Гибрид
                                            </label>
                                            <label className="filter__checkbox">
                                                <input type="checkbox" /> Удаленно
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchBar;