import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  website: string;
  apolloApiKey?: string;
}

// Apollo API Response Types
interface ApolloPrimaryPhone {
  number?: string;
  source?: string;
  sanitized_number?: string;
}

interface ApolloAccount {
  id?: string;
  name?: string;
  domain?: string;
  website_url?: string;
  phone?: string;
  sanitized_phone?: string;
  raw_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  logo_url?: string;
}

interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
  blog_url?: string | null;
  angellist_url?: string | null;
  linkedin_url?: string | null;
  twitter_url?: string | null;
  facebook_url?: string | null;
  primary_phone?: ApolloPrimaryPhone;
  phone?: string;
  sanitized_phone?: string;
  founded_year?: number;
  logo_url?: string;
  primary_domain?: string;
  industry?: string;
  estimated_num_employees?: number;
  industries?: string[];
  raw_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
  short_description?: string;
  technology_names?: string[];
  current_technologies?: Array<{
    uid?: string;
    name?: string;
    category?: string;
  }>;
  departmental_head_count?: {
    engineering?: number;
    entrepreneurship?: number;
    arts_and_design?: number;
    human_resources?: number;
    business_development?: number;
    product_management?: number;
    accounting?: number;
    sales?: number;
    operations?: number;
    finance?: number;
    marketing?: number;
    information_technology?: number;
    legal?: number;
    consulting?: number;
    education?: number;
    administrative?: number;
    media_and_commmunication?: number;
    support?: number;
    data_science?: number;
  };
  account?: ApolloAccount;
}

interface ApolloMixedCompanyAccount {
  id?: string;
  name?: string;
  website_url?: string;
  linkedin_url?: string | null;
  facebook_url?: string | null;
  primary_phone?: ApolloPrimaryPhone;
  phone?: string;
  sanitized_phone?: string;
  founded_year?: number;
  logo_url?: string;
  primary_domain?: string;
  organization_raw_address?: string;
  organization_postal_code?: string;
  organization_street_address?: string;
  organization_city?: string;
  organization_state?: string;
  organization_country?: string;
  raw_address?: string;
  street_address?: string;
  city?: string;
  state?: string;
  country?: string;
  domain?: string;
  num_contacts?: number;
  organization_headcount_six_month_growth?: number;
  organization_headcount_twelve_month_growth?: number;
  organization_headcount_twenty_four_month_growth?: number;
}

interface ApolloMixedCompaniesResponse {
  accounts?: ApolloMixedCompanyAccount[];
}

interface ApolloPerson {
  id?: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  emails?: Array<{
    email?: string;
    status?: string;
  }>;
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
  }>;
  linkedin_url?: string;
}

interface ApolloNewsArticle {
  id?: string;
  title?: string;
  url?: string;
  published_at?: string;
  description?: string;
}

interface EnrichedClientData {
  // Basic Info
  company?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  employeeCount?: string;
  founded?: string;
  description?: string;
  annualRevenue?: string;
  logoUrl?: string;
  
  // Location
  city?: string;
  country?: string;
  zipCode?: string;
  
  // Social Media
  linkedinUrl?: string;
  twitterUrl?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  
  // Contact Info
  email?: string;
  phone?: string;
  contactName?: string;
  primaryEmail?: string;
  alternateEmail?: string;
  primaryPhone?: string;
  alternatePhone?: string;
  jobTitle?: string;
  
  // Additional fields from Apollo
  tags?: string[];
  technologies?: Array<{
    name: string;
    category: string;
  }>;
  
  // News/Blogs
  blogs?: Array<{
    title: string;
    url: string;
    date: string;
  }>;
}

// Extract domain from URL
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace(/^www\./, '');
  } catch {
    // If URL parsing fails, try to extract domain from string
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    return match ? match[1] : null;
  }
}

