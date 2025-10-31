import { Client, CompanyService, ClientMatch } from '../types';

interface MatchInput {
  client: Client;
  service: CompanyService;
  clientSentiment?: number;
  lastInteractionDays?: number;
}

const calculateTagMatch = (clientTags: string[], serviceTags: string[]): number => {
  const matches = clientTags.filter(tag =>
    serviceTags.some(serviceTag =>
      serviceTag.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(serviceTag.toLowerCase())
    )
  );
  return matches.length * 3;
};

const calculateSentimentScore = (sentiment: number): number => {
  if (sentiment >= 0.7) return 1;
  if (sentiment >= 0.4) return 0.5;
  if (sentiment >= 0) return 0.2;
  return 0;
};

const calculateInteractionScore = (daysSinceInteraction: number): number => {
  if (daysSinceInteraction <= 7) return 2;
  if (daysSinceInteraction <= 14) return 1.5;
  if (daysSinceInteraction <= 30) return 1;
  return 0.5;
};

const calculateBudgetFit = (clientTier: string | undefined, serviceBudget: { min: number; max: number }): number => {
  const tierBudgets: Record<string, number> = {
    platinum: 150000,
    gold: 100000,
    silver: 50000,
    bronze: 25000
  };

  const estimatedBudget = tierBudgets[clientTier || 'bronze'] || 25000;
  const serviceAvg = (serviceBudget.min + serviceBudget.max) / 2;

  if (estimatedBudget >= serviceBudget.min && estimatedBudget <= serviceBudget.max) {
    return 1.5;
  } else if (Math.abs(estimatedBudget - serviceAvg) / serviceAvg < 0.3) {
    return 1;
  }
  return 0.5;
};

export const runMatchEngine = (
  clients: Client[],
  service: CompanyService
): ClientMatch[] => {
  const matches: ClientMatch[] = clients.map(client => {
    const sentiment = Math.random() * 1.2 - 0.2;
    const lastInteraction = Math.floor(Math.random() * 45);

    const tagScore = calculateTagMatch(client.tags, service.tags);
    const sentimentScore = calculateSentimentScore(sentiment);
    const interactionScore = calculateInteractionScore(lastInteraction);
    const budgetScore = calculateBudgetFit(client.tier, service.budgetRange);
    const healthScore = ((client.healthScore || 70) / 100) * 0.5;

    const totalScore = tagScore + sentimentScore + interactionScore + budgetScore + healthScore;
    const maxScore = 3 * 5 + 1 + 2 + 1.5 + 0.5;
    const normalizedScore = Math.min((totalScore / maxScore) * 100, 100);

    const signals: ClientMatch['signals'] = [];

    if (tagScore > 0) {
      const matchedTags = client.tags.filter(tag =>
        service.tags.some(serviceTag =>
          serviceTag.toLowerCase().includes(tag.toLowerCase()) ||
          tag.toLowerCase().includes(serviceTag.toLowerCase())
        )
      );
      signals.push({
        type: 'tags',
        description: `Matching service interests: ${matchedTags.join(', ')}`,
        weight: tagScore
      });
    }

    if (sentimentScore > 0.5) {
      signals.push({
        type: 'sentiment',
        description: `Positive client sentiment (${sentiment.toFixed(2)})`,
        weight: sentimentScore
      });
    }

    if (interactionScore >= 1.5) {
      signals.push({
        type: 'interactions',
        description: `Recent engagement (${lastInteraction} days ago)`,
        weight: interactionScore
      });
    }

    if (client.healthScore && client.healthScore >= 80) {
      signals.push({
        type: 'health',
        description: `Strong account health (${client.healthScore}%)`,
        weight: healthScore
      });
    }

    if (budgetScore >= 1) {
      signals.push({
        type: 'budget',
        description: `Budget alignment with service offering`,
        weight: budgetScore
      });
    }

    signals.sort((a, b) => b.weight - a.weight);
    const topSignals = signals.slice(0, 2);

    let primary = 'Client profile shows general alignment with service offering';
    let secondary = 'Account metrics indicate potential for engagement';

    if (topSignals.length >= 1) {
      primary = topSignals[0].description;
    }
    if (topSignals.length >= 2) {
      secondary = topSignals[1].description;
    }

    const confidence = Math.min(
      (signals.length / 5) * 100 + (normalizedScore > 70 ? 20 : 10),
      100
    );

    return {
      client,
      matchScore: Math.round(normalizedScore),
      confidence: Math.round(confidence),
      reasoning: {
        primary,
        secondary
      },
      signals: topSignals,
      recommendedService: service.name
    };
  });

  return matches
    .filter(match => match.matchScore >= 50)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 3);
};
