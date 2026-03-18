// src/pages/HomePage.jsx
import React, { useState } from 'react';
import Layout from '../components/Layout/Layout';
import SearchBar from '../components/Search/SearchBar';
import OpportunityMap from '../components/Map/OpportunityMap';
import OpportunityCard from '../components/Card/OpportunityCard';
import { Map, List } from 'lucide-react';
import './HomePage.scss';

// Тестовые данные
const mockOpportunities = [
    {
        id: 1,
        title: 'Frontend Developer (React)',
        company: 'Яндекс',
        location: 'Москва',
        type: 'vacancy',
        format: 'hybrid',
        salary: { from: 150000, to: 250000 },
        tags: ['React', 'TypeScript', 'Redux'],
        postedAt: '2024-03-15',
        coordinates: { lat: 55.7558, lng: 37.6173 },
        isFavorite: false
    },
    {
        id: 2,
        title: 'Стажировка для Junior Java-разработчиков',
        company: 'СберТех',
        location: 'Москва',
        type: 'internship',
        format: 'office',
        salary: { from: 80000, to: 120000 },
        tags: ['Java', 'Spring', 'SQL'],
        postedAt: '2024-03-14',
        coordinates: { lat: 55.7512, lng: 37.6225 },
        isFavorite: true
    },
    {
        id: 3,
        title: 'Менторская программа по Python',
        company: 'Тинькофф',
        location: 'Санкт-Петербург',
        type: 'mentorship',
        format: 'remote',
        tags: ['Python', 'Django', 'FastAPI'],
        postedAt: '2024-03-13',
        coordinates: { lat: 59.9343, lng: 30.3351 },
        isFavorite: false
    }
];

const HomePage = () => {
    const [viewMode, setViewMode] = useState('list'); // 'map' or 'list'
    const [favorites, setFavorites] = useState([2]); // ID избранных

    const toggleFavorite = (id) => {
        setFavorites(prev =>
            prev.includes(id) ? prev.filter(fId => fId !== id) : [...prev, id]
        );
    };

    return (
        <Layout>
            <SearchBar />

            <div className="container">
                <div className="content-header">
                    <h2 className="content-title">Все возможности</h2>

                    <div className="view-toggle">
                        <button
                            className={`view-toggle__btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={18} />
                            <span>Список</span>
                        </button>
                        <button
                            className={`view-toggle__btn ${viewMode === 'map' ? 'active' : ''}`}
                            onClick={() => setViewMode('map')}
                        >
                            <Map size={18} />
                            <span>Карта</span>
                        </button>
                    </div>
                </div>

                <div className="content-body">
                    {viewMode === 'map' ? (
                        <div className="map-section">
                            <OpportunityMap
                                opportunities={mockOpportunities}
                                center={[55.7558, 37.6173]}
                                zoom={10}
                            />
                        </div>
                    ) : (
                        <div className="list-section">
                            {mockOpportunities.map(opportunity => (
                                <OpportunityCard
                                    key={opportunity.id}
                                    opportunity={opportunity}
                                    isFavorite={favorites.includes(opportunity.id)}
                                    onToggleFavorite={() => toggleFavorite(opportunity.id)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
};

export default HomePage;