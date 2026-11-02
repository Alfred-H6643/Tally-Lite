import React, { lazy, Suspense } from 'react';
// Deployment trigger: 2026-02-02
import { BrowserRouter as Router, useRoutes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './components/Dashboard';
import AddTransaction from './components/AddTransaction';
import BottomNavigation from './components/BottomNavigation';
import Login from './components/Login';
import { AnimatePresence } from 'framer-motion';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useAppContext } from './context/AppContext';

// 首頁以外的頁面用到才載入，讓開啟 app 時不必下載圖表與設定頁
const pageLoaders = {
  Report: () => import('./components/Report'),
  SearchTransactions: () => import('./components/SearchTransactions'),
  Settings: () => import('./components/Settings'),
  AccountSettings: () => import('./components/AccountSettings'),
  CategorySettings: () => import('./components/CategorySettings'),
  BudgetSettings: () => import('./components/BudgetSettings'),
  ProjectSettings: () => import('./components/ProjectSettings'),
  AdminSettings: () => import('./components/AdminSettings'),
  BatchReclassify: () => import('./components/BatchReclassify'),
};

const Report = lazy(pageLoaders.Report);
const SearchTransactions = lazy(pageLoaders.SearchTransactions);
const Settings = lazy(pageLoaders.Settings);
const AccountSettings = lazy(pageLoaders.AccountSettings);
const CategorySettings = lazy(pageLoaders.CategorySettings);
const BudgetSettings = lazy(pageLoaders.BudgetSettings);
const ProjectSettings = lazy(pageLoaders.ProjectSettings);
const AdminSettings = lazy(pageLoaders.AdminSettings);
const BatchReclassify = lazy(pageLoaders.BatchReclassify);

// 首頁載入後等 2 秒，於背景預先下載其他頁面，切換時不用等
const PRELOAD_DELAY_MS = 2000;

const page = (element: React.ReactNode) => (
  <Suspense
    fallback={
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    }
  >
    {element}
  </Suspense>
);

// 認證後的應用程式內容
const AuthenticatedApp: React.FC = () => {
  const { isModalOpen, closeModal, openModal, editingTransaction } = useAppContext();
  const location = useLocation();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      Object.values(pageLoaders).forEach(load => load().catch(() => undefined));
    }, PRELOAD_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const element = useRoutes([
    { path: "/", element: <Dashboard /> },
    { path: "/report", element: page(<Report />) },
    { path: "/report/search", element: page(<SearchTransactions />) },
    { path: "/settings", element: page(<Settings />) },
    { path: "/settings/account", element: page(<AccountSettings />) },
    { path: "/settings/categories", element: page(<CategorySettings />) },
    { path: "/settings/budgets", element: page(<BudgetSettings />) },
    { path: "/settings/projects", element: page(<ProjectSettings />) },
    { path: "/settings/admin", element: page(<AdminSettings />) },
    { path: "/settings/batch-reclassify", element: page(<BatchReclassify />) },
    { path: "*", element: <Dashboard /> }, // 任何未知路由都導向主畫面
  ]);

  return (
    <div className="max-w-md mx-auto h-screen bg-gray-50 flex flex-col relative overflow-hidden shadow-2xl">
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode='wait'>
          {element && React.cloneElement(element, { key: location.pathname })}
        </AnimatePresence>

        <AnimatePresence>
          {isModalOpen && (
            <AddTransaction
              onClose={closeModal}
              initialTransaction={editingTransaction}
            />
          )}
        </AnimatePresence>
      </div>

      <BottomNavigation onAddClick={openModal} />
    </div>
  );
};

const App: React.FC = () => {
  const { user, loading } = useFirebaseAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <AppProvider>
      <Router>
        <AuthenticatedApp />
      </Router>
    </AppProvider>
  );
};

export default App;
