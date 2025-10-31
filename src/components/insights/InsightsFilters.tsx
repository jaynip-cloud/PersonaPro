import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Calendar, Filter } from 'lucide-react';

export interface FilterState {
  dateRange: string;
  industry: string;
  region: string;
  csm: string;
  sentimentBand: string;
}

interface InsightsFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export const InsightsFilters: React.FC<InsightsFiltersProps> = ({
  filters,
  onFilterChange,
  onReset
}) => {
  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-foreground">Filters</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Date Range
            </label>
            <div className="relative">
              <select
                value={filters.dateRange}
                onChange={(e) => handleChange('dateRange', e.target.value)}
                className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary appearance-none pr-8"
              >
                <option value="all">All Time</option>
                <option value="7d">Last 7 Days</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="1y">Last Year</option>
              </select>
              <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Industry
            </label>
            <select
              value={filters.industry}
              onChange={(e) => handleChange('industry', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Industries</option>
              <option value="technology">Technology</option>
              <option value="finance">Finance</option>
              <option value="healthcare">Healthcare</option>
              <option value="retail">Retail</option>
              <option value="manufacturing">Manufacturing</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Region
            </label>
            <select
              value={filters.region}
              onChange={(e) => handleChange('region', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Regions</option>
              <option value="north-america">North America</option>
              <option value="europe">Europe</option>
              <option value="asia">Asia</option>
              <option value="south-america">South America</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              CSM
            </label>
            <select
              value={filters.csm}
              onChange={(e) => handleChange('csm', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All CSMs</option>
              <option value="john-williams">John Williams</option>
              <option value="sarah-johnson">Sarah Johnson</option>
              <option value="michael-chen">Michael Chen</option>
              <option value="emily-rodriguez">Emily Rodriguez</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Sentiment Band
            </label>
            <select
              value={filters.sentimentBand}
              onChange={(e) => handleChange('sentimentBand', e.target.value)}
              className="w-full border border-border rounded-md px-3 py-2 bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Sentiment</option>
              <option value="positive">Positive (&gt; 0.5)</option>
              <option value="neutral">Neutral (0 to 0.5)</option>
              <option value="negative">Negative (&lt; 0)</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" size="sm" onClick={onReset}>
            Reset Filters
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
