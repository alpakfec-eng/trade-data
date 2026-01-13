'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const fields = [
  'HS CODE', 'Product Name', 'Product Category', 'Item Description', 'Grade', 'Grade Category',
  'Origin', 'Origin2', 'Actual LC Date', 'LC Date', 'No. of Days - Shipment', 'Importer Category',
  'Actual Importer Name', 'Importer Name', 'Imp Group', 'Importer Address', 'Agent Name',
  'Actual Consignor Name', 'Consignor Name', 'Consignor Group', 'Consignor Group 12 Words',
  'Assessed Value', 'Assessed Unit', 'DCL Unit', 'DCL Val', 'Qty (Kg)', 'Price/Kg', 'QTY (Mts)',
  'Price/Mt', 'PT DUTY', 'PT STAX', 'PTSTAX', 'ITAXAT', 'Machine No.', 'Cash No', 'Cash Date',
  'Month', 'Year', 'BE Type', 'Port', 'Port Name'
];

export default function NewDataPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        router.push('/data');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add data');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('An error occurred while adding data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">Add New Trade Data</h1>
            <Link
              href="/dashboard"
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {fields.map((field) => (
                <div key={field}>
                  <label htmlFor={field} className="block text-sm font-medium text-gray-700">
                    {field}
                  </label>
                  <input
                    type="text"
                    id={field}
                    value={formData[field] || ''}
                    onChange={(e) => handleChange(field, e.target.value)}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="text-red-600 text-sm">{error}</div>
            )}

            <div className="flex justify-end space-x-4">
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {loading ? 'Adding...' : 'Add Data'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}