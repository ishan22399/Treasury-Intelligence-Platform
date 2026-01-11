import { Card } from "@/components/ui/card";
import { TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";

export default function Liquidity({ globalPosition, regionalData, loading }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  const currencyData = globalPosition?.by_currency ? Object.entries(globalPosition.by_currency).map(([currency, amount]) => ({
    currency,
    amount
  })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Global Liquidity Position</h2>
        <p className="text-sm text-gray-600">As of: {globalPosition?.as_of_date}</p>
      </div>

      {/* Global Summary */}
      <Card className="p-8 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-lg opacity-90">Total Global Liquidity</p>
            <h2 className="text-5xl font-bold mt-2">{formatCurrency(globalPosition?.total_liquidity_usd)}</h2>
            <p className="mt-2 opacity-90">Across {globalPosition?.total_accounts} accounts</p>
          </div>
          <TrendingUp className="h-24 w-24 opacity-50" />
        </div>
      </Card>

      {/* Regional Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {Object.entries(regionalData).map(([region, data]) => (
          <Card key={region} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{region}</h3>
              <ArrowUpRight className="h-5 w-5 text-green-500" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(data?.total_usd)}</p>
            <p className="text-sm text-gray-600 mt-2">{data?.account_count} accounts</p>
            
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Top Entities:</p>
              {data?.entities && Object.entries(data.entities).slice(0, 3).map(([entity, balance]) => (
                <div key={entity} className="flex justify-between text-sm">
                  <span className="text-gray-600">{entity}</span>
                  <span className="font-medium">{formatCurrency(balance)}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>

      {/* Currency Breakdown */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Currency Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {currencyData.map(({ currency, amount }) => (
            <div key={currency} className="p-4 border rounded-lg">
              <p className="text-2xl font-bold">{currency}</p>
              <p className="text-sm text-gray-600 mt-1">
                {new Intl.NumberFormat('en-US', {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                }).format(amount)}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
