import { PersonaMetrics, EvidenceSnippet, Document, CallRecord, MeetingTranscript } from '../types';

/**
 * PERSONA GENERATION PSEUDO-CODE
 *
 * This module generates persona metrics from mock data using deterministic rules.
 * The analysis simulates AI-powered insights based on patterns in client interactions.
 *
 * GENERATION RULES:
 *
 * 1. SENTIMENT CALCULATION:
 *    - Start with baseline sentiment of 0 (neutral)
 *    - For each document:
 *      * If title/name contains "negative", "issue", "problem", "concern" → -0.2
 *      * If title/name contains "positive", "success", "great", "excellent" → +0.2
 *      * If summary contains negative keywords → -0.1
 *      * If summary contains positive keywords → +0.1
 *    - For each call record:
 *      * sentiment: 'negative' → -0.15
 *      * sentiment: 'positive' → +0.15
 *      * sentiment: 'neutral' → 0
 *    - Normalize final score to range [-1, 1]
 *
 * 2. COOPERATION SCORE:
 *    - Calculate average response time from mock data
 *    - If avg response > 7 days → cooperation: 'low'
 *    - If avg response 3-7 days → cooperation: 'medium'
 *    - If avg response < 3 days → cooperation: 'high'
 *
 * 3. RISK LEVEL:
 *    - Check for risk indicators in documents:
 *      * "payment delay", "overdue", "dispute" → risk++
 *      * "lawsuit", "breach", "terminate" → risk += 2
 *    - If sentiment < -0.5 → risk++
 *    - If cooperation = 'low' → risk++
 *    - Final mapping: risk 0-1: 'low', 2: 'medium', 3: 'high', 4+: 'critical'
 *
 * 4. COMMUNICATION STYLE:
 *    - Analyze document count and call frequency
 *    - High document count + frequent calls → 'Collaborative'
 *    - Low document count + infrequent calls → 'Minimal'
 *    - Medium activity with formal documents → 'Formal'
 *    - High email frequency → 'Direct'
 *
 * 5. RESPONSE SPEED:
 *    - Mock calculation based on timestamps
 *    - Calculate average days between interactions
 *    - Confidence based on sample size (more data = higher confidence)
 *
 * 6. NEGOTIATION TONE:
 *    - Analyze keywords in documents and calls
 *    - "must", "require", "demand" → 'Assertive'
 *    - "consider", "perhaps", "maybe" → 'Flexible'
 *    - "concern", "careful", "review" → 'Cautious'
 *
 * 7. ENGAGEMENT PATTERN:
 *    - Regular intervals → 'Consistent'
 *    - Irregular with long gaps → 'Sporadic'
 *    - Quick responses, frequent updates → 'Proactive'
 *    - Only responds when prompted → 'Reactive'
 */

export interface PersonaGenerationInput {
  documents: Document[];
  calls: CallRecord[];
  meetings: MeetingTranscript[];
  emails?: any[];
}

const negativeKeywords = [
  'negative', 'issue', 'problem', 'concern', 'worry', 'risk', 'delay',
  'dispute', 'difficult', 'challenge', 'complaint', 'unhappy', 'dissatisfied',
  'payment delay', 'overdue', 'breach', 'terminate', 'lawsuit'
];

const positiveKeywords = [
  'positive', 'success', 'great', 'excellent', 'happy', 'satisfied',
  'progress', 'achievement', 'milestone', 'opportunity', 'excited',
  'pleased', 'appreciate', 'wonderful', 'fantastic'
];

const assertiveKeywords = ['must', 'require', 'demand', 'need', 'insist', 'expect'];
const flexibleKeywords = ['consider', 'perhaps', 'maybe', 'could', 'might', 'open to'];
const cautiousKeywords = ['concern', 'careful', 'review', 'analyze', 'ensure', 'verify'];

