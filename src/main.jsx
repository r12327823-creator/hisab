import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { ConvexProviderWithAuth } from './convex/client'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConvexProviderWithAuth>
      <App />
    </ConvexProviderWithAuth>
  </StrictMode>,
)
