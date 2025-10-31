import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export interface HighFitClient {
  id: string;
  company: string;
  fitScore: number;
  sentiment: number;
  projectType: string;
  industry: string;
  mrr: number;
  healthScore: number;
}

interface HighFitClientsTableProps {
  clients: HighFitClient[];
}

export const HighFitClientsTable: React.FC<HighFitClientsTableProps> = ({ clients }) => {
  const navigate = useNavigate();

  const getFitScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700 border-green-300';
    if (score >= 75) return 'bg-blue-100 text-blue-700 border-blue-300';
    if (score >= 60) return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    return 'bg-gray-100 text-gray-700 border-gray-300';
  };

  const getSentimentBadge = (sentiment: number) => {
    if (sentiment >= 0.5) return <Badge variant="success">Positive</Badge>;
    if (sentiment >= 0) return <Badge variant="secondary">Neutral</Badge>;
    return <Badge variant="destructive">Negative</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top 10 High-Fit Clients</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Rank</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Company</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Fit Score</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Sentiment</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Project Type</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Industry</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">MRR</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground">Health</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-foreground"></th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client, index) => (
                <tr
                  key={client.id}
                  className="border-b border-border hover:bg-accent transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-foreground">{client.company}</p>
                  </td>
                  <td className="py-3 px-4">
                    <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${getFitScoreColor(client.fitScore)}`}>
                      {client.fitScore}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    {getSentimentBadge(client.sentiment)}
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-foreground">{client.projectType}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm text-muted-foreground">{client.industry}</span>
                  </td>
                  <td className="py-3 px-4">
                    <span className="text-sm font-medium text-foreground">
                      ${client.mrr.toLocaleString()}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-600"
                          style={{ width: `${client.healthScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {client.healthScore}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/clients/${client.id}`)}
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
};
