import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { Globe, Loader2, ExternalLink, Mail, Phone, Linkedin, Twitter, Facebook, Instagram, Code } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/Toast';

interface WebsiteScraperProps {
  clientId: string;
  initialUrl?: string;
  onDataScraped?: (data: any) => void;
}

export const WebsiteScraper: React.FC<WebsiteScraperProps> = ({
  clientId,
  initialUrl = '',
  onDataScraped
}) => {
  const { showToast } = useToast();
  const [url, setUrl] = useState(initialUrl);
  const [isLoading, setIsLoading] = useState(false);
  const [scrapedData, setScrapedData] = useState<any>(null);

  const handleScrape = async () => {
    if (!url.trim()) {
      showToast('Please enter a website URL', 'error');
      return;
    }

    let fullUrl = url.trim();
    if (!fullUrl.startsWith('http://') && !fullUrl.startsWith('https://')) {
      fullUrl = 'https://' + fullUrl;
    }

    setIsLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Not authenticated');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/scrape-client-website`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: fullUrl,
          clientId
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to scrape website');
      }

      const result = await response.json();

      if (result.success) {
        setScrapedData(result.data);
        showToast('Website scraped successfully', 'success');

        if (onDataScraped) {
          onDataScraped(result.data);
        }
      } else {
        throw new Error('Scraping failed');
      }
    } catch (error) {
      console.error('Error scraping website:', error);
      showToast(
        error instanceof Error ? error.message : 'Failed to scrape website',
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Website Scraper
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter website URL (e.g., company.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleScrape()}
              disabled={isLoading}
            />
            <Button
              onClick={handleScrape}
              disabled={isLoading || !url.trim()}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Scraping...
                </>
              ) : (
                <>
                  <Globe className="h-4 w-4 mr-2" />
                  Scrape
                </>
              )}
            </Button>
          </div>

          {scrapedData && (
            <div className="space-y-4 pt-4 border-t border-border">
              <div>
                <h4 className="font-semibold text-sm mb-2">Company Information</h4>
                <div className="space-y-2">
                  {scrapedData.companyInfo.name && (
                    <div>
                      <span className="text-xs text-muted-foreground">Name:</span>
                      <p className="text-sm font-medium">{scrapedData.companyInfo.name}</p>
                    </div>
                  )}
                  {scrapedData.companyInfo.tagline && (
                    <div>
                      <span className="text-xs text-muted-foreground">Tagline:</span>
                      <p className="text-sm">{scrapedData.companyInfo.tagline}</p>
                    </div>
                  )}
                  {scrapedData.description && (
                    <div>
                      <span className="text-xs text-muted-foreground">Description:</span>
                      <p className="text-sm">{scrapedData.description}</p>
                    </div>
                  )}
                </div>
              </div>

              {(scrapedData.contact.email || scrapedData.contact.phone) && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Contact Information</h4>
                  <div className="space-y-2">
                    {scrapedData.contact.email && (
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <a href={`mailto:${scrapedData.contact.email}`} className="text-primary hover:underline">
                          {scrapedData.contact.email}
                        </a>
                      </div>
                    )}
                    {scrapedData.contact.phone && (
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <a href={`tel:${scrapedData.contact.phone}`} className="text-primary hover:underline">
                          {scrapedData.contact.phone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {Object.keys(scrapedData.socialMedia).length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Social Media</h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData.socialMedia.linkedin && (
                      <a
                        href={scrapedData.socialMedia.linkedin}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Linkedin className="h-3 w-3" />
                        LinkedIn
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {scrapedData.socialMedia.twitter && (
                      <a
                        href={scrapedData.socialMedia.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Twitter className="h-3 w-3" />
                        Twitter
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {scrapedData.socialMedia.facebook && (
                      <a
                        href={scrapedData.socialMedia.facebook}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Facebook className="h-3 w-3" />
                        Facebook
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                    {scrapedData.socialMedia.instagram && (
                      <a
                        href={scrapedData.socialMedia.instagram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 px-3 py-1.5 text-xs bg-muted hover:bg-muted/80 rounded-md transition-colors"
                      >
                        <Instagram className="h-3 w-3" />
                        Instagram
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {scrapedData.technologies.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Detected Technologies
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {scrapedData.technologies.map((tech: string) => (
                      <Badge key={tech} variant="secondary" className="text-xs">
                        {tech}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {scrapedData.headings.length > 0 && (
                <div>
                  <h4 className="font-semibold text-sm mb-2">Key Headings</h4>
                  <div className="space-y-1">
                    {scrapedData.headings.slice(0, 5).map((heading: string, index: number) => (
                      <p key={index} className="text-sm text-muted-foreground">
                        • {heading}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
