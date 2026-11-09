/**
 * RADIAL QR Application Entrypoint.
 * Coordinates navigation across all 8 pages, persists design states,
 * and maintains immersive dark-mode UI.
 */

import React, { useState, useEffect } from 'react';
import { Navbar, PageView } from './components/Navbar';
import { Footer } from './components/Footer';
import { HomePage } from './pages/HomePage';
import { GeneratorPage } from './pages/GeneratorPage';
import { ScannerPage } from './pages/ScannerPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { MyDesignsPage } from './pages/MyDesignsPage';
import { DocumentationPage } from './pages/DocumentationPage';
import { AccountPage } from './pages/AccountPage';
import { SettingsPage } from './pages/SettingsPage';
import { SavedDesign } from './data/designStore';

export default function App() {
  const [activePage, setActivePage] = useState<PageView>('home');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>();
  const [activeEditingDesign, setActiveEditingDesign] = useState<SavedDesign | null>(null);

  // Check URL query parameters on initial load (e.g., ?autostart=1 or ?page=generator)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get('page') as PageView;
    const templateParam = params.get('template');

    if (pageParam && ['home', 'generator', 'scanner', 'templates', 'designs', 'account', 'settings', 'docs'].includes(pageParam)) {
      setActivePage(pageParam);
    } else if (params.get('autostart') === '1') {
      setActivePage('generator');
    }

    if (templateParam) {
      setSelectedTemplateId(templateParam);
    }
  }, []);

  const handleNavigate = (page: PageView) => {
    setActivePage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    setActivePage('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDesign = (design: SavedDesign) => {
    setActiveEditingDesign(design);
    setActivePage('generator');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#090B10] text-slate-100 flex flex-col font-sans">
      <Navbar activePage={activePage} onNavigate={handleNavigate} />

      <main className="flex-1 flex flex-col">
        {activePage === 'home' && (
          <HomePage
            onNavigate={handleNavigate}
            onSelectTemplate={handleSelectTemplate}
          />
        )}

        {activePage === 'generator' && (
          <GeneratorPage initialTemplateId={selectedTemplateId} />
        )}

        {activePage === 'scanner' && <ScannerPage />}

        {activePage === 'templates' && (
          <TemplatesPage onSelectTemplate={handleSelectTemplate} />
        )}

        {activePage === 'designs' && (
          <MyDesignsPage
            onNavigate={handleNavigate}
            onOpenDesign={handleOpenDesign}
          />
        )}

        {activePage === 'docs' && <DocumentationPage />}

        {activePage === 'account' && <AccountPage />}

        {activePage === 'settings' && <SettingsPage />}
      </main>

      {/* Show footer on content pages (hidden on generator 3-panel and scanner for maximum viewport space) */}
      {activePage !== 'generator' && activePage !== 'scanner' && (
        <Footer onNavigate={handleNavigate} />
      )}
    </div>
  );
}
