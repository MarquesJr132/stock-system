import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { TenantFeaturesProvider } from './hooks/useTenantFeatures'

console.log('main.tsx: Starting application...');

const rootElement = document.getElementById("root");
console.log('main.tsx: Root element found:', !!rootElement);
createRoot(rootElement!).render(
  <TenantFeaturesProvider>
    <App />
  </TenantFeaturesProvider>
);
console.log('main.tsx: App rendered successfully');