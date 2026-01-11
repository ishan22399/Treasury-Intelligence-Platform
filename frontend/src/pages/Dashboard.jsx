import { TrendingUp, DollarSign, Activity, AlertTriangle, Building2, Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function Dashboard({ analytics, trends, globalPosition, loading }) {
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const regionalData = analytics?.regional_breakdown ? Object.entries(analytics.regional_breakdown).map(([region, value]) => ({
    name: region,
    value: value
  })) : [];

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Liquidity</p>
              <h3 className="text-3xl font-bold mt-2">{formatCurrency(analytics?.total_liquidity_usd || 0)}</h3>
            </div>
            <DollarSign className="h-12 w-12 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Total Accounts</p>
              <h3 className="text-3xl font-bold mt-2">{analytics?.total_accounts || 0}</h3>
            </div>
            <Building2 className="h-12 w-12 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Cash Pools</p>
              <h3 className="text-3xl font-bold mt-2">{analytics?.total_cash_pools || 0}</h3>
            </div>
            <Globe className="h-12 w-12 opacity-80" />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500 to-red-600 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">Data Issues</p>
              <h3 className="text-3xl font-bold mt-2">{analytics?.data_quality_issues || 0}</h3>
            </div>
            <AlertTriangle className="h-12 w-12 opacity-80" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Regional Distribution */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Regional Liquidity Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={regionalData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {regionalData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(value)} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        {/* Top Entities */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top 5 Entities by Balance</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={analytics?.top_entities || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="entity" angle={-45} textAnchor="end" height={100} />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Bar dataKey="balance_usd" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Trends */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">30-Day Liquidity Trend</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={trends?.trends || []}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Line type="monotone" dataKey="total_liquidity_usd" stroke="#3b82f6" name="Total" strokeWidth={2} />
            <Line type="monotone" dataKey="apac" stroke="#10b981" name="APAC" />
            <Line type="monotone" dataKey="emea" stroke="#f59e0b" name="EMEA" />
            <Line type="monotone" dataKey="amer" stroke="#ef4444" name="AMER" />
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
