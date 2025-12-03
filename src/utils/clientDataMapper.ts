import { ClientFormData } from '../pages/AddClient';

interface AIResponseData {
  company: string;
  website: string;
  industry: string;
  description: string;
  founded: string;
  companySize: string;
  employeeCount: string;
  annualRevenue: string;
  city: string;
  country: string;
  zipCode: string;
  linkedinUrl: string;
  twitterUrl: string;
  facebookUrl: string;
  instagramUrl: string;
  contactName: string;
  primaryEmail: string;
  primaryPhone: string;
  jobTitle: string;
  services: Array<{ name: string; description: string }>;
  technologies: Array<{ name: string; category: string }>;
  painPoints: Array<string>;
  competitors: Array<{ name: string; comparison: string }>;
  blogs: Array<{ title: string; url: string; date: string }>;
  shortTermGoals: string;
  longTermGoals: string;
}

export function mapAIResponseToFormData(
  aiResponse: AIResponseData,
  source: 'perplexity' | 'openai'
): ClientFormData {
  console.log(`[DATA-MAPPER] 🗺️  Starting data mapping`, { source });
  const startTime = Date.now();

  const mapped: ClientFormData = {
    company: String(aiResponse.company || '').trim(),
    website: String(aiResponse.website || '').trim(),
    industry: String(aiResponse.industry || '').trim(),
    email: String(aiResponse.primaryEmail || '').trim(),
    phone: String(aiResponse.primaryPhone || '').trim(),
    city: String(aiResponse.city || '').trim(),
    country: String(aiResponse.country || '').trim(),
    zipCode: String(aiResponse.zipCode || '').trim(),
    founded: String(aiResponse.founded || '').trim(),
    companySize: String(aiResponse.companySize || '').trim(),
    linkedinUrl: String(aiResponse.linkedinUrl || '').trim(),
    twitterUrl: String(aiResponse.twitterUrl || '').trim(),
    instagramUrl: String(aiResponse.instagramUrl || '').trim(),
    facebookUrl: String(aiResponse.facebookUrl || '').trim(),
    logoUrl: '', // Removed from requirements
    contactName: String(aiResponse.contactName || '').trim(),
    primaryEmail: String(aiResponse.primaryEmail || '').trim(),
    alternateEmail: '', // Removed from requirements
    primaryPhone: String(aiResponse.primaryPhone || '').trim(),
    alternatePhone: '', // Removed from requirements
    jobTitle: String(aiResponse.jobTitle || '').trim(),
    preferredContactMethod: 'email',
    shortTermGoals: String(aiResponse.shortTermGoals || '').trim(),
    longTermGoals: String(aiResponse.longTermGoals || '').trim(),
    expectations: '', // Removed from requirements
    satisfactionScore: 0,
    satisfactionFeedback: '',
    status: 'prospect', // Default value
    tags: [], // Removed from requirements
    description: String(aiResponse.description || '').trim(),
    csm: '', // Removed from requirements
    annualRevenue: String(aiResponse.annualRevenue || '').trim(),
    employeeCount: String(aiResponse.employeeCount || '').trim(),
    services: Array.isArray(aiResponse.services) 
      ? aiResponse.services
          .filter(s => s && s.name)
          .map(s => ({
            name: String(s.name || '').trim(),
            description: String(s.description || '').trim(),
          }))
      : [],
    technologies: Array.isArray(aiResponse.technologies)
      ? aiResponse.technologies
          .filter(t => t && t.name)
          .map(t => ({
            name: String(t.name || '').trim(),
            category: String(t.category || '').trim(),
          }))
      : [],
    blogs: Array.isArray(aiResponse.blogs)
      ? aiResponse.blogs
          .filter(b => b && b.title)
          .map(b => ({
            title: String(b.title || '').trim(),
            url: String(b.url || '').trim(),
            date: String(b.date || '').trim(),
          }))
      : [],
    painPoints: Array.isArray(aiResponse.painPoints)
      ? aiResponse.painPoints
          .filter(p => p && String(p).trim())
          .map(p => String(p).trim())
      : [],
    competitors: Array.isArray(aiResponse.competitors)
      ? aiResponse.competitors
          .filter(c => c && c.name)
          .map(c => ({
            name: String(c.name || '').trim(),
            comparison: String(c.comparison || '').trim(),
          }))
      : [],
  };

  const duration = Date.now() - startTime;
  const totalFields = Object.keys(mapped).length;
  const populatedFields = Object.values(mapped).filter(v => {
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'string') return v.trim().length > 0;
    if (typeof v === 'number') return v > 0;
    return v !== null && v !== undefined;
  }).length;

  console.log(`[DATA-MAPPER] ✅ Mapping complete`, {
    source,
    duration: `${duration}ms`,
    populatedFields,
    totalFields,
    completeness: `${Math.round((populatedFields / totalFields) * 100)}%`,
    services: mapped.services.length,
    technologies: mapped.technologies.length,
    blogs: mapped.blogs.length,
  });

  return mapped;
}

