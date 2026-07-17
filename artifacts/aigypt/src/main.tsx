import { createRoot } from 'react-dom/client';
import { setBaseUrl } from '@workspace/api-client-react';

import App from './App';

import './index.css';

// In Replit (dev), VITE_API_URL is not set and API calls go to the same
// origin via the dev proxy. On Vercel, set VITE_API_URL to the deployed
// API server URL (e.g. https://aigypt-api.vercel.app) in Project Settings →
// Environment Variables.
const apiUrl = import.meta.env.VITE_API_URL as string | undefined;
if (apiUrl) setBaseUrl(apiUrl);

createRoot(document.getElementById('root')!).render(<App />);