// Enrich organization data from Apollo
async function enrichOrganization(
  domain: string,
  apolloApiKey: string
): Promise<ApolloOrganization | null> {
  try {
    const response = await fetch(
      `https://api.apollo.io/api/v1/organizations/enrich?domain=${encodeURIComponent(domain)}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo Organization Enrichment failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data = await response.json();
    console.log('Apollo Organization Enrichment Response:', JSON.stringify(data, null, 2));
    
    // Apollo returns organization directly or nested
    let organization = data.organization || data;
    console.log('Extracted Organization:', JSON.stringify(organization, null, 2));
    
    // If we have an organization ID, try to get complete organization info
    if (organization?.id) {
      try {
        const completeResponse = await fetch(
          `https://api.apollo.io/api/v1/organizations/${organization.id}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apolloApiKey,
            },
          }
        );

          if (completeResponse.ok) {
            const completeData = await completeResponse.json();
            console.log('Complete Organization Info Response:', JSON.stringify(completeData, null, 2));
            
            // Merge complete data with enrichment data (complete data takes precedence)
            const completeOrg = completeData.organization || completeData;
            organization = { ...organization, ...completeOrg };
            console.log('Merged Organization Data:', JSON.stringify(organization, null, 2));
          }
      } catch (error) {
        console.warn('Failed to fetch complete organization info, using enrichment data only:', error);
      }
    }
    
    return organization || null;
  } catch (error) {
    console.error('Error enriching organization:', error);
    return null;
  }
}

