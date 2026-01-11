import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { DollarSign, Activity, AlertTriangle, Database, Upload, Layers, BarChart3, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Dashboard from "@/pages/Dashboard";
import Liquidity from "@/pages/Liquidity";
import CashPooling from "@/pages/CashPooling";
import Netting from "@/pages/Netting";
import DataValidation from "@/pages/DataValidation";
import DataImport from "@/pages/DataImport";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";
const API = `${BACKEND_URL}/api`;

function App() {
  const [activeView, setActiveView] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Data states
  const [globalPosition, setGlobalPosition] = useState(null);
  const [poolStatus, setPoolStatus] = useState(null);
  const [nettingResults, setNettingResults] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [regionalData, setRegionalData] = useState({ APAC: null, EMEA: null, AMER: null });

  // Initialize system with sample data
  const initializeSystem = async () => {
    setLoading(true);
    try {
      await axios.post(`${API}/treasury/setup/initialize`);
      await axios.post(`${API}/treasury/setup/generate-balances`);
      await axios.post(`${API}/treasury/validate`);
      await axios.post(`${API}/treasury/netting/run`);
      
      setInitialized(true);
      await loadAllData();
    } catch (error) {
      console.error('Error initializing system:', error);
      alert('Failed to initialize. Please check backend connection.');
    }
    setLoading(false);
  };

  // Load all data
  const loadAllData = async () => {
    setLoading(true);
    try {
      const [global, pools, netting, validation, analyticsData, trendsData, apac, emea, amer] = await Promise.all([
        axios.get(`${API}/treasury/liquidity/global-position`),
        axios.get(`${API}/treasury/cash-pool/status`),
        axios.get(`${API}/treasury/netting/results`),
        axios.get(`${API}/treasury/validation/report`),
        axios.get(`${API}/treasury/analytics/summary`),
        axios.get(`${API}/treasury/analytics/trends`),
        axios.get(`${API}/treasury/liquidity/by-region/APAC`),
        axios.get(`${API}/treasury/liquidity/by-region/EMEA`),
        axios.get(`${API}/treasury/liquidity/by-region/AMER`),
      ]);

      setGlobalPosition(global.data);
      setPoolStatus(pools.data);
      setNettingResults(netting.data);
      setValidationReport(validation.data);
      setAnalytics(analyticsData.data);
      setTrends(trendsData.data);
      setRegionalData({
        APAC: apac.data,
        EMEA: emea.data,
        AMER: amer.data
      });
    } catch (error) {
      console.error('Error loading data:', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    const checkData = async () => {
      try {
        const response = await axios.get(`${API}/treasury/analytics/summary`);
        if (response.data.total_accounts > 0) {
          setInitialized(true);
          loadAllData();
        }
      } catch (error) {
        console.log('No data yet, need to initialize');
      }
    };
    checkData();
  }, []);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'liquidity', label: 'Liquidity', icon: DollarSign },
    { id: 'cash-pooling', label: 'Cash Pooling', icon: Layers },
    { id: 'netting', label: 'Netting', icon: Activity },
    { id: 'validation', label: 'Data Quality', icon: AlertTriangle },
    { id: 'import', label: 'Import Data', icon: Upload },
  ];

  const renderContent = () => {
    const props = {
      loading,
      onRefresh: loadAllData,
      globalPosition,
      regionalData,
      poolStatus,
      nettingResults,
      validationReport,
      analytics,
      trends
    };

    switch (activeView) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'liquidity':
        return <Liquidity {...props} />;
      case 'cash-pooling':
        return <CashPooling {...props} />;
      case 'netting':
        return <Netting {...props} />;
      case 'validation':
        return <DataValidation {...props} />;
      case 'import':
        return <DataImport onDataImported={loadAllData} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  if (!initialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
          <Database className="h-20 w-20 text-blue-600 mx-auto mb-6" />
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            Global Treasury Intelligence Platform
          </h1>
          <p className="text-gray-600 mb-8 text-lg">
            Automated liquidity management, cash pooling, and netting system
          </p>
          <div className="space-y-4 text-left mb-8 bg-blue-50 p-6 rounded-lg">
            <h3 className="font-semibold text-lg mb-3">Features:</h3>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span> Real-time liquidity monitoring across regions
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span> Automated cash pooling optimization
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span> Inter-company netting automation
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span> Excel/CSV data import
              </li>
              <li className="flex items-center gap-2">
                <span className="text-blue-600">✓</span> Power BI/API connectivity
              </li>
            </ul>
          </div>
          <Button
            onClick={initializeSystem}
            disabled={loading}
            size="lg"
            className="bg-blue-600 hover:bg-blue-700 px-8 py-6 text-lg"
          >
            {loading ? 'Initializing...' : 'Initialize with Sample Data'}
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Or use the Import feature to load your own data from Excel/CSV
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 text-white transition-all duration-300 overflow-hidden`}>
        <div className="p-6">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-xl font-bold">Treasury Platform</h1>
            <button onClick={() => setSidebarOpen(false)} className="lg:hidden">
              <X size={20} />
            </button>
          </div>

          <nav className="space-y-2">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    activeView === item.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="bg-white shadow-sm border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">
                {navigationItems.find(item => item.id === activeView)?.label}
              </h2>
              <p className="text-sm text-gray-600">
                Connected to: {BACKEND_URL}
              </p>
            </div>
          </div>
          <Button onClick={loadAllData} variant="outline" size="sm">
            Refresh Data
          </Button>
        </div>

        <div className="p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}

export default App;
