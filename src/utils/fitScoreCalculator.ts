import { Client } from '../types';

export interface FitScoreFactors {
  serviceTags: number;
  sentiment: number;
  recentEngagement: number;
  healthScore: number;
  projectSize: number;
}

export const calculateFitScore = (
  client: Client,
  sentiment: number = 0.5,
  lastEngagementDays: number = 7,
  projectSize: number = 50000
): { score: number; factors: FitScoreFactors } => {
  const serviceTags = client.tags.length * 10;
  const serviceTagsScore = Math.min(serviceTags, 30);

  let sentimentScore = 0;
  if (sentiment >= 0.7) sentimentScore = 30;
  else if (sentiment >= 0.4) sentimentScore = 20;
  else if (sentiment >= 0) sentimentScore = 10;
  else sentimentScore = 0;

  let engagementScore = 0;
  if (lastEngagementDays <= 7) engagementScore = 20;
  else if (lastEngagementDays <= 14) engagementScore = 15;
  else if (lastEngagementDays <= 30) engagementScore = 10;
  else engagementScore = 5;

  const healthScore = (client.healthScore || 70) * 0.15;

  let projectSizeScore = 0;
  if (projectSize >= 100000) projectSizeScore = 15;
  else if (projectSize >= 50000) projectSizeScore = 10;
  else if (projectSize >= 25000) projectSizeScore = 5;
  else projectSizeScore = 0;

  const factors: FitScoreFactors = {
    serviceTags: serviceTagsScore,
    sentiment: sentimentScore,
    recentEngagement: engagementScore,
    healthScore: Math.round(healthScore),
    projectSize: projectSizeScore
  };

  const totalScore = Math.min(
    serviceTagsScore + sentimentScore + engagementScore + healthScore + projectSizeScore,
    100
  );

  return {
    score: Math.round(totalScore),
    factors
  };
};

export const generateMockClientScores = (clients: Client[]) => {
  return clients.map(client => {
    const sentiment = Math.random() * 1.5 - 0.3;
    const lastEngagement = Math.floor(Math.random() * 45);
    const projectSize = Math.floor(Math.random() * 150000) + 25000;

    const { score } = calculateFitScore(client, sentiment, lastEngagement, projectSize);

    return {
      id: client.id,
      company: client.company,
      fitScore: score,
      sentiment: Number(sentiment.toFixed(2)),
      projectType: getProjectType(client),
      industry: client.industry,
      mrr: Math.floor(Math.random() * 25000) + 5000,
      healthScore: client.healthScore || Math.floor(Math.random() * 30) + 70
    };
  });
};

const getProjectType = (client: Client): string => {
  const types = [
    'Platform Migration',
    'API Development',
    'ML Integration',
    'Cloud Infrastructure',
    'Security Audit',
    'Custom Development',
    'Data Analytics',
    'Mobile App'
  ];
  return types[Math.floor(Math.random() * types.length)];
};
