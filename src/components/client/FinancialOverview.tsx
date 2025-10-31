import React from 'react';
import { Card, CardContent } from '../ui/Card';
import { DollarSign, TrendingUp, Briefcase, FileCheck } from 'lucide-react';
import { FinancialData } from '../../types';

interface FinancialOverviewProps {
  data: FinancialData;
}

export const FinancialOverview: React.FC<FinancialOverviewProps> = ({ data }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <span className="text-xs text-green-600 font-medium">+12%</span>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">MRR</h3>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(data.mrr)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-blue-600" />
            </div>
            <span className="text-xs text-blue-600 font-medium">Lifetime</span>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Total Revenue</h3>
          <p className="text-2xl font-bold text-foreground">{formatCurrency(data.totalRevenue)}</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Briefcase className="h-5 w-5 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">Active Deals</h3>
          <p className="text-2xl font-bold text-foreground">{data.activeDeals}</p>
        </CardContent>
      </Card>

      {data.latestDeal && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <FileCheck className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <h3 className="text-sm font-medium text-muted-foreground mb-1">Latest Deal</h3>
            <p className="text-lg font-bold text-foreground">{formatCurrency(data.latestDeal.value)}</p>
            <p className="text-xs text-muted-foreground mt-1">{data.latestDeal.name}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
