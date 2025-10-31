import React, { useState, useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { KPICards } from '../components/insights/KPICards';
import { SentimentTrendChart } from '../components/insights/SentimentTrendChart';
import { CooperationScatterChart } from '../components/insights/CooperationScatterChart';
import { ServiceCategoriesChart } from '../components/insights/ServiceCategoriesChart';
import { InsightsFilters, FilterState } from '../components/insights/InsightsFilters';
import { HighFitClientsTable, HighFitClient } from '../components/insights/HighFitClientsTable';
import { Download, Save } from 'lucide-react';
import { mockClients } from '../data/mockData';
import { generateMockClientScores } from '../utils/fitScoreCalculator';
import { exportToCSV, exportInsightsSummary } from '../utils/csvExport';

export const InsightsDashboard: React.FC = () => {
  const [filters, setFilters] = useState<FilterState>({
    dateRange: 'all',
    industry: 'all',
    region: 'all',
    csm: 'all',
    sentimentBand: 'all'
  });

  const allClientScores = useMemo(() => {
    return generateMockClientScores(mockClients);
  }, []);

  const filteredClients = useMemo(() => {
    let filtered = [...allClientScores];

    if (filters.industry !== 'all') {
      filtered = filtered.filter(c => c.industry.toLowerCase() === filters.industry);
    }

    if (filters.sentimentBand !== 'all') {
      if (filters.sentimentBand === 'positive') {
        filtered = filtered.filter(c => c.sentiment > 0.5);
      } else if (filters.sentimentBand === 'neutral') {
        filtered = filtered.filter(c => c.sentiment >= 0 && c.sentiment <= 0.5);
      } else if (filters.sentimentBand === 'negative') {
        filtered = filtered.filter(c => c.sentiment < 0);
      }
    }

    return filtered.sort((a, b) => b.fitScore - a.fitScore).slice(0, 10);
  }, [allClientScores, filters]);

  const kpiData = useMemo(() => {
    const avgSentiment = allClientScores.reduce((sum, c) => sum + c.sentiment, 0) / allClientScores.length;
    const avgHealth = allClientScores.reduce((sum, c) => sum + c.healthScore, 0) / allClientScores.length;

    return {
      totalClients: mockClients.length,
      activeDataSources: 8,
      personasCreated: 12,
      avgSentiment,
      avgHealthScore: Math.round(avgHealth),
      clientsChange: 8,
      personasChange: 15,
      sentimentChange: 5
    };
  }, [allClientScores]);

  const sentimentTrendData = [
    { date: 'Oct 15', value: 0.65 },
    { date: 'Oct 18', value: 0.72 },
    { date: 'Oct 21', value: 0.68 },
    { date: 'Oct 24', value: 0.78 },
    { date: 'Oct 27', value: 0.75 },
    { date: 'Oct 30', value: 0.82 }
  ];

  const scatterData = filteredClients.slice(0, 15).map(client => ({
    company: client.company,
    cooperation: client.healthScore,
    projectSize: client.mrr * 12,
    color: client.fitScore >= 85 ? 'rgb(59, 130, 246)' :
           client.fitScore >= 70 ? 'rgb(34, 197, 94)' :
           'rgb(249, 115, 22)'
  }));

  const serviceCategoriesData = [
    { category: 'Platform Migration', count: 24, color: 'rgb(59, 130, 246)' },
    { category: 'API Development', count: 18, color: 'rgb(34, 197, 94)' },
    { category: 'ML Integration', count: 15, color: 'rgb(168, 85, 247)' },
    { category: 'Cloud Infrastructure', count: 12, color: 'rgb(249, 115, 22)' },
    { category: 'Security Audit', count: 9, color: 'rgb(236, 72, 153)' }
  ];

  const handleResetFilters = () => {
    setFilters({
      dateRange: 'all',
      industry: 'all',
      region: 'all',
      csm: 'all',
      sentimentBand: 'all'
    });
  };

  const handleExportCSV = () => {
    exportToCSV(filteredClients);
  };

  const handleSaveReport = () => {
    exportInsightsSummary({
      kpis: kpiData,
      filters,
      clients: filteredClients
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Insights Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Cross-client analytics and high-value targeting
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="primary" onClick={handleSaveReport}>
            <Save className="h-4 w-4 mr-2" />
            Save Report
          </Button>
        </div>
      </div>

      <KPICards data={kpiData} />

      <InsightsFilters
        filters={filters}
        onFilterChange={setFilters}
        onReset={handleResetFilters}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SentimentTrendChart data={sentimentTrendData} />
        <ServiceCategoriesChart data={serviceCategoriesData} />
      </div>

      <CooperationScatterChart data={scatterData} />

      <HighFitClientsTable clients={filteredClients} />
    </div>
  );
};
