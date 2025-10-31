import { Client, GeneratedPitch, PitchGeneratorInput } from '../types';

interface PitchTemplate {
  elevator: {
    formal: string[];
    casual: string[];
  };
  valuePoints: {
    formal: string[];
    casual: string[];
  };
  nextActions: string[];
}

const templates: PitchTemplate = {
  elevator: {
    formal: [
      "We help {industry} companies achieve {benefit} through {service}. For {company}, this is particularly valuable because {signal}.",
      "{company} faces challenges in {painPoint}. Our {service} solutions enable {industry} leaders to {benefit}, driving measurable results in {metric}.",
      "As a trusted partner to {industry} organizations, we specialize in {service} that delivers {benefit}. Given {company}'s focus on {focus}, our approach aligns perfectly with your strategic objectives.",
      "We partner with {industry} companies like {company} to transform {painPoint} into competitive advantages through {service}. Our proven methodology ensures {benefit} with minimal disruption."
    ],
    casual: [
      "We're all about helping {industry} teams like yours nail {benefit} with smart {service}. From what we've seen with {company}, you'd really benefit from {signal}.",
      "Hey, so we work with {industry} companies to solve {painPoint} using {service}. For {company}, this could mean {benefit} – which seems right up your alley.",
      "Quick intro: we help {industry} teams get {benefit} through {service}. Given what {company} is doing with {focus}, we think there's a great fit here.",
      "We've helped other {industry} companies turn {painPoint} into wins with our {service}. {company} could see similar {benefit} based on your current trajectory."
    ]
  },
  valuePoints: {
    formal: [
      "Accelerate time-to-value with proven {service} frameworks that reduce implementation cycles by 40-60%",
      "Leverage our expertise in {industry} to avoid common pitfalls and ensure project success from day one",
      "Scale efficiently with solutions designed for {industry} companies experiencing rapid growth",
      "Gain competitive advantage through cutting-edge {service} that differentiate your market position",
      "Reduce operational costs while improving performance through optimized {service} delivery",
      "Access dedicated support from industry veterans who understand {industry} challenges intimately",
      "Mitigate risk with battle-tested approaches refined across {industry} implementations",
      "Drive measurable ROI with data-driven {service} strategies aligned to your business objectives"
    ],
    casual: [
      "Get up and running fast – our {service} approach cuts typical timelines in half",
      "We've been doing {service} in {industry} for years, so we know all the gotchas",
      "Built to scale with you – whether you're 10 or 10,000 people",
      "Stay ahead of competitors with the latest {service} tech and best practices",
      "Do more with less – better results without breaking the bank",
      "Real people who get {industry} supporting you every step of the way",
      "Less risk, more reward – we've seen every scenario and know what works",
      "Show clear results to stakeholders with metrics that matter"
    ]
  },
  nextActions: [
    "Schedule a 30-minute discovery call to explore specific use cases and pain points",
    "Review a customized proposal outlining timeline, approach, and expected outcomes",
    "Conduct a technical assessment to identify quick wins and optimization opportunities",
    "Share relevant case studies from similar {industry} implementations",
    "Arrange a demo showcasing our {service} capabilities tailored to your requirements",
    "Connect with existing {industry} clients for peer references and insights",
    "Participate in a workshop to align stakeholders and define success criteria",
    "Receive a proof-of-concept proposal to validate fit before full commitment"
  ]
};

const getBenefit = (services: string[], tone: 'formal' | 'casual'): string => {
  const benefits: Record<string, { formal: string; casual: string }> = {
    migration: {
      formal: 'seamless digital transformation and infrastructure modernization',
      casual: 'smooth tech upgrades without the headaches'
    },
    api: {
      formal: 'robust integration capabilities and operational efficiency',
      casual: 'rock-solid connections between your systems'
    },
    ml: {
      formal: 'data-driven insights and intelligent automation',
      casual: 'smarter automation that actually works'
    },
    cloud: {
      formal: 'scalable infrastructure and enhanced reliability',
      casual: 'infrastructure that grows with you'
    },
    development: {
      formal: 'custom solutions aligned to strategic objectives',
      casual: 'tech built exactly how you need it'
    }
  };

  const serviceKey = services[0]?.toLowerCase() || 'development';
  for (const [key, value] of Object.entries(benefits)) {
    if (serviceKey.includes(key)) {
      return value[tone];
    }
  }
  return benefits.development[tone];
};

const getPainPoint = (client: Client): string => {
  const painPoints = [
    'legacy system constraints',
    'scaling challenges',
    'integration complexity',
    'operational inefficiencies',
    'technical debt',
    'resource constraints',
    'competitive pressure',
    'rapid growth demands'
  ];
  return painPoints[Math.floor(Math.random() * painPoints.length)];
};

