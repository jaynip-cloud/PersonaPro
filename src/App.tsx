import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { DataSources } from './pages/DataSources';
import { InsightsDashboard } from './pages/InsightsDashboard';
import { CompanyIntelligence } from './pages/CompanyIntelligence';
import { PitchGenerator } from './pages/PitchGenerator';
import { Settings } from './pages/Settings';
import { Admin } from './pages/Admin';
import { Placeholder } from './pages/Placeholder';
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
            <Route path="clients" element={<Clients />} />
            <Route path="clients/:id" element={<ClientDetailNew />} />
            <Route path="clients/:id/intelligence" element={<Placeholder title="Client Intelligence" description="Deep dive into client insights and analytics" />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="forecasts" element={<Placeholder title="Forecasts" description="Sales forecasts and predictions" />} />
            <Route path="issues" element={<Placeholder title="Issues & Prospects" description="Track issues and manage prospects" />} />
            <Route path="projects" element={<Placeholder title="Projects" description="Manage your projects and deliverables" />} />
            <Route path="reports" element={<Placeholder title="Reports" description="Generate and view reports" />} />
            <Route path="pitch" element={<PitchGenerator />} />
            <Route path="team" element={<Placeholder title="Team" description="Manage your team members" />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
            <Route path="insights" element={<InsightsDashboard />} />
            <Route path="company" element={<CompanyIntelligence />} />
            </Route>
          </Routes>
          <KeyboardShortcuts />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
