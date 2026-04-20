import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/app/App'
import Toaster from '@/shared/ui/Toaster/Toaster'
import './styles/main.scss'

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
        <Toaster />
    </React.StrictMode>
)
