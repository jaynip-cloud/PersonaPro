import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { logger, LogContext } from "../_shared/logging.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  clientId: string;
  apolloApiKey?: string;
}

interface ApolloOrganization {
  id?: string;
  name?: string;
  website_url?: string;
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
    sanitized_number?: string;
    number?: string;
    raw_number?: string;
  }>;
  linkedin_url?: string;
  organization?: {
    name?: string;
  };
}

interface ApolloEnrichedPerson {
  person?: {
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
      sanitized_number?: string;
      number?: string;
    }>;
    linkedin_url?: string;
  };
}

// Extract domain from website URL
function extractDomain(url: string): string | null {
  if (!url) return null;
  
  try {
    // Remove protocol if present
    let domain = url.replace(/^https?:\/\//, '').replace(/^www\./, '');
    // Remove path and query
    domain = domain.split('/')[0].split('?')[0];
    // Remove port if present
    domain = domain.split(':')[0];
    return domain.trim() || null;
  } catch (e) {
    return null;
  }
}

// Enrich organization to get organization_id
async function enrichOrganization(
  domain: string,
  apolloApiKey: string,
  context: LogContext
): Promise<string | null> {
  try {
    logger.apiCall('Apollo Organizations Enrich', 'GET', `https://api.apollo.io/api/v1/organizations/enrich?domain=${domain}`, context);
    const startTime = Date.now();
    
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

    const duration = Date.now() - startTime;
    logger.apiResponse('Apollo Organizations Enrich', response.status, duration, context);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Apollo Organization Enrichment failed', context, { status: response.status, error: errorText });
      return null;
    }

    const data = await response.json();
    const organization: ApolloOrganization = data.organization || data;
    
    if (organization?.id) {
      logger.success('Organization ID retrieved', context, { organizationId: organization.id, organizationName: organization.name });
      return organization.id;
    }

    logger.warn('No organization ID found in response', context, { data });
    return null;
  } catch (error) {
    logger.error('Error enriching organization', context, { error: error.message });
    return null;
  }
}

// Search for people in an organization
async function searchPeople(
  organizationId: string,
  apolloApiKey: string,
  context: LogContext
): Promise<ApolloPerson[]> {
  try {
    logger.apiCall('Apollo People Search', 'POST', 'https://api.apollo.io/api/v1/mixed_people/api_search', context);
    const startTime = Date.now();

    const response = await fetch(
      'https://api.apollo.io/api/v1/mixed_people/api_search',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
        body: JSON.stringify({
          organization_ids: [organizationId],
          person_seniorities: ['executive', 'director', 'manager'],
          person_titles: [
            'CEO', 'Chief Executive Officer',
            'Founder', 'Co-Founder',
            'President',
            'CTO', 'Chief Technology Officer',
            'CFO', 'Chief Financial Officer',
            'CMO', 'Chief Marketing Officer',
            'VP', 'Vice President',
            'Director',
            'Head',
            'Manager'
          ],
          reveal_personal_emails: true,
          reveal_phone_number: false,
          page: 1,
          per_page: 50,
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.apiResponse('Apollo People Search', response.status, duration, context);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Apollo People Search failed', context, { status: response.status, error: errorText });
      return [];
    }

    const data = await response.json();
    const people: ApolloPerson[] = data.people || [];
    
    // Debug: Log sample person data to understand structure
    if (people.length > 0) {
      const samplePerson = people[0];
      logger.debug('Sample person data from Apollo', context, {
        hasEmail: !!(samplePerson.email || (samplePerson.emails && samplePerson.emails.length > 0)),
        emailField: samplePerson.email || 'missing',
        emailsArray: samplePerson.emails?.map(e => e.email) || [],
        hasName: !!(samplePerson.name || samplePerson.first_name || samplePerson.last_name),
        name: samplePerson.name || `${samplePerson.first_name || ''} ${samplePerson.last_name || ''}`.trim() || 'missing',
        hasTitle: !!samplePerson.title,
        title: samplePerson.title || 'missing',
        keys: Object.keys(samplePerson),
      });
    }
    
    logger.success('People found', context, { count: people.length });
    return people;
  } catch (error) {
    logger.error('Error searching people', context, { error: error.message });
    return [];
  }
}

// Enrich a person to get LinkedIn URL, email, and name data
async function enrichPerson(
  personId: string,
  apolloApiKey: string,
  context: LogContext
): Promise<{ linkedinUrl: string | null; email: string | null; firstName: string | null; lastName: string | null }> {
  try {
    logger.apiCall('Apollo People Enrich', 'POST', 'https://api.apollo.io/api/v1/people/match', context);
    const startTime = Date.now();

    const response = await fetch(
      'https://api.apollo.io/api/v1/people/match',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apolloApiKey,
        },
        body: JSON.stringify({
          person_id: personId,
          reveal_personal_emails: true,
          reveal_phone_number: false,
        }),
      }
    );

    const duration = Date.now() - startTime;
    logger.apiResponse('Apollo People Enrich', response.status, duration, context);

    if (!response.ok) {
      const errorText = await response.text();
      logger.warn('Apollo People Enrichment failed', context, { status: response.status, error: errorText });
      return { linkedinUrl: null, email: null, firstName: null, lastName: null };
    }

    const data: ApolloEnrichedPerson = await response.json();
    const person = data.person;
    
    const linkedinUrl = person?.linkedin_url || null;
    
    // Extract email from enriched person
    const email = person?.email || 
                  (person?.emails && person.emails.length > 0 ? person.emails[0].email : null) || 
                  null;
    
    // Extract first_name and last_name from enriched person
    const firstName = person?.first_name || null;
    const lastName = person?.last_name || null;
    
    if (linkedinUrl || email || firstName || lastName) {
      logger.debug('Person enriched', context, { 
        personId, 
        linkedinUrl: linkedinUrl || 'not found',
        email: email || 'not found',
        firstName: firstName || 'not found',
        lastName: lastName || 'not found'
      });
    }
    
    return { linkedinUrl, email, firstName, lastName };
  } catch (error) {
    logger.warn('Error enriching person', context, { error: error.message, personId });
    return { linkedinUrl: null, email: null, firstName: null, lastName: null };
  }
}

