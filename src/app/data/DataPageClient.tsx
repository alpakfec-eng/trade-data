'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import ThemeToggle from '@/components/ThemeToggle';

interface TradeDataItem {
  _id: string;
  'HS CODE': string;
  'Product Name': string;
  'Product Category': string;
  'Item Description': string;
  'Grade': string;
  'Grade Category': string;
  'Origin': string;
  'Origin2': string;
  'Actual LC Date': string;
  'LC Date': string;
  'No. of Days - Shipment': string;
  'Importer Category': string;
  'Actual Importer Name': string;
  'Importer Name': string;
  'Imp Group': string;
  'Importer Address': string;
  'Agent Name': string;
  'Actual Consignor Name': string;
  'Consignor Name': string;
  'Consignor Group': string;
  'Consignor Group 12 Words': string;
  'Assessed Value': string;
  'Assessed Unit': string;
  'DCL Unit': string;
  'DCL Val': string;
  'Qty (Kg)': string;
  'Price/Kg': string;
  'QTY (Mts)': string;
  'Price/Mt': string;
  'PT DUTY': string;
  'PT STAX': string;
  'PTSTAX': string;
  'ITAXAT': string;
  'Machine No.': string;
  'Cash No': string;
  'Cash Date': string;
  'Month': string;
  'Year': string;
  'BE Type': string;
  'Port': string;
  'Port Name': string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export default function DataPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { status } = useSession();
  const [data, setData] = useState<TradeDataItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const product = searchParams.get('product') || '';
  const [sortField, setSortField] = useState(searchParams.get('sortField') || 'Grade Category');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [selectedItem, setSelectedItem] = useState<TradeDataItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  const fetchData = useCallback(async () => {
    if (status !== 'authenticated') return;
    
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    
    const response = await fetch(`/api/data?${params}`);
    const result = await response.json();
    setData(result.data);
    setPagination(result.pagination);
    setLoading(false);
  }, [searchParams, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  if (status === 'loading' || loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (status === 'unauthenticated') {
    return <div className="min-h-screen flex items-center justify-center">Redirecting to login...</div>;
  }

  const performSearch = () => {
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page on new search
    router.push(`/data?${params}`);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch();
  };

  const handlePageChange = (page: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', page.toString());
    router.push(`/data?${params}`);
  };

  const handleSort = (field: string) => {
    const newOrder = sortField === field && sortOrder === 'asc' ? 'desc' : 'asc';
    setSortField(field);
    setSortOrder(newOrder);
    const params = new URLSearchParams(searchParams);
    params.set('sortField', field);
    params.set('sortOrder', newOrder);
    params.set('page', '1');
    router.push(`/data?${params}`);
  };

  const handleRowClick = (item: TradeDataItem) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center py-4 sm:py-6 gap-4">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
                {product ? `Data for ${product}` : 'All Trade Data'}
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
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === 'Enter') {
                    performSearch();
                  }
                }}
                placeholder="Search by HS CODE, Product Name, Item Description, Grade, Grade Category, etc..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm sm:text-base"
              />
              <div className="flex gap-2 sm:gap-4">
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium flex-1 sm:flex-none"
                >
                  Search
                </button>
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      const params = new URLSearchParams(searchParams);
                      params.delete('search');
                      params.set('page', '1');
                      router.push(`/data?${params}`);
                    }}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium flex-1 sm:flex-none"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </form>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Item Description')}>
                      <span className="hidden sm:inline">Item Description</span>
                      <span className="sm:hidden">Description</span>
                      {sortField === 'Item Description' && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Grade')}>
                      Grade {sortField === 'Grade' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Grade Category')}>
                      <span className="hidden sm:inline">Grade Category</span>
                      <span className="sm:hidden">Category</span>
                      {sortField === 'Grade Category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span className="hidden sm:inline">Actual Importer Name</span>
                      <span className="sm:hidden">Importer</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      <span className="hidden sm:inline">Consignor Name</span>
                      <span className="sm:hidden">Consignor</span>
                    </th>
                    <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      HS CODE
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((item) => (
                    <tr key={item._id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => handleRowClick(item)}>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white" title={item['Item Description']}>
                        <div className="max-w-32 sm:max-w-none truncate">
                          {item['Item Description'].length > 50 ? `${item['Item Description'].substring(0, 50)}...` : item['Item Description']}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Grade']}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Grade Category']}
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="max-w-32 sm:max-w-none truncate">
                          {item['Actual Importer Name']}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="max-w-32 sm:max-w-none truncate">
                          {item['Consignor Name']}
                        </div>
                      </td>
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['HS CODE']}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {pagination && pagination.pages > 1 && (
            <div className="mt-6 flex justify-center">
              <div className="flex items-center space-x-1 sm:space-x-2">
                <button
                  onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                  disabled={pagination.page === 1}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">←</span>
                </button>
                <div className="hidden sm:flex">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = Math.max(1, Math.min(pagination.pages - 4, pagination.page - 2)) + i;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => handlePageChange(pageNum)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          pageNum === pagination.page
                            ? 'text-white bg-indigo-600'
                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <div className="sm:hidden">
                  <span className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {pagination.page} / {pagination.pages}
                  </span>
                </div>
                <button
                  onClick={() => handlePageChange(Math.min(pagination.pages, pagination.page + 1))}
                  disabled={pagination.page === pagination.pages}
                  className="px-2 sm:px-3 py-2 text-xs sm:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">→</span>
                </button>
                // ADD the last page link button
              </div>
            </div>
          )}

          {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">Trade Data Details</h3>
                </div>
                <div className="px-4 sm:px-6 py-4">
                  {selectedItem && (
                    <div className="space-y-3">
                      {Object.entries(selectedItem).map(([key, value]) => (
                        key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && (
                          <div key={key} className="flex flex-col sm:flex-row sm:justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
                            <span className="font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-0">{key}:</span>
                            <span className="text-gray-900 dark:text-white break-words">{String(value)}</span>
                          </div>
                        )
                      ))}
                    </div>
                  )}
                </div>
                <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                  <button
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 w-full sm:w-auto"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}