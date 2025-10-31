import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Sparkles, Loader2, AlertCircle, CheckCircle, Link } from 'lucide-react';

interface AIDataExtractorProps {
  onDataExtracted: (data: any) => void;
}

export const AIDataExtractor: React.FC<AIDataExtractorProps> = ({ onDataExtracted }) => {
  const [url, setUrl] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [crawlStats, setCrawlStats] = useState<string | null>(null);

  const handleExtract = async () => {
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    const openaiKey = localStorage.getItem('openai_key');
    if (!openaiKey) {
      setError('Please configure your OpenAI API key in Settings');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      setCrawlStats('Starting deep crawl of website (up to 50 pages, depth 3)...');

      const response = await fetch(`${supabaseUrl}/functions/v1/extract-company-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: url.trim(),
          openaiKey: openaiKey,
        }),
      });

      setCrawlStats('Processing crawled data with AI...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const data = await response.json();
      onDataExtracted(data);
      setSuccess(true);
      setCrawlStats('Successfully extracted comprehensive company data!');
      setUrl('');
    } catch (err: any) {
      setError(err.message || 'Failed to extract data');
      setCrawlStats(null);
      console.error('Error extracting data:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>AI-Powered Deep Website Crawling</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-900 font-medium mb-2">
              Deep Website Crawling with AI
            </p>
            <p className="text-sm text-blue-900 mb-2">
              Enter your company's root domain. The system will:
            </p>
            <ul className="text-xs text-blue-800 ml-4 space-y-1">
              <li>• Crawl up to depth 3 (home → section → page → article)</li>
              <li>• Extract company details, services, team, blog posts, news</li>
              <li>• Find and collect social media profiles automatically</li>
              <li>• Respect robots.txt and throttle requests (1 req/sec)</li>
              <li>• Stay within same domain and subdomains only</li>
            </ul>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              Company Website URL
            </label>
            <div className="relative">
              <Link className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="pl-10"
                disabled={loading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter the homepage URL - the crawler will discover and extract from all relevant pages
            </p>
          </div>

          {crawlStats && loading && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-2">
              <Loader2 className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
              <div>
                <p className="text-sm text-blue-900 font-medium">{crawlStats}</p>
                <p className="text-xs text-blue-700 mt-1">This may take 1-2 minutes depending on site size...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-900">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-green-900">
                Data extracted successfully! Check the tabs above to review all the information.
              </p>
            </div>
          )}

          <Button
            variant="primary"
            onClick={handleExtract}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Crawling & Extracting...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Start Deep Crawl & Extract
              </>
            )}
          </Button>

          <div className="pt-4 border-t border-border">
            <h4 className="text-sm font-medium text-foreground mb-2">Comprehensive Extraction Includes:</h4>
            <div className="grid grid-cols-2 gap-2">
              {[
                'Company profile & details',
                'Services & products',
                'Leadership team',
                'Case studies & portfolio',
                'Blog articles & content',
                'Press & news',
                'Contact information',
                'Social media profiles',
                'Technology stack',
                'Partners & integrations',
                'Career opportunities',
                'Pricing information',
                'Legal & compliance',
                'Mission & vision',
                'Company culture',
                'Industry verticals'
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-600" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
