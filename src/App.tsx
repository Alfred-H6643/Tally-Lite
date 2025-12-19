import React from 'react';
import { BrowserRouter as Router, useRoutes, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import CategorySettings from './components/CategorySettings';
import ProjectSettings from './components/ProjectSettings';
import BudgetSettings from './components/BudgetSettings';
import Report from './components/Report';
import AddTransaction from './components/AddTransaction';
import BottomNavigation from './components/BottomNavigation';
import Login from './components/Login';
import AdminSettings from './components/AdminSettings';
import AccountSettings from './components/AccountSettings';
import { AnimatePresence } from 'framer-motion';
import { useFirebaseAuth } from './hooks/useFirebaseAuth';
import { useAppContext } from './context/AppContext';

// 認證後的應用程式內容
const AuthenticatedApp: React.FC = () => {
  const { isModalOpen, closeModal, openModal, editingTransaction } = useAppContext();
  const location = useLocation();

  const element = useRoutes([
    { path: "/", element: <Dashboard /> },
    { path: "/report", element: <Report /> },
    { path: "/settings", element: <Settings /> },
    { path: "/settings/account", element: <AccountSettings /> },
    { path: "/settings/categories", element: <CategorySettings /> },
    { path: "/settings/budgets", element: <BudgetSettings /> },
    { path: "/settings/projects", element: <ProjectSettings /> },
    { path: "/settings/admin", element: <AdminSettings /> },
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

      <BottomNavigation onAddClick={() => openModal()} />
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
