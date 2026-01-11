import { useState } from "react";
import { Upload, FileSpreadsheet, Database, CheckCircle, XCircle, Download, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv'];

export default function DataImport({ onDataImported }) {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [dataType, setDataType] = useState('cash_balances');
  const [validationError, setValidationError] = useState(null);

  const validateFile = (file) => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size exceeds 10MB limit (${(file.size / 1024 / 1024).toFixed(2)}MB)`;
    }

    // Check file extension
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Please upload ${ALLOWED_EXTENSIONS.join(', ')} files only.`;
    }

    return null;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        setSelectedFile(null);
        toast.error('Invalid file', { description: error });
        event.target.value = ''; // Reset input
        return;
      }
      
      setSelectedFile(file);
      setUploadStatus(null);
      setValidationError(null);
      toast.info('File selected', { 
        description: `${file.name} (${(file.size / 1024).toFixed(2)}KB)` 
      });
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('No file selected');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('data_type', dataType);

    try {
      const response = await axios.post(`${API}/treasury/import/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadStatus({
        success: true,
        message: response.data.message,
        count: response.data.records_imported,
      });

      toast.success('Upload successful!', {
        description: `${response.data.records_imported} records imported`
      });

      if (onDataImported) {
        onDataImported();
      }

      // Reset form
      setSelectedFile(null);
      document.querySelector('input[type="file"]').value = '';
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Upload failed';
      setUploadStatus({
        success: false,
        message: errorMsg,
      });
      toast.error('Upload failed', { description: errorMsg });
    }
    setUploading(false);
  };

  const downloadTemplate = (type) => {
    const templates = {
      cash_balances: `account_number,balance_date,currency,balance_local,entity_code,region
ACC-001,2026-01-11,USD,1000000.00,JCI-US-001,AMER
ACC-002,2026-01-11,EUR,500000.00,JCI-DE-001,EMEA`,
      bank_accounts: `account_number,account_name,entity_code,bank_name,currency,country_code,account_type
ACC-001,Main Operating Account,JCI-US-001,JPMorgan,USD,US,Operating
ACC-002,Euro Account,JCI-DE-001,Deutsche Bank,EUR,DE,Operating`,
      fx_rates: `currency_pair,rate,rate_date
EUR/USD,1.10,2026-01-11
GBP/USD,1.27,2026-01-11`,
      entities: `entity_code,entity_name,country_code,region
JCI-US-001,JCI Americas Corp,US,AMER
JCI-DE-001,JCI Deutschland GmbH,DE,EMEA`
    };

    const blob = new Blob([templates[type]], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_template.csv`;
    a.click();
    toast.success('Template downloaded', { description: `${type}_template.csv` });
  };

  const exportData = async (exportType) => {
    try {
      toast.info('Preparing export...', { description: 'Generating Excel file' });
      
      const response = await axios.get(
        `${API}/treasury/export/${exportType}`,
        { responseType: 'blob' }
      );
      
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportType}_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Export complete!', { description: `${exportType} data downloaded` });
    } catch (error) {
      const errorMsg = error.response?.data?.detail || 'Export failed';
      toast.error('Export failed', { description: errorMsg });
    }
  };


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Data Import</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upload Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Data File
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Data Type</label>
              <select
                value={dataType}
                onChange={(e) => setDataType(e.target.value)}
                className="w-full p-2 border rounded-lg"
              >
                <option value="cash_balances">Cash Balances</option>
                <option value="bank_accounts">Bank Accounts</option>
                <option value="fx_rates">FX Rates</option>
                <option value="entities">Legal Entities</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Select File (Excel/CSV)</label>
              <div className={`border-2 border-dashed rounded-lg p-8 text-center ${
                validationError ? 'border-red-300 bg-red-50 dark:bg-red-900/10' : 'border-gray-300'
              }`}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label htmlFor="file-upload" className="cursor-pointer">
                  <FileSpreadsheet className={`h-12 w-12 mx-auto mb-2 ${
                    validationError ? 'text-red-400' : 'text-gray-400'
                  }`} />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {selectedFile ? selectedFile.name : 'Click to upload Excel or CSV file'}
                  </p>
                  {selectedFile && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(2)}KB
                    </p>
                  )}
                </label>
              </div>
              {validationError && (
                <div className="mt-2 flex items-center gap-2 text-sm text-red-600 dark:text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  <span>{validationError}</span>
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Accepted formats: .xlsx, .xls, .csv (Max 10MB)
              </p>
            </div>

            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="w-full"
            >
              {uploading ? 'Uploading...' : 'Upload & Import'}
            </Button>

            {uploadStatus && (
              <div className={`p-4 rounded-lg ${uploadStatus.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                <div className="flex items-center gap-2">
                  {uploadStatus.success ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                  <div>
                    <p className="font-medium">{uploadStatus.message}</p>
                    {uploadStatus.count && <p className="text-sm">Records imported: {uploadStatus.count}</p>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Templates Section */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Download className="h-5 w-5" />
            Download Templates
          </h3>

          <div className="space-y-3">
            <p className="text-sm text-gray-600 mb-4">
              Download CSV templates with the required format for each data type.
            </p>

            {[
              { type: 'cash_balances', label: 'Cash Balances Template', desc: 'Daily account balances' },
              { type: 'bank_accounts', label: 'Bank Accounts Template', desc: 'Bank account master data' },
              { type: 'fx_rates', label: 'FX Rates Template', desc: 'Foreign exchange rates' },
              { type: 'entities', label: 'Legal Entities Template', desc: 'Legal entity master data' }
            ].map(({ type, label, desc }) => (
              <div key={type} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-sm text-gray-600">{desc}</p>
                </div>
                <Button
                  onClick={() => downloadTemplate(type)}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Instructions */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Import Instructions</h3>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
          <p>1. Download the appropriate CSV template for your data type</p>
          <p>2. Fill in your data following the template format</p>
          <p>3. Save as Excel (.xlsx) or CSV (.csv) file (Max 10MB)</p>
          <p>4. Select the data type and upload your file</p>
          <p>5. The system will validate and import your data automatically</p>
          <p className="mt-4 text-blue-600 dark:text-blue-400">💡 Tip: You can also connect directly from Power BI, Tableau, or Excel using the REST API endpoints</p>
        </div>
      </Card>

      {/* Export Section */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Download className="h-5 w-5" />
          Export Data
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Export current data from the system to Excel format
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { type: 'cash_balances', label: 'Cash Balances' },
            { type: 'bank_accounts', label: 'Bank Accounts' },
            { type: 'entities', label: 'Legal Entities' },
            { type: 'fx_rates', label: 'FX Rates' },
            { type: 'netting_results', label: 'Netting Results' },
            { type: 'validation_logs', label: 'Validation Logs' }
          ].map(({ type, label }) => (
            <Button
              key={type}
              onClick={() => exportData(type)}
              variant="outline"
              className="justify-between"
            >
              <span>{label}</span>
              <Download className="h-4 w-4" />
            </Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
