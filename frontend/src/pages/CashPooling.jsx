import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Layers, RefreshCw } from "lucide-react";
import axios from "axios";
import { useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function CashPooling({ poolStatus, onRefresh, loading }) {
  const [calculating, setCalculating] = useState(false);
  const [poolDetails, setPoolDetails] = useState({});

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const calculatePool = async (region) => {
    setCalculating(true);
    try {
      const response = await axios.post(`${API}/treasury/cash-pool/calculate/${region}`);
      setPoolDetails(prev => ({ ...prev, [region]: response.data }));
    } catch (error) {
      console.error('Error calculating pool:', error);
    }
    setCalculating(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Cash Pooling Management</h2>
        <Button onClick={onRefresh} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pool Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {poolStatus?.pools?.map((pool) => (
          <Card key={pool.pool_name} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-blue-500" />
                <h3 className="font-semibold">{pool.pool_name}</h3>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                pool.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
              }`}>
                {pool.status}
              </span>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Balance</p>
                <p className="text-2xl font-bold text-blue-600">{formatCurrency(pool.total_balance_usd)}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div>
                  <p className="text-xs text-gray-600">Pool Type</p>
                  <p className="font-medium">{pool.pool_type}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Participants</p>
                  <p className="font-medium">{pool.participants}</p>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-600">Efficiency Score</p>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${pool.efficiency}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium">{pool.efficiency.toFixed(0)}%</span>
                </div>
              </div>

              <Button
                onClick={() => calculatePool(pool.region)}
                disabled={calculating}
                className="w-full mt-4"
                size="sm"
              >
                Calculate Pooling
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Pool Details */}
      {Object.entries(poolDetails).map(([region, details]) => (
        <Card key={region} className="p-6">
          <h3 className="text-lg font-semibold mb-4">{details.pool_name} - Calculation Results</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-600">Total Pooled</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(details.total_pooled_usd)}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600">Average Balance</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(details.average_balance)}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <p className="text-sm text-gray-600">Participants</p>
              <p className="text-2xl font-bold text-purple-600">{details.participants?.length || 0}</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-medium mb-3">Participant Positions</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left">Account</th>
                    <th className="px-4 py-2 text-left">Entity</th>
                    <th className="px-4 py-2 text-right">Balance</th>
                    <th className="px-4 py-2 text-right">Variance</th>
                    <th className="px-4 py-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {details.participants?.map((participant, idx) => (
                    <tr key={idx} className="border-b">
                      <td className="px-4 py-3 font-mono text-xs">{participant.account}</td>
                      <td className="px-4 py-3">{participant.entity}</td>
                      <td className="px-4 py-3 text-right font-medium">{formatCurrency(participant.balance_usd)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${
                        participant.variance_from_avg >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {participant.variance_from_avg >= 0 ? '+' : ''}{formatCurrency(participant.variance_from_avg)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          participant.status === 'Surplus'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {participant.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
