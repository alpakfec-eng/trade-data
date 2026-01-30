'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface ImporterData {
  importerName: string;
  importerAddress: string;
  count: number;
}

export default function ImportersPage() {
  const router = useRouter();
  const { status } = useSession();
  const [importers, setImporters] = useState<ImporterData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/importers')
      .then(res => res.json())
      .then(data => {
        setImporters(data.importers);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching importers:', error);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Actual Importer List</h1>
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
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Importer Name
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Address
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Records
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {importers.map((importer) => (
                    <tr key={importer.importerName} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <div className="max-w-64 sm:max-w-none truncate">
                          {importer.importerName}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        <div className="max-w-64 sm:max-w-none truncate">
                          {importer.importerAddress || 'N/A'}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                        {importer.count}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/importers/${encodeURIComponent(importer.importerName)}/data`}
                          className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300"
                        >
                          View Data →
                        </Link>
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