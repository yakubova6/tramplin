// src/components/Map/OpportunityMap.jsx
import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Фикс для иконок в React-Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

import './OpportunityMap.scss';

const OpportunityMap = ({ opportunities = [], center = [55.7558, 37.6173], zoom = 10 }) => {
    return (
        <div className="map-wrapper">
            <MapContainer
                center={center}
                zoom={zoom}
                className="map-container"
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {opportunities.map((opp) => (
                    <Marker
                        key={opp.id}
                        position={[opp.coordinates.lat, opp.coordinates.lng]}
                    >
                        <Popup>
                            <div className="map-popup">
                                <h4>{opp.title}</h4>
                                <p>{opp.company}</p>
                                {opp.salary && <p className="popup-salary">от {opp.salary.from} ₽</p>}
                                <div className="popup-tags">
                                    {opp.tags.slice(0, 2).map(tag => (
                                        <span key={tag} className="popup-tag">{tag}</span>
                                    ))}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default OpportunityMap;