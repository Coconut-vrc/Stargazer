// FILE: app/page.tsx (全量書き換え)
'use client';

import React from 'react';
import { AppProvider } from './stores/AppContext';
import { AppContainer } from './pages/AppContainer';

export default function HomePage() {
  return (
    <AppProvider>
      <AppContainer />
    </AppProvider>
  );
}