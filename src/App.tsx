import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Signup } from './pages/Signup';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
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
import { PitchHistory } from './pages/PitchHistory';
import { GrowthOpportunities } from './pages/GrowthOpportunities';
import { Settings } from './pages/Settings';
import { ToastProvider } from './components/ui/Toast';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />

              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }>
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
                <Route path="pitch-history" element={<PitchHistory />} />
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