export function generatePersonaMetrics(input: PersonaGenerationInput): {
  metrics: PersonaMetrics;
  evidence: EvidenceSnippet[];
} {
  const evidence: EvidenceSnippet[] = [];
  let sentimentScore = 0;
  let riskFactors = 0;

  const { documents, calls, meetings } = input;
  const allItems = [...documents, ...calls, ...meetings];

  // 1. SENTIMENT ANALYSIS
  documents.forEach((doc) => {
    const nameAndSummary = `${doc.name} ${doc.summary || ''}`.toLowerCase();

    negativeKeywords.forEach(keyword => {
      if (nameAndSummary.includes(keyword)) {
        const contribution = doc.name.toLowerCase().includes(keyword) ? -0.2 : -0.1;
        sentimentScore += contribution;

        evidence.push({
          id: `${doc.id}-neg`,
          text: `Document indicates ${keyword}`,
          source: doc.name,
          sourceType: 'document',
          contribution,
          sentiment: 'negative',
          date: doc.uploadedAt
        });

        if (keyword.includes('payment') || keyword.includes('breach') || keyword.includes('lawsuit')) {
          riskFactors += 2;
        } else if (keyword.includes('delay') || keyword.includes('dispute')) {
          riskFactors += 1;
        }
      }
    });

    positiveKeywords.forEach(keyword => {
      if (nameAndSummary.includes(keyword)) {
        const contribution = doc.name.toLowerCase().includes(keyword) ? 0.2 : 0.1;
        sentimentScore += contribution;

        evidence.push({
          id: `${doc.id}-pos`,
          text: `Document shows ${keyword}`,
          source: doc.name,
          sourceType: 'document',
          contribution,
          sentiment: 'positive',
          date: doc.uploadedAt
        });
      }
    });
  });

  calls.forEach((call) => {
    const contribution = call.sentiment === 'positive' ? 0.15 : call.sentiment === 'negative' ? -0.15 : 0;
    sentimentScore += contribution;

    if (contribution !== 0) {
      evidence.push({
        id: call.id,
        text: call.summary,
        source: `Call on ${new Date(call.date).toLocaleDateString()}`,
        sourceType: 'call',
        contribution,
        sentiment: call.sentiment,
        date: call.date
      });
    }

    if (call.sentiment === 'negative') {
      riskFactors += 0.5;
    }
  });

  meetings.forEach((meeting) => {
    if (meeting.sentiment) {
      const contribution = meeting.sentiment === 'positive' ? 0.15 : meeting.sentiment === 'negative' ? -0.15 : 0;
      sentimentScore += contribution;

      if (contribution !== 0) {
        evidence.push({
          id: meeting.id,
          text: meeting.title,
          source: `Meeting: ${meeting.title}`,
          sourceType: 'meeting',
          contribution,
          sentiment: meeting.sentiment,
          date: meeting.date
        });
      }
    }
  });

  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  // 2. RESPONSE SPEED & COOPERATION
  const timestamps = allItems
    .map(item => new Date(('uploadedAt' in item ? item.uploadedAt : 'date' in item ? item.date : item.createdAt)).getTime())
    .sort((a, b) => a - b);

  let avgResponseDays = 2;
  if (timestamps.length > 1) {
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24));
    }
    avgResponseDays = Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length);
  }

  const cooperation: 'high' | 'medium' | 'low' = avgResponseDays < 3 ? 'high' : avgResponseDays < 7 ? 'medium' : 'low';

  if (cooperation === 'low') riskFactors += 1;
  if (sentimentScore < -0.5) riskFactors += 1;

  // 3. RISK LEVEL
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    riskFactors <= 1 ? 'low' :
    riskFactors === 2 ? 'medium' :
    riskFactors === 3 ? 'high' : 'critical';

  // 4. COMMUNICATION STYLE
  const docCount = documents.length;
  const callCount = calls.length;
  const totalInteractions = docCount + callCount;

  let communicationStyle = 'Direct';
  let commConfidence: 'high' | 'medium' | 'low' = 'medium';

  if (totalInteractions > 10) {
    commConfidence = 'high';
    if (callCount > docCount * 1.5) {
      communicationStyle = 'Verbal & Collaborative';
    } else if (docCount > callCount * 1.5) {
      communicationStyle = 'Written & Formal';
    } else {
      communicationStyle = 'Balanced & Adaptive';
    }
  } else if (totalInteractions > 5) {
    communicationStyle = 'Moderate';
  } else {
    commConfidence = 'low';
    communicationStyle = 'Minimal Data';
  }

  // 5. NEGOTIATION TONE
  const allText = [
    ...documents.map(d => `${d.name} ${d.summary || ''}`),
    ...calls.map(c => c.summary)
  ].join(' ').toLowerCase();

  const assertiveCount = assertiveKeywords.filter(k => allText.includes(k)).length;
  const flexibleCount = flexibleKeywords.filter(k => allText.includes(k)).length;
  const cautiousCount = cautiousKeywords.filter(k => allText.includes(k)).length;

  let negotiationTone = 'Balanced';
  let negConfidence: 'high' | 'medium' | 'low' = 'medium';

  if (assertiveCount > flexibleCount && assertiveCount > cautiousCount) {
    negotiationTone = 'Assertive';
    negConfidence = assertiveCount > 3 ? 'high' : 'medium';
  } else if (flexibleCount > assertiveCount && flexibleCount > cautiousCount) {
    negotiationTone = 'Flexible';
    negConfidence = flexibleCount > 3 ? 'high' : 'medium';
  } else if (cautiousCount > assertiveCount && cautiousCount > flexibleCount) {
    negotiationTone = 'Cautious';
    negConfidence = cautiousCount > 3 ? 'high' : 'medium';
  } else {
    negConfidence = 'low';
  }

  // 6. ENGAGEMENT PATTERN
  let engagementPattern = 'Reactive';
  let engConfidence: 'high' | 'medium' | 'low' = 'medium';

  if (timestamps.length > 3) {
    const gaps = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push(timestamps[i] - timestamps[i - 1]);
    }

    const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < avgGap * 0.3) {
      engagementPattern = 'Consistent';
      engConfidence = 'high';
    } else if (avgGap < 7 * 24 * 60 * 60 * 1000) {
      engagementPattern = 'Proactive';
      engConfidence = 'high';
    } else if (stdDev > avgGap * 0.7) {
      engagementPattern = 'Sporadic';
      engConfidence = 'high';
    }
  } else {
    engConfidence = 'low';
  }

  // 7. PROJECT TYPES
  const projectKeywords = {
    'Web Development': ['website', 'web', 'frontend', 'backend', 'api'],
    'Mobile App': ['mobile', 'app', 'ios', 'android'],
    'Consulting': ['consulting', 'advisory', 'strategy', 'analysis'],
    'Design': ['design', 'ui', 'ux', 'branding', 'graphics'],
    'Integration': ['integration', 'api', 'connect', 'sync'],
    'Migration': ['migration', 'upgrade', 'transfer', 'move'],
    'Support': ['support', 'maintenance', 'help', 'fix'],
  };

  const projectTypes: string[] = [];
  Object.entries(projectKeywords).forEach(([type, keywords]) => {
    const matches = keywords.filter(k => allText.includes(k)).length;
    if (matches > 0) {
      projectTypes.push(type);
    }
  });

  if (projectTypes.length === 0) {
    projectTypes.push('General Services');
  }

  // 8. SENTIMENT TREND (simulated over time)
  const trendLength = 10;
  const sentimentTrend = Array.from({ length: trendLength }, (_, i) => {
    const progress = i / (trendLength - 1);
    const noise = (Math.random() - 0.5) * 0.2;
    return Math.max(-1, Math.min(1, sentimentScore * 0.5 + progress * sentimentScore * 0.5 + noise));
  });

  const metrics: PersonaMetrics = {
    sentiment: sentimentScore,
    cooperation,
    riskLevel,
    communicationStyle: {
      value: communicationStyle,
      confidence: commConfidence
    },
    responseSpeed: {
      avgDays: avgResponseDays,
      confidence: timestamps.length > 5 ? 'high' : timestamps.length > 2 ? 'medium' : 'low'
    },
    negotiationTone: {
      value: negotiationTone,
      confidence: negConfidence
    },
    engagementPattern: {
      value: engagementPattern,
      confidence: engConfidence
    },
    topProjectTypes: projectTypes.slice(0, 5),
    sentimentTrend
  };

  return { metrics, evidence: evidence.slice(0, 20) };
}
