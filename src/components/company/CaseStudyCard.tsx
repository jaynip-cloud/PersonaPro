import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExternalLink, TrendingUp } from 'lucide-react';
import { CaseStudy } from '../../types';

interface CaseStudyCardProps {
  caseStudy: CaseStudy;
}

export const CaseStudyCard: React.FC<CaseStudyCardProps> = ({ caseStudy }) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="h-48 bg-gradient-to-br from-blue-100 to-blue-50 flex items-center justify-center">
        <div className="text-center p-6">
          <h3 className="text-2xl font-bold text-blue-900">{caseStudy.client}</h3>
          <p className="text-sm text-blue-700 mt-2">{caseStudy.industry}</p>
        </div>
      </div>

      <CardContent className="p-6">
        <h4 className="text-lg font-semibold text-foreground mb-2">{caseStudy.title}</h4>
        <p className="text-sm text-muted-foreground mb-4">{caseStudy.description}</p>

        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Services Delivered</p>
          <div className="flex flex-wrap gap-2">
            {caseStudy.services.map((service, index) => (
              <Badge key={index} variant="secondary">
                {service}
              </Badge>
            ))}
          </div>
        </div>

        {caseStudy.metrics && caseStudy.metrics.length > 0 && (
          <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-green-600" />
              <p className="text-xs font-semibold text-green-900">Key Results</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {caseStudy.metrics.map((metric, index) => (
                <div key={index}>
                  <p className="text-xs text-green-700">{metric.label}</p>
                  <p className="text-lg font-bold text-green-900">{metric.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground mb-2">Outcomes</p>
          <ul className="space-y-1">
            {caseStudy.results.map((result, index) => (
              <li key={index} className="text-sm text-foreground flex items-start gap-2">
                <span className="text-green-600 mt-0.5">✓</span>
                <span>{result}</span>
              </li>
            ))}
          </ul>
        </div>

        {caseStudy.url && (
          <a
            href={caseStudy.url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <ExternalLink className="h-4 w-4" />
            View Full Case Study
          </a>
        )}
      </CardContent>
    </Card>
  );
};
