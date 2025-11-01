import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { SignUp } from './pages/auth/SignUp';
import { SignIn } from './pages/auth/SignIn';
import { ForgotPassword } from './pages/auth/ForgotPassword';
import { ResetPassword } from './pages/auth/ResetPassword';
import { VerifyEmail } from './pages/auth/VerifyEmail';
import { AuthCallback } from './pages/auth/AuthCallback';
import { Onboarding } from './pages/onboarding/Onboarding';
import { Welcome } from './pages/Welcome';
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
import { ToastProvider } from './components/ui/Toast';
import { KeyboardShortcuts } from './components/ui/KeyboardShortcuts';

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <AppProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" index element={<Navigate to="/auth/signin" replace />} />
              <Route path="/auth/signup" element={<SignUp />} />
              <Route path="/auth/signin" element={<SignIn />} />
              <Route path="/auth/forgot-password" element={<ForgotPassword />} />
              <Route path="/auth/reset-password" element={<ResetPassword />} />
              <Route path="/auth/verify-email" element={<VerifyEmail />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              <Route
                path="/onboarding"
                element={
                  <ProtectedRoute>
                    <Onboarding />
                  </ProtectedRoute>
                }
              />

              <Route
                path="/welcome"
                element={
                  <ProtectedRoute requireOnboarding>
                    <Welcome />
                  </ProtectedRoute>
                }
              />

              <Route path="/" element={<AppLayout />}>
                <Route
                  path="dashboard"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route path="home" element={<HomePage />} />

                <Route
                  path="clients"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <Clients />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="clients/new"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <AddClient />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="clients/:id"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <ClientDetailNew />
                    </ProtectedRoute>
                  }
                />
                <Route path="clients/:id/edit" element={<AddClient />} />

                <Route
                  path="projects"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <Projects />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="projects/new"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <NewProject />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="projects/:id"
                  element={
                    <ProtectedRoute requireOnboarding>
                      <ProjectDetail />
                    </ProtectedRoute>
                  }
                />

                <Route path="pitch-generator" element={<PitchGenerator />} />
                <Route path="growth-opportunities" element={<GrowthOpportunities />} />

                <Route path="knowledge-base" element={<KnowledgeBase />} />

                <Route path="settings" element={<Settings />} />

                <Route path="*" element={<Navigate to="/auth/signin" replace />} />
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
