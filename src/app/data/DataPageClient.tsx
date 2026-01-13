'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pagination, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Button, HeroUIProvider } from '@heroui/react';

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
  const [data, setData] = useState<TradeDataItem[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const product = searchParams.get('product') || '';
  const [sortField, setSortField] = useState(searchParams.get('sortField') || 'Grade Category');
  const [sortOrder, setSortOrder] = useState(searchParams.get('sortOrder') || 'asc');
  const [selectedItem, setSelectedItem] = useState<TradeDataItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams(searchParams);
    
    const response = await fetch(`/api/data?${params}`);
    const result = await response.json();
    setData(result.data);
    setPagination(result.pagination);
    setLoading(false);
  }, [searchParams]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    // Sync searchInput with URL params
    const urlSearch = searchParams.get('search') || '';
    setSearchInput(urlSearch);
  }, [searchParams]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (searchInput) {
      params.set('search', searchInput);
    } else {
      params.delete('search');
    }
    params.set('page', '1'); // Reset to first page on new search
    router.push(`/data?${params}`);
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
    <HeroUIProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <header className="bg-white dark:bg-gray-800 shadow">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {product ? `Data for ${product}` : 'All Trade Data'}
              </h1>
              <Link
                href="/dashboard"
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Back to Dashboard
              </Link>
            </div>
          </div>
        </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <form onSubmit={handleSearch} className="mb-6">
            <div className="flex gap-4">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch(e as any);
                  }
                }}
                placeholder="Search by HS CODE, Product Name, Item Description, Grade, Grade Category, etc..."
                className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
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
                  className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </form>

          <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-md">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Item Description')}>
                      Item Description {sortField === 'Item Description' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Grade')}>
                      Grade {sortField === 'Grade' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('Grade Category')}>
                      Grade Category {sortField === 'Grade Category' && (sortOrder === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Actual Importer Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Consignor Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      HS CODE
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {data.map((item) => (
                    <tr key={item._id} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700" onClick={() => handleRowClick(item)}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Item Description']}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Grade']}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Grade Category']}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Actual Importer Name']}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {item['Consignor Name']}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
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
              <Pagination
                color="primary"
                initialPage={pagination.page}
                total={pagination.pages}
                onChange={handlePageChange}
              />
            </div>
          )}

          <Modal isOpen={isModalOpen} onOpenChange={setIsModalOpen}>
            <ModalContent>
              <ModalHeader>Trade Data Details</ModalHeader>
              <ModalBody>
                {selectedItem && (
                  <div className="space-y-2">
                    {Object.entries(selectedItem).map(([key, value]) => (
                      key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && (
                        <div key={key} className="flex justify-between">
                          <span className="font-medium">{key}:</span>
                          <span>{String(value)}</span>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button color="danger" variant="light" onPress={() => setIsModalOpen(false)}>
                  Close
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>
        </div>
      </main>
    </div>
    </HeroUIProvider>
  );
}