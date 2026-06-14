import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// English translations
const en = {
  translation: {
    sidebar: {
      categories: 'Categories',
      allDownloads: 'All Downloads',
      unfinished: 'Unfinished',
      finished: 'Finished',
      grabber: 'Grabber projects',
      queues: 'Queues',
      mainQueue: 'Main download queue',
      syncQueue: 'Synchronization queue',
    },
    settings: {
      title: 'Settings',
      tabs: {
        general: 'General',
        appearance: 'Appearance',
        downloads: 'Downloads',
        network: 'Network',
        notifications: 'Notifications',
        folders: 'Folders',
        security: 'Security',
      },
      language: 'Language',
    }
  }
};

// Spanish translations
const es = {
  translation: {
    sidebar: {
      categories: 'Categorías',
      allDownloads: 'Todas las descargas',
      unfinished: 'Incompletas',
      finished: 'Completadas',
      grabber: 'Proyectos capturador',
      queues: 'Colas',
      mainQueue: 'Cola principal',
      syncQueue: 'Cola de sincronización',
    },
    settings: {
      title: 'Ajustes',
      tabs: {
        general: 'General',
        appearance: 'Apariencia',
        downloads: 'Descargas',
        network: 'Red',
        notifications: 'Notificaciones',
        folders: 'Carpetas',
        security: 'Seguridad',
      },
      language: 'Idioma',
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en,
      es
    },
    lng: 'en', // Default language
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already safe from xss
    }
  });

export default i18n;
