// src/components/Layout/Layout.jsx
import React from 'react';
import './Layout.scss';

const Layout = ({ children }) => {
    return (
        <div className="layout">
            <header className="header">
                <div className="container">
                    <div className="header__content">
                        <div className="header__logo">
                            <span className="logo__icon">🚀</span>
                            <span className="logo__text">Трамплин</span>
                        </div>
                        <div className="header__actions">
                            <button className="button button--outline">Войти</button>
                            <button className="button button--primary">Регистрация</button>
                        </div>
                    </div>
                </div>
            </header>
            <main className="main">
                {children}
            </main>
        </div>
    );
};

export default Layout;