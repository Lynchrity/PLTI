import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { applyLogoFavicon } from './icons/LogoMark'
import './index.css'
import App from './App.tsx'

applyLogoFavicon()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
