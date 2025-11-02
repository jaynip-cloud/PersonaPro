import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { PublicRoute } from './components/layout/PublicRoute';
import { HomePage } from './pages/HomePage';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { AddClient } from './pages/AddClient';
import { ClientDetail } from './pages/ClientDetail';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { Projects } from './pages/Projects';
import { ProjectDetail } from './pages/ProjectDetail';
import { NewProject } from './pages/NewProject';
import { KnowledgeBase } from './pages/KnowledgeBase';
import { PitchGenerator } from './pages/PitchGenerator';
import { GrowthOpportunities } from './pages/GrowthOpportunities';
import { Settings } from './pages/Settings';
import { Register } from './pages/auth/Register';
import { Login } from './pages/auth/Login';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { Onboarding } from './pages/onboarding/Onboarding';
import { ToastProvider } from './components/ui/Toast';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route index element={<Navigate to="/auth/login" replace />} />
              <Route path="/auth/register" element={<PublicRoute><Register /></PublicRoute>} />
              <Route path="/auth/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/auth/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
              <Route path="/onboarding" element={<Onboarding />} />

              <Route path="/" element={<AppLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="home" element={<HomePage />} />

                <Route path="clients" element={<Clients />} />
                <Route path="clients/new" element={<AddClient />} />
                <Route path="clients/:id" element={<ClientDetailNew />} />
                <Route path="clients/:id/edit" element={<AddClient />} />

                <Route path="projects" element={<Projects />} />
                <Route path="projects/new" element={<NewProject />} />
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
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
