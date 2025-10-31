import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface ScatterDataPoint {
  company: string;
  cooperation: number;
  projectSize: number;
  color: string;
}

interface CooperationScatterChartProps {
  data: ScatterDataPoint[];
}

export const CooperationScatterChart: React.FC<CooperationScatterChartProps> = ({ data }) => {
  const maxCooperation = 100;
  const maxProjectSize = Math.max(...data.map(d => d.projectSize));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cooperation vs Project Size</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80 relative border border-border rounded-lg bg-muted/20 p-4">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <line
              x1="0"
              y1="100"
              x2="100"
              y2="100"
              stroke="rgb(229, 231, 235)"
              strokeWidth="0.5"
            />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="100"
              stroke="rgb(229, 231, 235)"
              strokeWidth="0.5"
            />

            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="rgb(229, 231, 235)"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />
            <line
              x1="50"
              y1="0"
              x2="50"
              y2="100"
              stroke="rgb(229, 231, 235)"
              strokeWidth="0.3"
              strokeDasharray="2,2"
            />

            {data.map((point, index) => {
              const x = (point.cooperation / maxCooperation) * 100;
              const y = 100 - (point.projectSize / maxProjectSize) * 100;
              const size = Math.max(2, (point.projectSize / maxProjectSize) * 4);

              return (
                <g key={index}>
                  <circle
                    cx={x}
                    cy={y}
                    r={size}
                    fill={point.color}
                    opacity="0.7"
                    className="hover:opacity-100 transition-opacity cursor-pointer"
                  >
                    <title>{`${point.company}\nCooperation: ${point.cooperation}%\nProject Size: $${point.projectSize.toLocaleString()}`}</title>
                  </circle>
                </g>
              );
            })}
          </svg>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground">
            Cooperation Level (%)
          </div>
          <div className="absolute left-2 top-1/2 -translate-y-1/2 -rotate-90 text-xs text-muted-foreground">
            Project Size ($)
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-muted-foreground">High Value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Medium Value</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-orange-500" />
            <span className="text-muted-foreground">Growing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
