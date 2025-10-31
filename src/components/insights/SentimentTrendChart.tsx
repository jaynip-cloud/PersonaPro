import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';

interface DataPoint {
  date: string;
  value: number;
}

interface SentimentTrendChartProps {
  data: DataPoint[];
}

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ data }) => {
  const maxValue = Math.max(...data.map(d => Math.abs(d.value)));
  const minValue = Math.min(...data.map(d => d.value));
  const range = maxValue - minValue;

  const getY = (value: number) => {
    return ((maxValue - value) / range) * 100;
  };

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = getY(d.value);
    return `${x},${y}`;
  }).join(' ');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sentiment Trend</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 relative">
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="sentimentGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgb(34, 197, 94)" stopOpacity="0.2" />
                <stop offset="100%" stopColor="rgb(34, 197, 94)" stopOpacity="0" />
              </linearGradient>
            </defs>

            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="rgb(229, 231, 235)"
              strokeWidth="0.5"
              vectorEffect="non-scaling-stroke"
            />

            <polyline
              points={`0,100 ${points} 100,100`}
              fill="url(#sentimentGradient)"
            />

            <polyline
              points={points}
              fill="none"
              stroke="rgb(34, 197, 94)"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />

            {data.map((d, i) => {
              const x = (i / (data.length - 1)) * 100;
              const y = getY(d.value);
              return (
                <circle
                  key={i}
                  cx={x}
                  cy={y}
                  r="1.5"
                  fill="rgb(34, 197, 94)"
                  vectorEffect="non-scaling-stroke"
                />
              );
            })}
          </svg>

          <div className="absolute inset-0 flex items-end justify-between px-4 pb-2 pointer-events-none">
            {data.map((d, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                {i % 2 === 0 ? d.date : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span className="text-muted-foreground">Average: +{(data.reduce((sum, d) => sum + d.value, 0) / data.length).toFixed(2)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
