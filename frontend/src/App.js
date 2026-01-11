import { useState, useEffect } from "react";
import "@/App.css";
import axios from "axios";
import { DollarSign, Activity, AlertTriangle, Database, Upload, Layers, BarChart3, Menu, X, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
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
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tapp-theme') || 'light';
  });
  
  // Data states
  const [globalPosition, setGlobalPosition] = useState(null);
  const [poolStatus, setPoolStatus] = useState(null);
  const [nettingResults, setNettingResults] = useState(null);
  const [validationReport, setValidationReport] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [trends, setTrends] = useState(null);
  const [regionalData, setRegionalData] = useState({ APAC: null, EMEA: null, AMER: null });

  // Apply theme on mount and change
  useEffect(() => {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('tapp-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

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
      toast.success('System initialized successfully!', {
        description: 'Sample data loaded and ready to use'
      });
    } catch (error) {
      console.error('Error initializing system:', error);
      toast.error('Failed to initialize system', {
        description: error.response?.data?.detail || 'Please check backend connection.'
      });
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
      toast.success('Data refreshed successfully');
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data', {
        description: error.response?.data?.detail || error.message
      });
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
      <>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-12 max-w-2xl text-center">
            <Database className="h-20 w-20 text-blue-600 dark:text-blue-400 mx-auto mb-6" />
            <h1 className="text-4xl font-bold text-gray-800 dark:text-gray-100 mb-4">
              Global Treasury Intelligence Platform
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-8 text-lg">
              Automated liquidity management, cash pooling, and netting system
            </p>
            <div className="space-y-4 text-left mb-8 bg-blue-50 dark:bg-gray-700 p-6 rounded-lg">
              <h3 className="font-semibold text-lg mb-3 dark:text-gray-200">Features:</h3>
              <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span> Real-time liquidity monitoring across regions
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span> Automated cash pooling optimization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span> Inter-company netting automation
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span> Excel/CSV data import
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-blue-600 dark:text-blue-400">✓</span> Power BI/API connectivity
                </li>
              </ul>
            </div>
            <Button
              onClick={initializeSystem}
              disabled={loading}
              size="lg"
              className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 px-8 py-6 text-lg"
            >
              {loading ? 'Initializing...' : 'Initialize with Sample Data'}
            </Button>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
              Or use the Import feature to load your own data from Excel/CSV
            </p>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'w-64' : 'w-0'} bg-gray-900 dark:bg-gray-950 text-white transition-all duration-300 overflow-hidden`}>
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
                        : 'text-gray-300 hover:bg-gray-800 dark:hover:bg-gray-900'
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
          <div className="bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
              >
                <Menu size={24} />
              </button>
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                  {navigationItems.find(item => item.id === activeView)?.label}
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Connected to: {BACKEND_URL}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={toggleTheme}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'light' ? (
                  <Moon className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                ) : (
                  <Sun className="w-5 h-5 text-gray-700 dark:text-gray-300" />
                )}
              </button>
              <Button onClick={loadAllData} variant="outline" size="sm">
                Refresh Data
              </Button>
            </div>
          </div>

          <div className="p-6">
            {renderContent()}
          </div>
        </div>
      </div>
    </>
  );
}

export default App;

