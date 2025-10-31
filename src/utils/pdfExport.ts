import { Client, PersonaMetrics } from '../types';

export const exportPersonaReportAsPDF = (client: Client, metrics: PersonaMetrics) => {
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Persona Report - ${client.company}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      line-height: 1.6;
      color: #333;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
    }
    h1 {
      color: #1a1a1a;
      font-size: 32px;
      margin-bottom: 8px;
    }
    h2 {
      color: #2563eb;
      font-size: 24px;
      margin-top: 32px;
      margin-bottom: 16px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 8px;
    }
    h3 {
      color: #374151;
      font-size: 18px;
      margin-top: 24px;
      margin-bottom: 12px;
    }
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 32px;
      border-radius: 8px;
      margin-bottom: 32px;
    }
    .meta {
      display: flex;
      justify-content: space-between;
      margin-top: 16px;
      font-size: 14px;
      opacity: 0.9;
    }
    .metric-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 24px;
    }
    .metric-card {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 20px;
    }
    .metric-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    .metric-value {
      font-size: 24px;
      font-weight: bold;
      color: #1a1a1a;
    }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      margin-right: 8px;
      margin-bottom: 8px;
    }
    .badge-high { background: #d1fae5; color: #065f46; }
    .badge-medium { background: #fef3c7; color: #92400e; }
    .badge-low { background: #fee2e2; color: #991b1b; }
    .badge-default { background: #e5e7eb; color: #374151; }
    .sentiment-bar {
      width: 100%;
      height: 24px;
      background: #e5e7eb;
      border-radius: 12px;
      overflow: hidden;
      margin-top: 8px;
    }
    .sentiment-fill {
      height: 100%;
      background: linear-gradient(90deg, #ef4444 0%, #fbbf24 50%, #10b981 100%);
      transition: width 0.3s;
    }
    .project-list {
      list-style: none;
      padding: 0;
    }
    .project-list li {
      padding: 12px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 8px;
    }
    .footer {
      margin-top: 48px;
      padding-top: 24px;
      border-top: 2px solid #e5e7eb;
      font-size: 12px;
      color: #6b7280;
      text-align: center;
    }
    @media print {
      body { padding: 20px; }
      .header { break-inside: avoid; }
      .metric-card { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Client Persona Report</h1>
    <div style="font-size: 18px; margin-top: 8px;">${client.company}</div>
    <div class="meta">
      <div>Contact: ${client.name}</div>
      <div>Generated: ${new Date().toLocaleDateString()}</div>
    </div>
  </div>

  <h2>Client Overview</h2>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Industry</div>
      <div class="metric-value">${client.industry}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Status</div>
      <div class="metric-value" style="text-transform: capitalize;">${client.status}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Persona Score</div>
      <div class="metric-value">${client.personaScore}/100</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Health Score</div>
      <div class="metric-value">${client.healthScore || 'N/A'}%</div>
    </div>
  </div>

  <h2>Persona Metrics</h2>

  <h3>Sentiment Analysis</h3>
  <div class="metric-card">
    <div class="metric-label">Overall Sentiment</div>
    <div class="metric-value">${metrics.sentiment > 0 ? '+' : ''}${metrics.sentiment.toFixed(2)}</div>
    <div class="sentiment-bar">
      <div class="sentiment-fill" style="width: ${((metrics.sentiment + 1) / 2) * 100}%"></div>
    </div>
  </div>

  <h3>Communication Profile</h3>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Communication Style</div>
      <div class="metric-value" style="font-size: 18px;">${metrics.communicationStyle.value}</div>
      <span class="badge badge-${metrics.communicationStyle.confidence}">${metrics.communicationStyle.confidence} confidence</span>
    </div>
    <div class="metric-card">
      <div class="metric-label">Response Speed</div>
      <div class="metric-value">${metrics.responseSpeed.avgDays} days</div>
      <span class="badge badge-${metrics.responseSpeed.confidence}">${metrics.responseSpeed.confidence} confidence</span>
    </div>
    <div class="metric-card">
      <div class="metric-label">Negotiation Tone</div>
      <div class="metric-value" style="font-size: 18px;">${metrics.negotiationTone.value}</div>
      <span class="badge badge-${metrics.negotiationTone.confidence}">${metrics.negotiationTone.confidence} confidence</span>
    </div>
    <div class="metric-card">
      <div class="metric-label">Engagement Pattern</div>
      <div class="metric-value" style="font-size: 18px;">${metrics.engagementPattern.value}</div>
      <span class="badge badge-${metrics.engagementPattern.confidence}">${metrics.engagementPattern.confidence} confidence</span>
    </div>
  </div>

  <h3>Cooperation & Risk</h3>
  <div class="metric-grid">
    <div class="metric-card">
      <div class="metric-label">Cooperation Level</div>
      <div class="metric-value" style="text-transform: capitalize;">${metrics.cooperation}</div>
    </div>
    <div class="metric-card">
      <div class="metric-label">Risk Level</div>
      <div class="metric-value" style="text-transform: capitalize;">${metrics.riskLevel}</div>
    </div>
  </div>

  <h3>Top Project Types</h3>
  <ul class="project-list">
    ${metrics.topProjectTypes.map(type => `<li>${type}</li>`).join('')}
  </ul>

  <h2>Client Tags</h2>
  <div>
    ${client.tags.map(tag => `<span class="badge badge-default">${tag}</span>`).join('')}
  </div>

  <div class="footer">
    <p>This report is confidential and intended solely for internal use.</p>
    <p>PersonaPro AI-Powered Intelligence Platform</p>
  </div>
</body>
</html>
  `.trim();

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `persona-report-${client.company.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.html`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  window.open(url, '_blank');
};
