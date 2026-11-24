import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { DataProvider, useData } from './lib/data';
import './lib/pwa';
import AuthScreen from './components/AuthScreen';
import { ErrorBanner, Spinner, TabBar, type TabId } from './components/ui';
import HomeScreen from './components/HomeScreen';
import TrainingScreen from './components/TrainingScreen';
import PerformanceScreen from './components/PerformanceScreen';
import RecoveryScreen from './components/RecoveryScreen';
import NutritionScreen from './components/NutritionScreen';
import CoachScreen from './components/CoachScreen';
import ProfileScreen from './components/ProfileScreen';

function Shell() {
  const { session, loading: authLoading } = useAuth();
  const data = useData();
  const [tab, setTab] = useState<TabId>('home');
  const [showError, setShowError] = useState(true);

  useEffect(() => {
    setShowError(!!data.error);
  }, [data.error]);

  if (authLoading || (session && data.loading)) {
    return <Spinner fullPage />;
  }

  if (!session) {
    return <AuthScreen />;
  }

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-6">
        {showError && data.error && (
          <ErrorBanner message={data.error} onDismiss={() => setShowError(false)} />
        )}
        {tab === 'home' && <HomeScreen onNavigate={(t) => setTab(t as TabId)} />}
        {tab === 'training' && <TrainingScreen />}
        {tab === 'performance' && <PerformanceScreen />}
        {tab === 'recovery' && <RecoveryScreen />}
        {tab === 'nutrition' && <NutritionScreen />}
        {tab === 'coach' && <CoachScreen />}
        {tab === 'profile' && <ProfileScreen />}
      </main>
      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <Shell />
      </DataProvider>
    </AuthProvider>
  );
}