const getMetric = (): string => {
  const metrics = [
    'weeks rather than months',
    'measurable cost reduction',
    'improved system reliability',
    'enhanced user satisfaction',
    'accelerated time-to-market',
    'increased operational efficiency'
  ];
  return metrics[Math.floor(Math.random() * metrics.length)];
};

const getFocus = (client: Client): string => {
  if (client.tags.length > 0) {
    return client.tags[0];
  }
  return 'innovation and growth';
};

const getSignal = (client: Client): string => {
  const signals = [
    'your team\'s proven track record in innovation',
    'the strategic initiatives outlined in your recent roadmap',
    'your organization\'s commitment to digital excellence',
    'the growth trajectory and market position',
    'your investment in technology and infrastructure',
    'the alignment with your business objectives'
  ];
  return signals[Math.floor(Math.random() * signals.length)];
};

const selectValuePoints = (
  template: string[],
  services: string[],
  industry: string,
  count: number
): string[] => {
  const shuffled = [...template].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, count)
    .map(point =>
      point
        .replace(/{service}/g, services[0] || 'solution')
        .replace(/{industry}/g, industry)
    );
};

const selectNextActions = (
  services: string[],
  industry: string,
  count: number
): string[] => {
  const shuffled = [...templates.nextActions].sort(() => Math.random() - 0.5);
  return shuffled
    .slice(0, count)
    .map(action =>
      action
        .replace(/{service}/g, services[0] || 'solution')
        .replace(/{industry}/g, industry)
    );
};

const getEvidenceTags = (client: Client): string[] => {
  const tags = ['persona-sentiment', 'engagement-history', 'industry-fit'];

  if (client.tags.length > 0) {
    tags.push('service-alignment');
  }

  if (client.healthScore && client.healthScore > 75) {
    tags.push('account-health');
  }

  return tags.slice(0, 4);
};

const calculateConfidence = (client: Client, services: string[]): number => {
  let confidence = 60;

  if (client.tags.length >= 2) confidence += 10;

  if (client.healthScore && client.healthScore >= 80) confidence += 10;

  const hasServiceMatch = client.tags.some(tag =>
    services.some(service =>
      service.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(service.toLowerCase())
    )
  );
  if (hasServiceMatch) confidence += 15;

  if (client.tier === 'platinum' || client.tier === 'gold') confidence += 5;

  return Math.min(confidence, 95);
};

export const generatePitch = (
  input: PitchGeneratorInput,
  client: Client,
  variant: 'A' | 'B' = 'A'
): GeneratedPitch => {
  const { tone, length, services } = input;

  const templateIndex = variant === 'A' ? 0 : 1;
  const elevatorTemplate = templates.elevator[tone][templateIndex % templates.elevator[tone].length];

  const benefit = getBenefit(services, tone);
  const painPoint = getPainPoint(client);
  const metric = getMetric();
  const focus = getFocus(client);
  const signal = getSignal(client);

  const elevatorPitch = elevatorTemplate
    .replace(/{industry}/g, client.industry)
    .replace(/{company}/g, client.company)
    .replace(/{benefit}/g, benefit)
    .replace(/{service}/g, services.join(', '))
    .replace(/{signal}/g, signal)
    .replace(/{painPoint}/g, painPoint)
    .replace(/{metric}/g, metric)
    .replace(/{focus}/g, focus);

  const valuePointCount = length === 'long' ? 5 : 3;
  const valuePoints = selectValuePoints(
    templates.valuePoints[tone],
    services,
    client.industry,
    valuePointCount
  );

  const nextActionCount = length === 'long' ? 3 : 2;
  const nextActions = selectNextActions(services, client.industry, nextActionCount);

  const confidence = calculateConfidence(client, services);
  const evidenceTags = getEvidenceTags(client);

  return {
    id: `pitch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    clientId: client.id,
    clientName: client.name,
    clientCompany: client.company,
    services,
    tone,
    length,
    elevatorPitch,
    valuePoints,
    nextActions,
    confidence,
    evidenceTags,
    variant,
    createdAt: new Date().toISOString(),
    companyDescription: input.companyDescription
  };
};

export const generatePitchVariants = (
  input: PitchGeneratorInput,
  client: Client
): { variantA: GeneratedPitch; variantB: GeneratedPitch } => {
  return {
    variantA: generatePitch(input, client, 'A'),
    variantB: generatePitch(input, client, 'B')
  };
};
