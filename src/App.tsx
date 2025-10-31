import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { HomePage } from './pages/HomePage';
import { Clients } from './pages/Clients';
import { AddClient } from './pages/AddClient';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { ClientDataSources } from './pages/ClientDataSources';
import { DataSources } from './pages/DataSources';
import { InsightsDashboard } from './pages/InsightsDashboard';
import { CompanyIntelligence } from './pages/CompanyIntelligence';
import { CompanyData } from './pages/CompanyData';
import { PitchGenerator } from './pages/PitchGenerator';
import { Projects } from './pages/Projects';
import { GrowthOpportunities } from './pages/GrowthOpportunities';
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
            <Route index element={<HomePage />} />
            <Route path="dashboard" element={<HomePage />} />
            <Route path="clients" element={<Clients />} />
            <Route path="clients/new" element={<AddClient />} />
            <Route path="clients/:id" element={<ClientDetailNew />} />
            <Route path="clients/:id/data-sources" element={<ClientDataSources />} />
            <Route path="clients/:id/intelligence" element={<Placeholder title="Client Intelligence" description="Deep dive into client insights and analytics" />} />
            <Route path="data-sources" element={<DataSources />} />
            <Route path="projects" element={<Projects />} />
            <Route path="opportunities" element={<GrowthOpportunities />} />
            <Route path="pitch" element={<PitchGenerator />} />
            <Route path="settings" element={<Settings />} />
            <Route path="admin" element={<Admin />} />
            <Route path="insights" element={<InsightsDashboard />} />
            <Route path="company" element={<CompanyIntelligence />} />
            <Route path="company-data" element={<CompanyData />} />
            </Route>
          </Routes>
          <KeyboardShortcuts />
        </BrowserRouter>
      </AppProvider>
    </ToastProvider>
  );
}

export default App;
