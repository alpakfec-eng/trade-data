'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface TradeDataItem {
  _id: string;
  'HS CODE': string;
  'Item Description': string;
  'Consignor Name': string;
  'Consignor Address': string;
  'Origin': string;
  'Quantity': string;
  'Unit': string;
  'USA VAL': string;
  'DECL VAL': string;
  'TOTAL PKR VALU ASSESSED': string;
  'CASH DATE': string;
  'LC No': string;
  'BL Number': string;
  'PORT': string;
}

export default function ImporterDataPage() {
  const params = useParams();
  const importer = params.importer as string;
  const [data, setData] = useState<TradeDataItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (importer) {
      fetch(`/api/importers/${encodeURIComponent(importer)}/data`)
        .then(res => res.json())
        .then(data => {
          setData(data.data);
          setLoading(false);
        })
        .catch(error => {
          console.error('Error fetching importer data:', error);
          setLoading(false);
        });
    }
  }, [importer]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                Data for Importer: {decodeURIComponent(importer)}
              </h1>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Showing all trade data records for this importer
              </p>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end">
              <ThemeToggle />
              <div className="flex space-x-2">
                <Link
                  href="/importers"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  Back to Importers
                </Link>
                <Link
                  href="/dashboard"
                  className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs sm:text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      HS CODE
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Item Description
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Consignor
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Origin
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Quantity
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      USA VAL
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      DECL VAL
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Total PKR
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Cash Date
                    </th>
                    <th className="px-2 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap">
                      Port
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['HS CODE']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-48 truncate" title={item['Item Description']}>
                          {item['Item Description']}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-32 truncate" title={item['Consignor Name']}>
                          {item['Consignor Name']}
                        </div>
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item['Origin']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item['Quantity']} {item['Unit']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${item['USA VAL']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        ${item['DECL VAL']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        Rs. {item['TOTAL PKR VALU ASSESSED']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item['CASH DATE']}
                      </td>
                      <td className="px-2 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {item['PORT']}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
