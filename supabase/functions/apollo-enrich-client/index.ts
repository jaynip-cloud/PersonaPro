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

interface ApolloOrganization {
  id?: string;
  name?: string;
  company?: string; // Alternative field name
  website_url?: string;
  website?: string; // Alternative field name
  industry?: string;
  company_size?: string;
  estimated_num_employees?: string | number;
  founded_year?: number;
  founded?: string | number; // Alternative field name
  description?: string;
  annual_revenue?: string;
  logo_url?: string;
  logoUrl?: string; // Alternative field name
  linkedin_url?: string;
  linkedinUrl?: string; // Alternative field name
  twitter_url?: string;
  twitterUrl?: string; // Alternative field name
  facebook_url?: string;
  facebookUrl?: string; // Alternative field name
  instagram_url?: string;
  instagramUrl?: string; // Alternative field name
  location?: {
    city?: string;
    state?: string;
    country?: string;
    postal_code?: string;
    street_address?: string;
  };
  primary_phone?: {
    number?: string;
    sanitized_number?: string;
  };
  phone_numbers?: Array<{
    raw_number?: string;
    sanitized_number?: string;
    number?: string;
  }>;
  phone?: string; // Alternative field name
  primary_email?: string;
  email_addresses?: Array<{
    email?: string;
  }>;
  email?: string; // Alternative field name
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
  people: ApolloPerson[],
  newsArticles: ApolloNewsArticle[]
): EnrichedClientData {
  console.log('\n=== STARTING mapOrganizationToClientData ===');
  console.log('Input Organization Object:', JSON.stringify(org, null, 2));
  console.log('Input People Array:', JSON.stringify(people, null, 2));
  console.log('Input News Articles Array:', JSON.stringify(newsArticles, null, 2));
  
  const clientData: EnrichedClientData = {};

  // Basic Info - Handle multiple possible field names
  console.log('\n--- Mapping Basic Info ---');
  console.log('org.name:', org.name);
  console.log('org.company:', org.company);
  clientData.company = org.name || org.company || '';
  console.log('Mapped company:', clientData.company);
  
  console.log('org.website_url:', org.website_url);
  console.log('org.website:', org.website);
  clientData.website = org.website_url || org.website || '';
  console.log('Mapped website:', clientData.website);
  
  console.log('org.industry:', org.industry);
  clientData.industry = org.industry || '';
  console.log('Mapped industry:', clientData.industry);
  
  // Company size / Employee count
  console.log('\n--- Mapping Company Size ---');
  console.log('org.company_size:', org.company_size);
  console.log('org.estimated_num_employees:', org.estimated_num_employees);
  const companySize = org.company_size || org.estimated_num_employees;
  if (companySize) {
    const sizeStr = typeof companySize === 'number' ? companySize.toString() : companySize;
    clientData.companySize = sizeStr;
    clientData.employeeCount = sizeStr;
    console.log('Mapped companySize:', clientData.companySize);
    console.log('Mapped employeeCount:', clientData.employeeCount);
  } else {
    console.log('No company size found');
  }
  
  // Founded year - handle both number and string
  console.log('\n--- Mapping Founded Year ---');
  console.log('org.founded_year:', org.founded_year);
  console.log('org.founded:', org.founded);
  if (org.founded_year) {
    clientData.founded = org.founded_year.toString();
    console.log('Mapped founded (from founded_year):', clientData.founded);
  } else if (org.founded) {
    clientData.founded = typeof org.founded === 'number' ? org.founded.toString() : org.founded;
    console.log('Mapped founded (from founded):', clientData.founded);
  } else {
    console.log('No founded year found');
  }
  
  console.log('org.description:', org.description);
  clientData.description = org.description || '';
  console.log('Mapped description:', clientData.description);
  
  console.log('org.annual_revenue:', org.annual_revenue);
  clientData.annualRevenue = org.annual_revenue || '';
  console.log('Mapped annualRevenue:', clientData.annualRevenue);
  
  // Logo URL - handle multiple field names
  console.log('\n--- Mapping Logo URL ---');
  console.log('org.logo_url:', org.logo_url);
  console.log('org.logoUrl:', org.logoUrl);
  clientData.logoUrl = org.logo_url || org.logoUrl || '';
  console.log('Mapped logoUrl:', clientData.logoUrl);

  // Location
  console.log('\n--- Mapping Location ---');
  console.log('org.location:', JSON.stringify(org.location, null, 2));
  if (org.location) {
    clientData.city = org.location.city || '';
    clientData.country = org.location.country || '';
    clientData.zipCode = org.location.postal_code || '';
    console.log('Mapped city:', clientData.city);
    console.log('Mapped country:', clientData.country);
    console.log('Mapped zipCode:', clientData.zipCode);
  } else {
    console.log('No location object found');
  }

  // Social Media - handle multiple field name formats
  console.log('\n--- Mapping Social Media ---');
  console.log('org.linkedin_url:', org.linkedin_url);
  console.log('org.linkedinUrl:', org.linkedinUrl);
  clientData.linkedinUrl = org.linkedin_url || org.linkedinUrl || '';
  console.log('Mapped linkedinUrl:', clientData.linkedinUrl);
  
  console.log('org.twitter_url:', org.twitter_url);
  console.log('org.twitterUrl:', org.twitterUrl);
  clientData.twitterUrl = org.twitter_url || org.twitterUrl || '';
  console.log('Mapped twitterUrl:', clientData.twitterUrl);
  
  console.log('org.facebook_url:', org.facebook_url);
  console.log('org.facebookUrl:', org.facebookUrl);
  clientData.facebookUrl = org.facebook_url || org.facebookUrl || '';
  console.log('Mapped facebookUrl:', clientData.facebookUrl);
  
  console.log('org.instagram_url:', org.instagram_url);
  console.log('org.instagramUrl:', org.instagramUrl);
  clientData.instagramUrl = org.instagram_url || org.instagramUrl || '';
  console.log('Mapped instagramUrl:', clientData.instagramUrl);

  // Organization-level contact info - handle multiple formats
  console.log('\n--- Mapping Organization Contact Info ---');
  console.log('org.email:', org.email);
  console.log('org.primary_email:', org.primary_email);
  console.log('org.email_addresses:', JSON.stringify(org.email_addresses, null, 2));
  if (org.email || org.primary_email) {
    clientData.email = org.email || org.primary_email || '';
    console.log('Mapped email (from email/primary_email):', clientData.email);
  } else if (org.email_addresses && org.email_addresses.length > 0) {
    clientData.email = org.email_addresses[0].email || '';
    console.log('Mapped email (from email_addresses[0]):', clientData.email);
  } else {
    console.log('No email found');
  }
  
  console.log('org.phone:', org.phone);
  console.log('org.primary_phone:', JSON.stringify(org.primary_phone, null, 2));
  console.log('org.phone_numbers:', JSON.stringify(org.phone_numbers, null, 2));
  if (org.phone) {
    clientData.phone = org.phone;
    console.log('Mapped phone (from phone):', clientData.phone);
  } else if (org.primary_phone) {
    clientData.phone = org.primary_phone.sanitized_number || org.primary_phone.number || '';
    console.log('Mapped phone (from primary_phone):', clientData.phone);
  } else if (org.phone_numbers && org.phone_numbers.length > 0) {
    const phone = org.phone_numbers[0];
    clientData.phone = phone.sanitized_number || phone.number || phone.raw_number || '';
    console.log('Mapped phone (from phone_numbers[0]):', clientData.phone);
  } else {
    console.log('No phone found');
  }

  // People/Contact Info - Get the first person (usually CEO/Founder)
  console.log('\n--- Mapping People/Contact Info ---');
  console.log('People array length:', people.length);
  if (people.length > 0) {
    const primaryPerson = people[0];
    console.log('Primary Person:', JSON.stringify(primaryPerson, null, 2));
    
    console.log('primaryPerson.name:', primaryPerson.name);
    console.log('primaryPerson.first_name:', primaryPerson.first_name);
    console.log('primaryPerson.last_name:', primaryPerson.last_name);
    if (primaryPerson.name) {
      clientData.contactName = primaryPerson.name;
      console.log('Mapped contactName (from name):', clientData.contactName);
    } else if (primaryPerson.first_name || primaryPerson.last_name) {
      clientData.contactName = `${primaryPerson.first_name || ''} ${primaryPerson.last_name || ''}`.trim();
      console.log('Mapped contactName (from first_name + last_name):', clientData.contactName);
    } else {
      console.log('No contact name found');
    }
    
    console.log('primaryPerson.title:', primaryPerson.title);
    if (primaryPerson.title) {
      clientData.jobTitle = primaryPerson.title;
      console.log('Mapped jobTitle:', clientData.jobTitle);
    } else {
      console.log('No job title found');
    }
    
    // Primary email
    console.log('primaryPerson.email:', primaryPerson.email);
    console.log('primaryPerson.emails:', JSON.stringify(primaryPerson.emails, null, 2));
    if (primaryPerson.email) {
      clientData.primaryEmail = primaryPerson.email;
      console.log('Mapped primaryEmail (from email):', clientData.primaryEmail);
    } else if (primaryPerson.emails && primaryPerson.emails.length > 0) {
      clientData.primaryEmail = primaryPerson.emails[0].email;
      console.log('Mapped primaryEmail (from emails[0]):', clientData.primaryEmail);
    } else {
      console.log('No primary email found');
    }
    
    // Alternate email (if available)
    if (primaryPerson.emails && primaryPerson.emails.length > 1) {
      clientData.alternateEmail = primaryPerson.emails[1].email;
      console.log('Mapped alternateEmail:', clientData.alternateEmail);
    }
    
    // Primary phone
    console.log('primaryPerson.phone_numbers:', JSON.stringify(primaryPerson.phone_numbers, null, 2));
    if (primaryPerson.phone_numbers && primaryPerson.phone_numbers.length > 0) {
      clientData.primaryPhone = primaryPerson.phone_numbers[0].sanitized_number || 
                                primaryPerson.phone_numbers[0].raw_number;
      console.log('Mapped primaryPhone:', clientData.primaryPhone);
    } else {
      console.log('No primary phone found');
    }
    
    // Alternate phone (if available)
    if (primaryPerson.phone_numbers && primaryPerson.phone_numbers.length > 1) {
      clientData.alternatePhone = primaryPerson.phone_numbers[1].sanitized_number || 
                                   primaryPerson.phone_numbers[1].raw_number;
      console.log('Mapped alternatePhone:', clientData.alternatePhone);
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

  console.log('\n=== FINAL MAPPED CLIENT DATA ===');
  console.log(JSON.stringify(clientData, null, 2));
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
    const enrichedData = mapOrganizationToClientData(organization, people, newsArticles);

    return new Response(
      JSON.stringify({ data: enrichedData }),
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

