import { HighFitClient } from '../components/insights/HighFitClientsTable';

export const exportToCSV = (clients: HighFitClient[], filename: string = 'high-fit-clients.csv') => {
  const headers = [
    'Rank',
    'Company',
    'Fit Score',
    'Sentiment',
    'Project Type',
    'Industry',
    'MRR',
    'Health Score'
  ];

  const rows = clients.map((client, index) => [
    index + 1,
    client.company,
    client.fitScore,
    client.sentiment,
    client.projectType,
    client.industry,
    client.mrr,
    client.healthScore
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};

export const exportInsightsSummary = (data: {
  kpis: any;
  filters: any;
  clients: HighFitClient[];
}) => {
  const timestamp = new Date().toISOString().split('T')[0];
  const filename = `insights-summary-${timestamp}.csv`;

  const summaryRows = [
    ['Insights Dashboard Summary'],
    ['Generated:', new Date().toLocaleString()],
    [''],
    ['Key Performance Indicators'],
    ['Total Clients', data.kpis.totalClients],
    ['Active Data Sources', data.kpis.activeDataSources],
    ['Personas Created (This Week)', data.kpis.personasCreated],
    ['Average Sentiment', data.kpis.avgSentiment.toFixed(2)],
    ['Average Health Score', `${data.kpis.avgHealthScore}%`],
    [''],
    ['Active Filters'],
    ['Date Range', data.filters.dateRange],
    ['Industry', data.filters.industry],
    ['Region', data.filters.region],
    ['CSM', data.filters.csm],
    ['Sentiment Band', data.filters.sentimentBand],
    [''],
    ['Top High-Fit Clients'],
    ['Rank', 'Company', 'Fit Score', 'Sentiment', 'Project Type', 'Industry', 'MRR', 'Health Score'],
    ...data.clients.map((client, index) => [
      index + 1,
      client.company,
      client.fitScore,
      client.sentiment,
      client.projectType,
      client.industry,
      client.mrr,
      client.healthScore
    ])
  ];

  const csvContent = summaryRows.map(row =>
    row.map(cell => {
      const cellStr = String(cell);
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');

  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
};
