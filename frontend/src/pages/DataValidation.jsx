import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, RefreshCw } from "lucide-react";
import axios from "axios";
import { useState } from "react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

export default function DataValidation({ validationReport, onRefresh, loading }) {
  const [validating, setValidating] = useState(false);

  const runValidation = async () => {
    setValidating(true);
    try {
      await axios.post(`${API}/treasury/validate`);
      onRefresh();
    } catch (error) {
      console.error('Error running validation:', error);
    }
    setValidating(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'High':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Data Quality Validation</h2>
        <div className="flex gap-2">
          <Button onClick={runValidation} disabled={validating}>
            <CheckCircle className="h-4 w-4 mr-2" />
            {validating ? 'Validating...' : 'Run Validation'}
          </Button>
          <Button onClick={onRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Issues</p>
              <h3 className="text-3xl font-bold mt-2">{validationReport?.total_issues || 0}</h3>
            </div>
            <AlertTriangle className="h-10 w-10 text-red-500" />
          </div>
        </Card>

        <Card className="p-6 border-red-200">
          <p className="text-sm text-gray-600">High Severity</p>
          <h3 className="text-3xl font-bold text-red-600 mt-2">{validationReport?.by_severity?.High || 0}</h3>
        </Card>

        <Card className="p-6 border-yellow-200">
          <p className="text-sm text-gray-600">Medium Severity</p>
          <h3 className="text-3xl font-bold text-yellow-600 mt-2">{validationReport?.by_severity?.Medium || 0}</h3>
        </Card>

        <Card className="p-6 border-blue-200">
          <p className="text-sm text-gray-600">Low Severity</p>
          <h3 className="text-3xl font-bold text-blue-600 mt-2">{validationReport?.by_severity?.Low || 0}</h3>
        </Card>
      </div>

      {/* Issues by Type */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Issues by Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {validationReport?.by_type && Object.entries(validationReport.by_type).map(([type, count]) => (
            <div key={type} className="p-4 border rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">{count}</p>
              <p className="text-sm text-gray-600 mt-1 capitalize">{type.replace(/_/g, ' ')}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Issues List */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Validation Issues</h3>
        <div className="space-y-3">
          {validationReport?.issues?.map((issue, idx) => (
            <div key={idx} className={`p-4 border rounded-lg ${getSeverityColor(issue.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-semibold capitalize">{issue.check_type.replace(/_/g, ' ')}</span>
                    <span className="px-2 py-1 text-xs rounded-full bg-white">
                      {issue.severity}
                    </span>
                  </div>
                  <p className="text-sm mb-2">{issue.description}</p>
                  <div className="flex items-center gap-4 text-xs">
                    <span>Affected Records: {issue.affected_records}</span>
                    <span>Date: {new Date(issue.check_date).toLocaleDateString()}</span>
                    <span className={`px-2 py-1 rounded-full ${
                      issue.status === 'Open' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {issue.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {(!validationReport?.issues || validationReport.issues.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-500" />
              <p>No validation issues found. Data quality is good!</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
