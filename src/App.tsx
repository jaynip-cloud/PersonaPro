import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { Clients } from './pages/Clients';
import { AddClient } from './pages/AddClient';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { Projects } from './pages/Projects';
import { Settings } from './pages/Settings';
import { ToastProvider } from './components/ui/Toast';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

function App() {
  return (
    <ToastProvider>
      <AppProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<AppLayout />}>
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<HomePage />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<AddClient />} />
            <Route path="clients/:id" element={<ClientDetailNew />} />
            <Route path="projects" element={<Projects />} />
            <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
          <KeyboardShortcuts />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
