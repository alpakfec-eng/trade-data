'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface CSVData {
  headers: string[];
  data: Record<string, any>[];
  rowCount: number;
}

const dbFields = [
  'HS CODE',
  'Product Name',
  'Product Category',
  'Item Description',
  'Grade',
  'Grade Category',
  'Origin',
  'Origin2',
  'Actual LC Date',
  'LC Date',
  'No. of Days - Shipment',
  'Importer Category',
  'Actual Importer Name',
  'Importer Name',
  'Imp Group',
  'Importer Address',
  'Agent Name',
  'Actual Consignor Name',
  'Consignor Name',
  'Consignor Group',
  'Consignor Group 12 Words',
  'Assessed Value',
  'Assessed Unit',
  'DCL Unit',
  'DCL Val',
  'Qty (Kg)',
  'Price/Kg',
  'QTY (Mts)',
  'Price/Mt',
  'PT DUTY',
  'PT STAX',
  'PTSTAX',
  'ITAXAT',
  'Machine No.',
  'Cash No',
  'Cash Date',
  'Month',
  'Year',
  'BE Type',
  'Port',
  'Port Name',
];

export default function MappingPage() {
  const router = useRouter();
  const params = useParams();
  const { status } = useSession();
  const [csvData, setCsvData] = useState<CSVData | null>(null);
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [editedData, setEditedData] = useState<Record<number, Record<string, any>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [customFields, setCustomFields] = useState<string[]>([]);
  const [newFieldName, setNewFieldName] = useState('');
  const [previewRows, setPreviewRows] = useState(5);

  const tempId = params.id as string;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (tempId) {
      fetchCSVData();
    }
  }, [tempId]);

  const fetchCSVData = async () => {
    try {
      const response = await fetch(`/api/temp-csv/${tempId}`);
      if (response.ok) {
        const data = await response.json();
        setCsvData(data);

        // Initialize mappings with auto-suggestions
        const initialMappings: Record<string, string> = {};
        data.headers.forEach((header: string) => {
          const normalized = header.toLowerCase().trim();
          const matchedField = dbFields.find(field =>
            field.toLowerCase().replace(/[^a-z0-9]/g, '') === normalized.replace(/[^a-z0-9]/g, '')
          );
          if (matchedField) {
            initialMappings[header] = matchedField;
          }
        });
        setMappings(initialMappings);
      } else {
        setError('Failed to load CSV data');
      }
    } catch (err) {
      console.error('Error fetching CSV data:', err);
      setError('An error occurred while loading CSV data');
    } finally {
      setLoading(false);
    }
  };

  const handleMappingChange = (csvField: string, dbField: string) => {
    setMappings(prev => ({
      ...prev,
      [csvField]: dbField,
    }));
  };

  const handleDataEdit = (rowIndex: number, field: string, value: string) => {
    setEditedData(prev => ({
      ...prev,
      [rowIndex]: {
        ...prev[rowIndex],
        [field]: value,
      },
    }));
  };

  const addCustomField = () => {
    if (newFieldName.trim() && !dbFields.includes(newFieldName) && !customFields.includes(newFieldName)) {
      setCustomFields(prev => [...prev, newFieldName.trim()]);
      setNewFieldName('');
    }
  };

  const allAvailableFields = [...dbFields, ...customFields];

  const handleImport = async () => {
    if (!csvData) {
      setError('No CSV data available');
      return;
    }

    // Validate that all CSV headers have mappings
    const unmappedHeaders = csvData.headers.filter(header => !mappings[header]);
    if (unmappedHeaders.length > 0) {
      setError(`Please map the following fields: ${unmappedHeaders.join(', ')}`);
      return;
    }

    setImporting(true);
    setError('');
    try {
      const response = await fetch('/api/import-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tempId,
          mappings,
          editedData,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`Successfully imported ${result.insertedCount} records`);
        router.push('/dashboard');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to import data');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError('An error occurred while importing data');
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading CSV data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <Link
            href="/upload-csv"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md"
          >
            Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  if (!csvData) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Map CSV Fields ({csvData.rowCount} rows)
            </h1>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end">
              <ThemeToggle />
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0 space-y-6">
          {/* Field Mapping Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Field Mapping</h2>
            
            {/* Add Custom Field */}
            <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Custom Field</h3>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newFieldName}
                  onChange={(e) => setNewFieldName(e.target.value)}
                  placeholder="Enter custom field name"
                  className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
                <button
                  onClick={addCustomField}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Add Field
                </button>
              </div>
              {customFields.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Custom fields: {customFields.join(', ')}</p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {csvData.headers.map((header) => (
                <div key={header} className="flex items-center space-x-4">
                  <label className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {header}
                  </label>
                  <select
                    value={mappings[header] || ''}
                    onChange={(e) => handleMappingChange(header, e.target.value)}
                    className="flex-1 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  >
                    <option value="">-- Select Database Field --</option>
                    {allAvailableFields.map((field) => (
                      <option key={field} value={field}>{field}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Data Preview Section */}
          <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium text-gray-900 dark:text-white">Data Preview</h2>
              <div className="flex items-center space-x-2">
                <label className="text-sm text-gray-700 dark:text-gray-300">Show rows:</label>
                <select
                  value={previewRows}
                  onChange={(e) => setPreviewRows(Number(e.target.value))}
                  className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Row
                    </th>
                    {csvData.headers.map((header) => (
                      <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        {header} {mappings[header] && `→ ${mappings[header]}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {csvData.data.slice(0, previewRows).map((row, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        {index + 1}
                      </td>
                      {csvData.headers.map((header) => (
                        <td key={header} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          <input
                            type="text"
                            value={editedData[index]?.[mappings[header] || header] ?? row[header] ?? ''}
                            onChange={(e) => handleDataEdit(index, mappings[header] || header, e.target.value)}
                            className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Import Button */}
          <div className="flex justify-end space-x-4">
            <Link
              href="/upload-csv"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Upload
            </Link>
            <button
              onClick={handleImport}
              disabled={importing}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {importing ? 'Importing...' : 'Import Data'}
            </button>
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm">{error}</div>
          )}
        </div>
      </main>
    </div>
  );
}