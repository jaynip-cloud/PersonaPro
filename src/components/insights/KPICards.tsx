import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { Users, Database, Sparkles, TrendingUp, Heart } from 'lucide-react';

interface KPIData {
  totalClients: number;
  activeDataSources: number;
  personasCreated: number;
  avgSentiment: number;
  avgHealthScore: number;
  clientsChange?: number;
  personasChange?: number;
  sentimentChange?: number;
}

interface KPICardsProps {
  data: KPIData;
}

export const KPICards: React.FC<KPICardsProps> = ({ data }) => {
  const formatChange = (value?: number) => {
    if (!value) return null;
    const sign = value > 0 ? '+' : '';
    return `${sign}${value}%`;
  };

  const getChangeColor = (value?: number) => {
    if (!value) return 'text-muted-foreground';
    return value > 0 ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            {data.clientsChange !== undefined && (
              <span className={`text-xs font-medium ${getChangeColor(data.clientsChange)}`}>
                {formatChange(data.clientsChange)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Clients</h3>
          <p className="text-2xl font-bold text-foreground">{data.totalClients}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Database className="h-5 w-5 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Data Sources</h3>
          <p className="text-2xl font-bold text-foreground">{data.activeDataSources}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
            </div>
            {data.personasChange !== undefined && (
              <span className={`text-xs font-medium ${getChangeColor(data.personasChange)}`}>
                {formatChange(data.personasChange)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Personas Created</h3>
          <p className="text-2xl font-bold text-foreground">{data.personasCreated}</p>
          <p className="text-xs text-muted-foreground mt-1">This week</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            {data.sentimentChange !== undefined && (
              <span className={`text-xs font-medium ${getChangeColor(data.sentimentChange)}`}>
                {formatChange(data.sentimentChange)}
              </span>
            )}
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Sentiment</h3>
          <p className="text-2xl font-bold text-foreground">
            {data.avgSentiment > 0 ? '+' : ''}{data.avgSentiment.toFixed(2)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Avg Health Score</h3>
          <p className="text-2xl font-bold text-foreground">{data.avgHealthScore}%</p>
        </CardContent>
      </Card>
    </div>
  );
};
