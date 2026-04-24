import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './stores/themeStore';
import './i18n';
import './index.css';
import { router } from './router';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

const app = <RouterProvider router={router} />;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {googleClientId ? (
      <GoogleOAuthProvider clientId={googleClientId}>
        {app}
      </GoogleOAuthProvider>
    ) : (
      app
    )}
  </StrictMode>,
);
