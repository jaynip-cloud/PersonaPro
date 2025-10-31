import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AppLayout } from './components/layout/AppLayout';
import { Dashboard } from './pages/Dashboard';
import { Clients } from './pages/Clients';
import { ClientDetailNew } from './pages/ClientDetailNew';
import { DataSources } from './pages/DataSources';
import { Placeholder } from './pages/Placeholder';

function App() {
  return (
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
            <Route path="team" element={<Placeholder title="Team" description="Manage your team members" />} />
            <Route path="settings" element={<Placeholder title="Settings" description="Configure your application settings" />} />
            <Route path="insights" element={<Placeholder title="Insights Dashboard" description="Analytics and insights overview" />} />
            <Route path="company" element={<Placeholder title="Company Intelligence" description="Company match engine and intelligence" />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
