import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { MantineProvider } from '@mantine/core';
import { DatesProvider } from '@mantine/dates';
import { Notifications } from '@mantine/notifications';
import { I18nextProvider, useTranslation } from 'react-i18next';
import { theme } from './theme';
import { router } from './routes';
import { AuthProvider } from '@/contexts/AuthContext';
import { getDatesLocale } from '@/lib/mantine-i18n';
import i18n from '@/i18n';
import '@mantine/core/styles.css';
import '@mantine/dates/styles.css';
import '@mantine/notifications/styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * Inner wrapper that reads the active language from i18next and passes
 * the matching locale to <DatesProvider>. Re-renders on language change.
 */
function MantineWithLocale({ children }: { children: React.ReactNode }) {
  const { i18n: i18nInstance } = useTranslation();
  return (
    <MantineProvider theme={theme}>
      <DatesProvider settings={{ locale: getDatesLocale(i18nInstance.language) }}>{children}</DatesProvider>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <MantineWithLocale>
          <Notifications position="top-right" />
          <AuthProvider>
            <RouterProvider router={router} />
          </AuthProvider>
        </MantineWithLocale>
      </QueryClientProvider>
    </I18nextProvider>
  </React.StrictMode>
);
