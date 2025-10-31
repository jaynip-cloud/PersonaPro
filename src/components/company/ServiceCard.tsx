import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { ExternalLink } from 'lucide-react';
import { CompanyService } from '../../types';

interface ServiceCardProps {
  service: CompanyService;
}

export const ServiceCard: React.FC<ServiceCardProps> = ({ service }) => {
  return (
    <Card>
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-foreground mb-2">{service.name}</h3>
        <p className="text-sm text-muted-foreground mb-4">{service.description}</p>

        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-2">Service Tags</p>
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag, index) => (
              <Badge key={index} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">Budget Range</p>
          <p className="text-sm font-semibold text-foreground">
            ${service.budgetRange.min.toLocaleString()} - ${service.budgetRange.max.toLocaleString()}
          </p>
        </div>

        {service.proofUrls.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Proof Points</p>
            <div className="space-y-1">
              {service.proofUrls.map((url, index) => (
                <a
                  key={index}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-xs text-primary hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">Case Study {index + 1}</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
