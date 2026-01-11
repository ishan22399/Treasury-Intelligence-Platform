import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Activity, RefreshCw, CheckCircle, Clock, XCircle } from "lucide-react";
import axios from "axios";
import { useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function Netting({ nettingResults, onRefresh, loading }) {
  const [running, setRunning] = useState(false);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const runNetting = async () => {
    setRunning(true);
    try {
      await axios.post(`${API}/treasury/netting/run`);
      onRefresh();
    } catch (error) {
      console.error('Error running netting:', error);
    }
    setRunning(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Settled':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'Pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'Failed':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Inter-Company Netting</h2>
        <div className="flex gap-2">
          <Button onClick={runNetting} disabled={running}>
            <Activity className="h-4 w-4 mr-2" />
            {running ? 'Running...' : 'Run Netting'}
          </Button>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <p className="text-sm opacity-90">Total Netted</p>
          <h3 className="text-3xl font-bold mt-2">{formatCurrency(nettingResults?.total_netted_usd)}</h3>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-green-500 to-green-600 text-white">
          <p className="text-sm opacity-90">Transactions</p>
          <h3 className="text-3xl font-bold mt-2">{nettingResults?.total_transactions || 0}</h3>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <p className="text-sm opacity-90">Settled</p>
          <h3 className="text-3xl font-bold mt-2">{nettingResults?.by_status?.Settled || 0}</h3>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <p className="text-sm opacity-90">Pending</p>
          <h3 className="text-3xl font-bold mt-2">{nettingResults?.by_status?.Pending || 0}</h3>
        </Card>
      </div>

      {/* Transactions Table */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Netting Transactions</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Date</th>
                <th className="px-4 py-3 text-left">From Entity</th>
                <th className="px-4 py-3 text-left">To Entity</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Currency</th>
                <th className="px-4 py-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {nettingResults?.transactions?.map((transaction, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-3">{transaction.netting_date}</td>
                  <td className="px-4 py-3 font-medium">{transaction.from_entity}</td>
                  <td className="px-4 py-3 font-medium">{transaction.to_entity}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    {formatCurrency(transaction.amount)}
                  </td>
                  <td className="px-4 py-3 text-center">{transaction.currency}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      {getStatusIcon(transaction.status)}
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.status === 'Settled'
                          ? 'bg-green-100 text-green-800'
                          : transaction.status === 'Pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.status}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
