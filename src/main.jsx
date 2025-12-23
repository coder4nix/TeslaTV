import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import { PlaylistProvider } from './contexts/PlaylistContext'
import { UserPreferencesProvider } from './contexts/UserPreferencesContext'
import App from './App.jsx'
import AdminArea from './AdminArea.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <PlaylistProvider>
        <UserPreferencesProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/admin" element={<AdminArea />} />
              <Route path="/install" element={<Navigate to="/admin" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </UserPreferencesProvider>
      </PlaylistProvider>
    </LanguageProvider>
  </React.StrictMode>,
)
