import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface CategoryData {
  category: string;
  count: number;
  color: string;
}

interface ServiceCategoriesChartProps {
  data: CategoryData[];
}

export const ServiceCategoriesChart: React.FC<ServiceCategoriesChartProps> = ({ data }) => {
  const maxCount = Math.max(...data.map(d => d.count));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Requested Service Categories</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">{item.category}</span>
                <span className="text-sm font-bold text-foreground">{item.count}</span>
              </div>
              <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(item.count / maxCount) * 100}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