// Search for companies using mixed_companies/search endpoint
async function searchMixedCompanies(
  domain: string,
  apolloApiKey: string
): Promise<ApolloMixedCompanyAccount | null> {
  try {
    const response = await fetch(
      'https://api.apollo.io/api/v1/mixed_companies/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
        body: JSON.stringify({
          domain: domain,
          page: 1,
          per_page: 1,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo Mixed Companies Search failed: ${response.status} - ${errorText}`);
      return null;
    }

    const data: ApolloMixedCompaniesResponse = await response.json();
    console.log('Apollo Mixed Companies Search Response:', JSON.stringify(data, null, 2));
    
    if (data.accounts && data.accounts.length > 0) {
      return data.accounts[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error searching mixed companies:', error);
    return null;
  }
}

// Search for people in an organization
async function searchPeople(
  organizationId: string,
  apolloApiKey: string
): Promise<ApolloPerson[]> {
  try {
    const response = await fetch(
      'https://api.apollo.io/api/v1/mixed_people/api_search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
        body: JSON.stringify({
          organization_id: organizationId,
          person_titles: ['CEO', 'Founder', 'Co-Founder', 'President', 'VP', 'Vice President', 'Director', 'Manager'],
          page: 1,
          per_page: 10,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo People Search failed: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.people || [];
  } catch (error) {
    console.error('Error searching people:', error);
    return [];
  }
}

// Search for news articles about the organization
async function searchNewsArticles(
  organizationName: string,
  apolloApiKey: string
): Promise<ApolloNewsArticle[]> {
  try {
    const response = await fetch(
      'https://api.apollo.io/api/v1/news_articles/search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
        body: JSON.stringify({
          q_keywords: organizationName,
          page: 1,
          per_page: 10,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Apollo News Search failed: ${response.status} - ${errorText}`);
      return [];
    }

    const data = await response.json();
    return data.news_articles || [];
  } catch (error) {
    console.error('Error searching news articles:', error);
    return [];
  }
}

// Map Apollo organization data to client form data
function mapOrganizationToClientData(
  org: ApolloOrganization,
  mixedCompany: ApolloMixedCompanyAccount | null,
  people: ApolloPerson[],
  newsArticles: ApolloNewsArticle[]
): EnrichedClientData {
  console.log('\n=== STARTING mapOrganizationToClientData ===');
  console.log('Input Organization Object:', JSON.stringify(org, null, 2));
  console.log('Input Mixed Company Object:', JSON.stringify(mixedCompany, null, 2));
  console.log('Input People Array:', JSON.stringify(people, null, 2));
  console.log('Input News Articles Array:', JSON.stringify(newsArticles, null, 2));
  
  // Initialize all fields to ensure they're always present in the response
  const clientData: EnrichedClientData = {
    company: '',
    website: '',
    industry: '',
    companySize: '',
    employeeCount: '',
    founded: '',
    description: '',
    annualRevenue: '',
    logoUrl: '',
    city: '',
    country: '',
    zipCode: '',
    linkedinUrl: '',
    twitterUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    email: '',
    phone: '',
    contactName: '',
    primaryEmail: '',
    alternateEmail: '',
    primaryPhone: '',
    alternatePhone: '',
    jobTitle: '',
    tags: [],
    technologies: [],
    blogs: []
  };

  // Basic Info
  console.log('\n--- Mapping Basic Info ---');
  clientData.company = org.name || '';
  console.log('Mapped company:', clientData.company);
  
  // Website: prefer organization.website_url, fallback to account.website_url or mixedCompany.website_url
  clientData.website = org.website_url || org.account?.website_url || mixedCompany?.website_url || '';
  console.log('Mapped website:', clientData.website);
  
  // Industry
  clientData.industry = org.industry || '';
  console.log('Mapped industry:', clientData.industry);
  
  // Employee count: use estimated_num_employees from organization
  if (org.estimated_num_employees !== undefined && org.estimated_num_employees !== null) {
    clientData.companySize = org.estimated_num_employees.toString();
    clientData.employeeCount = org.estimated_num_employees.toString();
    console.log('Mapped employeeCount:', clientData.employeeCount);
  }
  
  // Founded year
  if (org.founded_year !== undefined && org.founded_year !== null) {
    clientData.founded = org.founded_year.toString();
    console.log('Mapped founded:', clientData.founded);
  } else if (mixedCompany?.founded_year !== undefined && mixedCompany?.founded_year !== null) {
    clientData.founded = mixedCompany.founded_year.toString();
    console.log('Mapped founded (from mixedCompany):', clientData.founded);
  }
  
  // Description: use short_description from organization
  clientData.description = org.short_description || '';
  console.log('Mapped description:', clientData.description);
  
  // Logo URL: prefer organization.logo_url, fallback to account.logo_url or mixedCompany.logo_url
  clientData.logoUrl = org.logo_url || org.account?.logo_url || mixedCompany?.logo_url || '';
  console.log('Mapped logoUrl:', clientData.logoUrl);

  // Location - Address fields with proper fallbacks
  console.log('\n--- Mapping Location ---');
  console.log('org.city:', org.city);
  console.log('org.account?.city:', org.account?.city);
  console.log('mixedCompany?.city:', mixedCompany?.city);
  console.log('mixedCompany?.organization_city:', mixedCompany?.organization_city);
  
  // City: prefer organization.city, fallback to account.city, then mixedCompany fields
  clientData.city = org.city || 
                    org.account?.city || 
                    mixedCompany?.city || 
                    mixedCompany?.organization_city || 
                    '';
  console.log('Mapped city:', clientData.city);
  
  console.log('org.country:', org.country);
  console.log('org.account?.country:', org.account?.country);
  console.log('mixedCompany?.country:', mixedCompany?.country);
  console.log('mixedCompany?.organization_country:', mixedCompany?.organization_country);
  
  // Country: prefer organization.country, fallback to account.country, then mixedCompany fields
  clientData.country = org.country || 
                       org.account?.country || 
                       mixedCompany?.country || 
                       mixedCompany?.organization_country || 
                       '';
  console.log('Mapped country:', clientData.country);
  
  console.log('org.postal_code:', org.postal_code);
  console.log('org.account?.postal_code:', org.account?.postal_code);
  console.log('mixedCompany?.organization_postal_code:', mixedCompany?.organization_postal_code);
  
  // Postal code: prefer organization.postal_code, fallback to account.postal_code, then mixedCompany fields
  clientData.zipCode = org.postal_code || 
                       org.account?.postal_code || 
                       mixedCompany?.organization_postal_code || 
                       '';
  console.log('Mapped zipCode:', clientData.zipCode);

  // Social Media
  console.log('\n--- Mapping Social Media ---');
  // LinkedIn: prefer organization.linkedin_url, fallback to mixedCompany.linkedin_url
  clientData.linkedinUrl = org.linkedin_url || mixedCompany?.linkedin_url || '';
  console.log('Mapped linkedinUrl:', clientData.linkedinUrl);
  
  // Twitter
  clientData.twitterUrl = org.twitter_url || '';
  console.log('Mapped twitterUrl:', clientData.twitterUrl);
  
  // Facebook: prefer organization.facebook_url, fallback to mixedCompany.facebook_url
  clientData.facebookUrl = org.facebook_url || mixedCompany?.facebook_url || '';
  console.log('Mapped facebookUrl:', clientData.facebookUrl);
  
  // Instagram (not in Apollo examples, but keeping for compatibility)
  clientData.instagramUrl = '';

  // Phone: proper fallback chain
  console.log('\n--- Mapping Phone ---');
  // Primary phone: organization.primary_phone?.number -> organization.phone -> account.phone -> mixedCompany.phone
  clientData.phone = org.primary_phone?.number || 
                     org.phone || 
                     org.account?.phone || 
                     mixedCompany?.phone || 
                     mixedCompany?.primary_phone?.number || 
                     '';
  console.log('Mapped phone:', clientData.phone);
  
  // Primary phone (sanitized): organization.primary_phone?.sanitized_number -> organization.sanitized_phone -> account.sanitized_phone -> mixedCompany.sanitized_phone
  clientData.primaryPhone = org.primary_phone?.sanitized_number || 
                            org.sanitized_phone || 
                            org.account?.sanitized_phone || 
                            mixedCompany?.sanitized_phone || 
                            mixedCompany?.primary_phone?.sanitized_number || 
                            '';
  console.log('Mapped primaryPhone:', clientData.primaryPhone);

  // People/Contact Info - Get the first person (usually CEO/Founder)
  console.log('\n--- Mapping People/Contact Info ---');
  console.log('People array length:', people.length);
  if (people.length > 0) {
    const primaryPerson = people[0];
    console.log('Primary Person:', JSON.stringify(primaryPerson, null, 2));
    
    // Contact name
    clientData.contactName = primaryPerson.name || 
                            (primaryPerson.first_name || primaryPerson.last_name 
                              ? `${primaryPerson.first_name || ''} ${primaryPerson.last_name || ''}`.trim() 
                              : '') || 
                            '';
    console.log('Mapped contactName:', clientData.contactName);
    
    // Job title
    clientData.jobTitle = primaryPerson.title || '';
    console.log('Mapped jobTitle:', clientData.jobTitle);
    
    // Primary email
    clientData.primaryEmail = primaryPerson.email || 
                             (primaryPerson.emails && primaryPerson.emails.length > 0 ? primaryPerson.emails[0].email : '') || 
                             '';
    // Also set email field to primaryEmail
    clientData.email = clientData.primaryEmail;
    console.log('Mapped primaryEmail:', clientData.primaryEmail);
    
    // Alternate email (if available)
    clientData.alternateEmail = (primaryPerson.emails && primaryPerson.emails.length > 1 ? primaryPerson.emails[1].email : '') || '';
    if (clientData.alternateEmail) {
      console.log('Mapped alternateEmail:', clientData.alternateEmail);
    }
    
    // Person phone (only if we don't already have organization phone)
    if (!clientData.primaryPhone && primaryPerson.phone_numbers && primaryPerson.phone_numbers.length > 0) {
      clientData.primaryPhone = primaryPerson.phone_numbers[0].sanitized_number || 
                                primaryPerson.phone_numbers[0].raw_number || 
                                '';
      if (clientData.primaryPhone) {
        console.log('Mapped primaryPhone (from person):', clientData.primaryPhone);
      }
    }
    
    // Alternate phone (if available)
    if (primaryPerson.phone_numbers && primaryPerson.phone_numbers.length > 1) {
      clientData.alternatePhone = primaryPerson.phone_numbers[1].sanitized_number || 
                                  primaryPerson.phone_numbers[1].raw_number || 
                                  '';
      if (clientData.alternatePhone) {
        console.log('Mapped alternatePhone:', clientData.alternatePhone);
      }
    }
  } else {
    console.log('No people found in array');
  }

  // News Articles as Blogs
  console.log('\n--- Mapping News Articles/Blogs ---');
  console.log('News articles array length:', newsArticles.length);
  if (newsArticles.length > 0) {
    console.log('Raw news articles:', JSON.stringify(newsArticles, null, 2));
    clientData.blogs = newsArticles
      .filter(article => article.title && article.url)
      .map(article => ({
        title: article.title || '',
        url: article.url || '',
        date: article.published_at ? new Date(article.published_at).toISOString().split('T')[0] : '',
      }))
      .slice(0, 10); // Limit to 10 articles
    console.log('Mapped blogs:', JSON.stringify(clientData.blogs, null, 2));
  } else {
    console.log('No news articles found');
  }

  // Tags: from industries or technology_names
  console.log('\n--- Mapping Tags ---');
  if (org.industries && org.industries.length > 0) {
    clientData.tags = org.industries;
    console.log('Mapped tags from industries:', clientData.tags);
  } else if (org.technology_names && org.technology_names.length > 0) {
    clientData.tags = org.technology_names;
    console.log('Mapped tags from technology_names:', clientData.tags);
  } else {
    clientData.tags = [];
    console.log('No tags found');
  }

  // Technologies: from current_technologies
  console.log('\n--- Mapping Technologies ---');
  if (org.current_technologies && org.current_technologies.length > 0) {
    clientData.technologies = org.current_technologies
      .filter(tech => tech.name)
      .map(tech => ({
        name: tech.name || '',
        category: tech.category || '',
      }));
    console.log('Mapped technologies:', JSON.stringify(clientData.technologies, null, 2));
  } else {
    clientData.technologies = [];
    console.log('No technologies found');
  }

  // Ensure location fields are always set (even if empty)
  clientData.city = clientData.city ?? '';
  clientData.country = clientData.country ?? '';
  clientData.zipCode = clientData.zipCode ?? '';

  console.log('\n=== FINAL MAPPED CLIENT DATA ===');
  console.log('City:', clientData.city);
  console.log('Country:', clientData.country);
  console.log('ZipCode:', clientData.zipCode);
  console.log('Full object:', JSON.stringify(clientData, null, 2));
  console.log('=== END mapOrganizationToClientData ===\n');

  return clientData;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with auth
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Apollo API key from request or environment
    const body: RequestBody = await req.json();
    const { website, apolloApiKey: requestKey } = body;

    if (!website) {
      return new Response(
        JSON.stringify({ error: 'Website URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract domain from website URL
    const domain = extractDomain(website);
    if (!domain) {
      return new Response(
        JSON.stringify({ error: 'Invalid website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Apollo API key from request, environment, or database
    let apolloApiKey = requestKey || Deno.env.get('APOLLO_API_KEY');
    
    if (!apolloApiKey) {
      // Try to get from database (filtered by user_id)
      const { data: apiKeys } = await supabaseClient
        .from('api_keys')
        .select('apollo_api_key')
        .eq('user_id', user.id)
        .maybeSingle();

      if (apiKeys?.apollo_api_key) {
        apolloApiKey = apiKeys.apollo_api_key;
      }
    }

    if (!apolloApiKey) {
      return new Response(
        JSON.stringify({ error: 'Apollo API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 1: Enrich organization data
    console.log(`Enriching organization for domain: ${domain}`);
    const organization = await enrichOrganization(domain, apolloApiKey);

    if (!organization) {
      return new Response(
        JSON.stringify({ error: 'Failed to enrich organization data' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Organization enriched: ${organization.name} (ID: ${organization.id})`);

    // Step 1.5: Search for mixed company data (for growth metrics and additional fields)
    console.log(`Searching mixed companies for domain: ${domain}`);
    const mixedCompany = await searchMixedCompanies(domain, apolloApiKey);
    if (mixedCompany) {
      console.log(`Found mixed company data: ${mixedCompany.name}`);
    }

    // Step 2: Search for people in the organization (if we have organization ID)
    let people: ApolloPerson[] = [];
    if (organization.id) {
      console.log(`Searching for people in organization: ${organization.id}`);
      people = await searchPeople(organization.id, apolloApiKey);
      console.log(`Found ${people.length} people`);
    }

    // Step 3: Search for news articles (if we have organization name)
    let newsArticles: ApolloNewsArticle[] = [];
    if (organization.name) {
      console.log(`Searching for news articles about: ${organization.name}`);
      newsArticles = await searchNewsArticles(organization.name, apolloApiKey);
      console.log(`Found ${newsArticles.length} news articles`);
    }

    // Step 4: Map Apollo data to client form data
    const enrichedData = mapOrganizationToClientData(organization, mixedCompany, people, newsArticles);
    
    // Explicitly construct response with all required fields to ensure they're always present
    // Use explicit checks to ensure fields exist, defaulting to empty string if undefined/null
    const responseData: EnrichedClientData = {
      company: (enrichedData.company !== undefined && enrichedData.company !== null) ? enrichedData.company : '',
      website: (enrichedData.website !== undefined && enrichedData.website !== null) ? enrichedData.website : '',
      industry: (enrichedData.industry !== undefined && enrichedData.industry !== null) ? enrichedData.industry : '',
      companySize: (enrichedData.companySize !== undefined && enrichedData.companySize !== null) ? enrichedData.companySize : '',
      employeeCount: (enrichedData.employeeCount !== undefined && enrichedData.employeeCount !== null) ? enrichedData.employeeCount : '',
      founded: (enrichedData.founded !== undefined && enrichedData.founded !== null) ? enrichedData.founded : '',
      description: (enrichedData.description !== undefined && enrichedData.description !== null) ? enrichedData.description : '',
      annualRevenue: (enrichedData.annualRevenue !== undefined && enrichedData.annualRevenue !== null) ? enrichedData.annualRevenue : '',
      logoUrl: (enrichedData.logoUrl !== undefined && enrichedData.logoUrl !== null) ? enrichedData.logoUrl : '',
      city: (enrichedData.city !== undefined && enrichedData.city !== null) ? enrichedData.city : '',
      country: (enrichedData.country !== undefined && enrichedData.country !== null) ? enrichedData.country : '',
      zipCode: (enrichedData.zipCode !== undefined && enrichedData.zipCode !== null) ? enrichedData.zipCode : '',
      linkedinUrl: (enrichedData.linkedinUrl !== undefined && enrichedData.linkedinUrl !== null) ? enrichedData.linkedinUrl : '',
      twitterUrl: (enrichedData.twitterUrl !== undefined && enrichedData.twitterUrl !== null) ? enrichedData.twitterUrl : '',
      facebookUrl: (enrichedData.facebookUrl !== undefined && enrichedData.facebookUrl !== null) ? enrichedData.facebookUrl : '',
      instagramUrl: (enrichedData.instagramUrl !== undefined && enrichedData.instagramUrl !== null) ? enrichedData.instagramUrl : '',
      email: (enrichedData.email !== undefined && enrichedData.email !== null) ? enrichedData.email : '',
      phone: (enrichedData.phone !== undefined && enrichedData.phone !== null) ? enrichedData.phone : '',
      contactName: (enrichedData.contactName !== undefined && enrichedData.contactName !== null) ? enrichedData.contactName : '',
      primaryEmail: (enrichedData.primaryEmail !== undefined && enrichedData.primaryEmail !== null) ? enrichedData.primaryEmail : '',
      alternateEmail: (enrichedData.alternateEmail !== undefined && enrichedData.alternateEmail !== null) ? enrichedData.alternateEmail : '',
      primaryPhone: (enrichedData.primaryPhone !== undefined && enrichedData.primaryPhone !== null) ? enrichedData.primaryPhone : '',
      alternatePhone: (enrichedData.alternatePhone !== undefined && enrichedData.alternatePhone !== null) ? enrichedData.alternatePhone : '',
      jobTitle: (enrichedData.jobTitle !== undefined && enrichedData.jobTitle !== null) ? enrichedData.jobTitle : '',
      tags: Array.isArray(enrichedData.tags) ? enrichedData.tags : [],
      technologies: Array.isArray(enrichedData.technologies) ? enrichedData.technologies : [],
      blogs: Array.isArray(enrichedData.blogs) ? enrichedData.blogs : [],
    };
    
    // Debug: Log the enriched data before returning
    console.log('\n=== FINAL ENRICHED DATA BEFORE RESPONSE ===');
    console.log('enrichedData keys:', Object.keys(enrichedData));
    console.log('enrichedData.city:', enrichedData.city, 'type:', typeof enrichedData.city);
    console.log('enrichedData.country:', enrichedData.country, 'type:', typeof enrichedData.country);
    console.log('enrichedData.zipCode:', enrichedData.zipCode, 'type:', typeof enrichedData.zipCode);
    console.log('responseData keys:', Object.keys(responseData));
    console.log('responseData.city:', responseData.city);
    console.log('responseData.country:', responseData.country);
    console.log('responseData.zipCode:', responseData.zipCode);
    console.log('Full responseData JSON:', JSON.stringify(responseData, null, 2));
    console.log('=== END FINAL ENRICHED DATA ===\n');

    // Ensure the response includes all fields
    const finalResponse = { data: responseData };
    console.log('Final response JSON:', JSON.stringify(finalResponse, null, 2));

    return new Response(
      JSON.stringify(finalResponse),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in apollo-enrich-client:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

/**
 * Mapping reference (Apollo -> our response):
 *
 * company              <- organization.name
 * website              <- organization.website_url || organization.account?.website_url || mixedCompany.website_url
 * industry             <- organization.industry
 * companySize          <- organization.estimated_num_employees (as string)
 * employeeCount        <- organization.estimated_num_employees (as string)
 * founded              <- organization.founded_year || mixedCompany.founded_year (as string)
 * description          <- organization.short_description
 * logoUrl              <- organization.logo_url || organization.account?.logo_url || mixedCompany.logo_url
 * city                 <- organization.city || organization.account?.city || mixedCompany.city || mixedCompany.organization_city
 * country              <- organization.country || organization.account?.country || mixedCompany.country || mixedCompany.organization_country
 * zipCode              <- organization.postal_code || organization.account?.postal_code || mixedCompany.organization_postal_code
 * linkedinUrl          <- organization.linkedin_url || mixedCompany.linkedin_url
 * twitterUrl           <- organization.twitter_url
 * facebookUrl          <- organization.facebook_url || mixedCompany.facebook_url
 * phone                <- organization.primary_phone?.number || organization.phone || organization.account?.phone || mixedCompany.phone || mixedCompany.primary_phone?.number
 * primaryPhone         <- organization.primary_phone?.sanitized_number || organization.sanitized_phone || organization.account?.sanitized_phone || mixedCompany.sanitized_phone || mixedCompany.primary_phone?.sanitized_number
 * contactName          <- people[0].name || people[0].first_name + last_name
 * jobTitle             <- people[0].title
 * primaryEmail         <- people[0].email || people[0].emails[0].email
 * alternateEmail       <- people[0].emails[1].email
 * alternatePhone       <- people[0].phone_numbers[1].sanitized_number || people[0].phone_numbers[1].raw_number
 * blogs                <- newsArticles mapped to {title, url, date}
 *
 * Note: The mixed_companies/search endpoint provides additional fields like:
 * - organization_headcount_twelve_month_growth (not currently mapped to EnrichedClientData)
 * - organization_headcount_six_month_growth (not currently mapped to EnrichedClientData)
 * - organization_headcount_twenty_four_month_growth (not currently mapped to EnrichedClientData)
 */

