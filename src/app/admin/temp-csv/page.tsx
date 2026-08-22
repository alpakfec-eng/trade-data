'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface TempCSVItem {
  _id: string;
  headers: string[];
  rowCount: number;
  createdAt: string;
  expiresAt: string;
}

export default function TempCSVManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tempData, setTempData] = useState<TempCSVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<TempCSVItem | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated' || !session || !session.user || !['admin', 'super-admin'].includes((session.user as any).role)) {
      router.push('/login');
      return;
    }

    fetchTempData();
  }, [session, status, router]);

  const fetchTempData = async () => {
    try {
      const response = await fetch('/api/temp-csv');
      if (response.ok) {
        const data = await response.json();
        setTempData(data.tempData);
      }
    } catch (error) {
      console.error('Error fetching temp CSV data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this temp CSV data?')) return;

    try {
      const response = await fetch(`/api/temp-csv/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setTempData(tempData.filter(item => item._id !== id));
        if (selectedItem?._id === id) {
          setSelectedItem(null);
          setPreviewData([]);
        }
      } else {
        alert('Error deleting temp CSV data');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting temp CSV data');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('Are you sure you want to delete ALL temp CSV data? This cannot be undone.')) return;

    try {
      const response = await fetch('/api/temp-csv', {
        method: 'DELETE',
      });

      if (response.ok) {
        setTempData([]);
        setSelectedItem(null);
        setPreviewData([]);
      } else {
        alert('Error deleting all temp CSV data');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error deleting all temp CSV data');
    }
  };

  const handlePreview = async (item: TempCSVItem) => {
    setSelectedItem(item);
    setPreviewLoading(true);
    setPreviewData([]);

    try {
      const response = await fetch(`/api/temp-csv/${item._id}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewData(data.data.slice(0, 10)); // Show first 10 rows
      }
    } catch (error) {
      console.error('Error fetching preview:', error);
    } finally {
      setPreviewLoading(false);
    }
  };

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diff = expires.getTime() - now.getTime();

    if (diff <= 0) return 'Expired';

    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}m ${seconds}s`;
  };

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Temp CSV Management</h1>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <ThemeToggle />
              <Link
                href="/admin"
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Admin
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Stats and Actions */}
          <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Total: {tempData.length} temp CSV{tempData.length !== 1 ? 's' : ''} stored
            </div>
            {tempData.length > 0 && (
              <button
                onClick={handleDeleteAll}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Delete All
              </button>
            )}
          </div>

          {/* Temp CSV List */}
          {tempData.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md p-6 text-center">
              <p className="text-gray-500 dark:text-gray-400">No temp CSV data found.</p>
              <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
                Data uploaded for mapping will appear here and auto-expire after 1 hour.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* List */}
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Stored CSV Data</h3>
                  <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
                    Click on a row to preview and manage.
                  </p>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tempData.map((item) => (
                    <div
                      key={item._id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer ${
                        selectedItem?._id === item._id ? 'bg-indigo-50 dark:bg-indigo-900/30' : ''
                      }`}
                      onClick={() => handlePreview(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-xs">
                            {item.headers.slice(0, 3).join(', ')}{item.headers.length > 3 ? '...' : ''}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {item.headers.length} columns • Created: {new Date(item.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-orange-600 dark:text-orange-400 font-medium">
                            {getTimeRemaining(item.expiresAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
                <div className="px-4 py-5 sm:p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <div>
                    <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">Preview</h3>
                    {selectedItem && (
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        Showing first 10 rows
                      </p>
                    )}
                  </div>
                  {selectedItem && (
                    <div className="flex space-x-2">
                      <Link
                        href={`/upload-csv/mapping/${selectedItem._id}`}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-md text-sm font-medium"
                      >
                        Open Mapping
                      </Link>
                      <button
                        onClick={() => handleDelete(selectedItem._id)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                <div className="p-4">
                  {!selectedItem ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      Select a CSV to preview
                    </p>
                  ) : previewLoading ? (
                    <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                      Loading preview...
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            {selectedItem.headers.map((header, idx) => (
                              <th
                                key={idx}
                                className="px-2 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider whitespace-nowrap"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {previewData.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                              {selectedItem.headers.map((header, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="px-2 py-2 whitespace-nowrap text-gray-900 dark:text-white max-w-xs truncate"
                                >
                                  {row[header]?.toString() || '-'}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
