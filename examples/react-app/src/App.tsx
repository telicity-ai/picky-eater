import { useState } from 'react';
import { CREW_NAME } from './data/sampleData';
import { MyHoursPage } from './pages/MyHoursPage';
import { SettingsPage } from './pages/SettingsPage';
import { ShiftsPage } from './pages/ShiftsPage';
import './App.css';

type Page = 'shifts' | 'hours' | 'settings';

const NAV_ITEMS: { page: Page; label: string }[] = [
  { page: 'shifts', label: 'Shifts' },
  { page: 'hours', label: 'My hours' },
  { page: 'settings', label: 'Settings' },
];

export function App() {
  const [page, setPage] = useState<Page>('settings');

  return (
    <div className="app">
      <header className="app-header">
        <div className="app-header__inner">
          <div className="app-header__brand">
            <span className="app-header__product">Switchback</span>
            <span className="app-header__crew">{CREW_NAME}</span>
          </div>
          <nav className="app-nav" aria-label="Main">
            <ul className="app-nav__list">
              {NAV_ITEMS.map((item) => (
                <li key={item.page}>
                  <button
                    type="button"
                    className="app-nav__link"
                    aria-current={page === item.page ? 'page' : undefined}
                    onClick={() => setPage(item.page)}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      <main className="app-main">
        {page === 'shifts' && <ShiftsPage />}
        {page === 'hours' && <MyHoursPage />}
        {page === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
}
