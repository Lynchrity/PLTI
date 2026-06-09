import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { APP_NAME } from './constants/app'
import { applyLogoFavicon } from './icons/LogoMark'
import './index.css'
import App from './App.tsx'

applyLogoFavicon()
document.title = APP_NAME

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
