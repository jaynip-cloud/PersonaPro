import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { AddClient } from './pages/AddClient';
import { ClientDetail } from './pages/ClientDetail';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { PitchGenerator } from './pages/PitchGenerator';
import { GrowthOpportunities } from './pages/GrowthOpportunities';
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
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="home" element={<HomePage />} />

              <Route path="clients" element={<Clients />} />
              <Route path="clients/new" element={<AddClient />} />
              <Route path="clients/:id" element={<ClientDetailNew />} />
              <Route path="clients/:id/edit" element={<AddClient />} />

              <Route path="projects" element={<Projects />} />
              <Route path="projects/:id" element={<ProjectDetail />} />

              <Route path="pitch-generator" element={<PitchGenerator />} />
              <Route path="growth-opportunities" element={<GrowthOpportunities />} />

              <Route path="knowledge-base" element={<KnowledgeBase />} />

              <Route path="settings" element={<Settings />} />

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
          <KeyboardShortcuts />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
