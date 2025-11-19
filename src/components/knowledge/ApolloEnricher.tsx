import { useState } from 'react';
import { Building2, Users, Loader } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { supabase } from '../../lib/supabase';

interface ApolloEnricherProps {
  onDataEnriched?: (data: any, type: 'company' | 'people') => void;
}

export function ApolloEnricher({ onDataEnriched }: ApolloEnricherProps) {
  const [domain, setDomain] = useState('');
  const [enrichType, setEnrichType] = useState<'company' | 'people'>('company');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleEnrich = async () => {
    if (!domain.trim()) {
      setError('Please enter a company domain');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/enrich-with-apollo`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          domain: domain,
          enrich_type: enrichType,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to enrich data');
      }

      setResult(data.data);
      if (onDataEnriched) {
        onDataEnriched(data.data, enrichType);
      }
    } catch (err) {
      console.error('Enrichment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to enrich data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-3">
        <button
          onClick={() => setEnrichType('company')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            enrichType === 'company'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Building2 className="h-4 w-4 inline mr-2" />
          Company Data
        </button>
        <button
          onClick={() => setEnrichType('people')}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
            enrichType === 'people'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          <Users className="h-4 w-4 inline mr-2" />
          People Data
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="text"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="example.com"
            disabled={loading}
          />
        </div>
        <Button
          onClick={handleEnrich}
          disabled={loading || !domain.trim()}
          variant="primary"
        >
          {loading ? (
            <>
              <Loader className="h-4 w-4 mr-2 animate-spin" />
              Enriching...
            </>
          ) : (
            <>
              {enrichType === 'company' ? (
                <Building2 className="h-4 w-4 mr-2" />
              ) : (
                <Users className="h-4 w-4 mr-2" />
              )}
              Enrich Data
            </>
          )}
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {result && enrichType === 'company' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">Company Data Retrieved</h4>
          </div>

          <div className="grid grid-cols-2 gap-3 text-sm">
            {result.name && (
              <div>
                <p className="text-blue-700 font-medium">Name</p>
                <p className="text-gray-900">{result.name}</p>
              </div>
            )}
            {result.industry && (
              <div>
                <p className="text-blue-700 font-medium">Industry</p>
                <p className="text-gray-900">{result.industry}</p>
              </div>
            )}
            {result.employee_count && (
              <div>
                <p className="text-blue-700 font-medium">Employees</p>
                <p className="text-gray-900">{result.employee_count}</p>
              </div>
            )}
            {result.annual_revenue && (
              <div>
                <p className="text-blue-700 font-medium">Revenue</p>
                <p className="text-gray-900">{result.annual_revenue}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {result && enrichType === 'people' && result.people && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <h4 className="font-semibold text-blue-900">
              Found {result.people.length} People
            </h4>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {result.people.slice(0, 5).map((person: any, index: number) => (
              <div key={index} className="bg-white p-3 rounded border border-blue-200">
                <p className="font-medium text-gray-900">{person.name}</p>
                <p className="text-sm text-gray-600">{person.title}</p>
                {person.email && (
                  <p className="text-xs text-gray-500 mt-1">{person.email}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