Deno.serve(async (req) => {
  const startTime = Date.now();
  let context: LogContext = { functionName: 'fetch-apollo-people' };

  logger.startFlow('APOLLO PEOPLE FETCH', context);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    logger.step('CORS', 'Handling preflight request', context);
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Step 1: Authentication
    logger.step('AUTH', 'Starting authentication', context);
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      logger.error('Missing authorization header', context);
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      logger.error('Authentication failed', context, { error: userError });
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.userId = user.id;
    logger.success('User authenticated', context, { userId: user.id });

    // Step 2: Parse request
    logger.step('PARSE', 'Parsing request body', context);
    const body: RequestBody = await req.json();
    const { clientId, apolloApiKey: requestKey } = body;

    if (!clientId) {
      logger.error('Missing clientId', context);
      return new Response(
        JSON.stringify({ error: 'clientId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Get client data
    logger.step('CLIENT', 'Fetching client data', context);
    const { data: clientData, error: clientError } = await supabaseClient
      .from('clients')
      .select('id, company, website')
      .eq('id', clientId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (clientError || !clientData) {
      logger.error('Client not found', context, { error: clientError });
      return new Response(
        JSON.stringify({ error: 'Client not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    context.clientName = clientData.company;
    logger.success('Client data retrieved', context, { clientId, company: clientData.company });

    // Step 4: Get Apollo API key
    logger.step('API_KEY', 'Retrieving Apollo API key', context);
    let apolloApiKey = requestKey || Deno.env.get('APOLLO_API_KEY');

    if (!apolloApiKey) {
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
      logger.error('Apollo API key not found', context);
      return new Response(
        JSON.stringify({ error: 'Apollo API key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('Apollo API key retrieved', context);

    // Step 5: Extract domain from website
    logger.step('DOMAIN', 'Extracting domain from website', context);
    if (!clientData.website) {
      logger.error('Client website not found', context);
      return new Response(
        JSON.stringify({ error: 'Client website is required to fetch people' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const domain = extractDomain(clientData.website);
    if (!domain) {
      logger.error('Invalid website URL', context, { website: clientData.website });
      return new Response(
        JSON.stringify({ error: 'Invalid website URL' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.success('Domain extracted', context, { domain });

    // Step 6: Enrich organization to get organization_id
    logger.step('ORG_ENRICH', 'Enriching organization to get ID', context);
    const organizationId = await enrichOrganization(domain, apolloApiKey, context);

    if (!organizationId) {
      logger.error('Failed to get organization ID', context);
      return new Response(
        JSON.stringify({ error: 'Failed to find organization in Apollo. Please verify the website URL is correct.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 7: Search for people
    logger.step('PEOPLE_SEARCH', 'Searching for people in organization', context);
    const people = await searchPeople(organizationId, apolloApiKey, context);

    if (people.length === 0) {
      logger.warn('No people found', context);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No people found for this organization',
          contacts: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    logger.info('Processing people and enriching for LinkedIn URLs and emails', context, { count: people.length });

    // Step 8: Enrich each person to get LinkedIn URL, email, and complete name data
    const enrichedPeople: ApolloPerson[] = await Promise.all(
      people.map(async (person) => {
        let linkedinUrl: string | undefined = person.linkedin_url;
        let email: string | undefined = person.email || 
          (person.emails && person.emails.length > 0 ? person.emails[0].email : undefined);
        let firstName: string | undefined = person.first_name;
        let lastName: string | undefined = person.last_name;
        
        // If person has ID, enrich to get LinkedIn URL, email, and complete name
        if (person.id) {
          const enriched = await enrichPerson(person.id, apolloApiKey, context);
          if (enriched.linkedinUrl) {
            linkedinUrl = enriched.linkedinUrl;
          }
          // Use enriched email if we don't have one from search
          if (enriched.email && !email) {
            email = enriched.email;
          }
          // Use enriched first_name and last_name if available (enriched data may be more complete)
          if (enriched.firstName) {
            firstName = enriched.firstName;
          }
          if (enriched.lastName) {
            lastName = enriched.lastName;
          }
        }
        
        return {
          ...person,
          linkedin_url: linkedinUrl,
          email: email,
          first_name: firstName,
          last_name: lastName,
          // Update emails array if we got email from enrichment
          emails: email && !person.emails?.some(e => e.email === email) 
            ? [{ email, status: 'verified' }, ...(person.emails || [])]
            : person.emails,
        };
      })
    );

    // Step 9: Map Apollo people to contacts format and save
    logger.step('SAVE', 'Saving contacts to database', context);
    
    // Debug: Log filtering stats
    const beforeFilter = enrichedPeople.length;
    const filteredStats = {
      noEmail: 0,
      noName: 0,
      noTitle: 0,
    };
    
    // Helper function to extract email from Apollo person
    const getEmail = (person: ApolloPerson): string | null => {
      // Try direct email field first
      if (person.email && person.email.trim() !== '') {
        return person.email.trim();
      }
      // Try emails array
      if (person.emails && person.emails.length > 0) {
        const validEmail = person.emails.find(e => e.email && e.email.trim() !== '');
        if (validEmail && validEmail.email) {
          return validEmail.email.trim();
        }
      }
      return null;
    };

    const contactsToSave = enrichedPeople
      .filter((person) => {
        // Check each requirement and track why contacts are filtered
        const email = getEmail(person);
        const hasEmail = !!email;
        const hasName = !!(person.name || person.first_name || person.last_name);
        const hasTitle = !!person.title;
        
        if (!hasEmail) filteredStats.noEmail++;
        if (!hasName) filteredStats.noName++;
        if (!hasTitle) filteredStats.noTitle++;
        
        // Filter out contacts without email (email is NOT NULL in schema)
        // Also filter out contacts without a name or role
        return hasEmail && hasName && hasTitle;
      })
      .map((person) => {
        const firstName = person.first_name || '';
        const lastName = person.last_name || '';
        // Prioritize constructing full name from first_name + last_name
        // Only use person.name if first_name and last_name are not available
        let fullName = '';
        if (firstName && lastName) {
          fullName = `${firstName} ${lastName}`.trim();
        } else if (person.name) {
          fullName = person.name.trim();
        } else if (firstName) {
          fullName = firstName.trim();
        } else if (lastName) {
          fullName = lastName.trim();
        } else {
          fullName = 'Unknown';
        }
        
        // Extract email using helper
        const email = getEmail(person);
        if (!email) {
          // This shouldn't happen due to filter, but TypeScript needs it
          throw new Error('Email is required but not found');
        }
        
        // Determine if decision maker based on title
        const title = (person.title || '').toLowerCase();
        const isDecisionMaker = title.includes('ceo') || 
                              title.includes('founder') || 
                              title.includes('president') || 
                              title.includes('vp') || 
                              title.includes('vice president') || 
                              title.includes('director') ||
                              title.includes('chief');

        return {
          client_id: clientId,
          user_id: user.id,
          name: fullName,
          email: email, // email is required and NOT NULL
          phone: person.phone_numbers?.[0]?.sanitized_number || 
                 person.phone_numbers?.[0]?.number || 
                 person.phone_numbers?.[0]?.raw_number || 
                 null,
          role: person.title || 'Unknown', // role is required and NOT NULL
          department: null,
          is_primary: false,
          is_decision_maker: isDecisionMaker,
          source: 'apollo',
          linkedin_url: person.linkedin_url || null,
        };
      });

    // Log filtering results
    logger.debug('Contact filtering results', context, {
      beforeFilter,
      afterFilter: contactsToSave.length,
      filteredOut: beforeFilter - contactsToSave.length,
      filterStats: filteredStats,
    });
    
    if (contactsToSave.length === 0) {
      logger.warn('No valid contacts to save (all filtered out due to missing email/name/role)', context, {
        filteredStats,
        samplePerson: enrichedPeople.length > 0 ? {
          hasEmail: !!(enrichedPeople[0].email || (enrichedPeople[0].emails && enrichedPeople[0].emails.length > 0)),
          emailField: enrichedPeople[0].email || 'missing',
          emailsArray: enrichedPeople[0].emails?.map(e => e.email) || [],
          hasName: !!(enrichedPeople[0].name || enrichedPeople[0].first_name || enrichedPeople[0].last_name),
          name: enrichedPeople[0].name || `${enrichedPeople[0].first_name || ''} ${enrichedPeople[0].last_name || ''}`.trim() || 'missing',
          hasTitle: !!enrichedPeople[0].title,
          title: enrichedPeople[0].title || 'missing',
          allKeys: Object.keys(enrichedPeople[0]),
        } : null,
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No valid contacts found to save (all contacts were missing required fields: email, name, or role)',
          contacts: [],
          totalFound: enrichedPeople.length,
          filterStats: {
            totalReceived: beforeFilter,
            filteredOut: beforeFilter,
          reasons: {
            missingEmail: filteredStats.noEmail,
            missingName: filteredStats.noName,
            missingTitle: filteredStats.noTitle,
          },
          debug: enrichedPeople.length > 0 ? {
            samplePerson: {
              hasEmail: !!(enrichedPeople[0].email || (enrichedPeople[0].emails && enrichedPeople[0].emails.length > 0)),
              emailField: enrichedPeople[0].email || 'missing',
              emailsArray: enrichedPeople[0].emails?.map(e => e.email) || [],
              hasName: !!(enrichedPeople[0].name || enrichedPeople[0].first_name || enrichedPeople[0].last_name),
              name: enrichedPeople[0].name || `${enrichedPeople[0].first_name || ''} ${enrichedPeople[0].last_name || ''}`.trim() || 'missing',
              hasTitle: !!enrichedPeople[0].title,
              title: enrichedPeople[0].title || 'missing',
            },
          } : null,
          },
          metadata: {
            processingTime: Date.now() - startTime,
            timestamp: new Date().toISOString(),
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert contacts (avoid duplicates based on client_id and email)
    // Note: Requires unique constraint on (client_id, email) - see migration
    const { data: savedContacts, error: saveError } = await supabaseClient
      .from('contacts')
      .upsert(contactsToSave, {
        onConflict: 'client_id,email',
        ignoreDuplicates: false,
      })
      .select();

    if (saveError) {
      logger.error('Failed to save contacts', context, { error: saveError });
      return new Response(
        JSON.stringify({ error: 'Failed to save contacts', details: saveError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const totalDuration = Date.now() - startTime;
    logger.endFlow('APOLLO PEOPLE FETCH', context, {
      duration: `${totalDuration}ms`,
      contactsSaved: savedContacts?.length || 0,
      totalFound: people.length,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully fetched and saved ${savedContacts?.length || 0} contacts`,
        contacts: savedContacts || [],
        totalFound: people.length,
        metadata: {
          processingTime: totalDuration,
          timestamp: new Date().toISOString(),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    logger.error('Error in fetch-apollo-people', context, { 
      error: error.message,
      stack: error.stack,
      duration: `${totalDuration}ms`
    });

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message || 'Internal server error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

