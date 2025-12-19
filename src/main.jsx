import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './contexts/LanguageContext'
import App from './App.jsx'
import AdminArea from './AdminArea.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/admin" element={<AdminArea />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  </React.StrictMode>,
)
