'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';

export default function Dashboard() {
  const { data: session } = useSession();
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching products:', error);
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
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
              <div className="flex items-center space-x-2 sm:space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                <ThemeToggle />
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Welcome, {session?.user?.name}</span>
              </div>
              <button
                onClick={() => signOut()}
                className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium w-full sm:w-auto"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Products</h2>
            <div className="grid grid-cols-2 sm:flex sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              {(['admin', 'super-admin'].includes((session?.user as any)?.role)) && (
                <Link
                  href="/admin"
                  className="bg-red-600 hover:bg-red-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
                >
                  Admin Panel
                </Link>
              )}
              <Link
                href="/data"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                View All Data
              </Link>
              <Link
                href="/new-data"
                className="bg-green-600 hover:bg-green-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                Add New Data
              </Link>
              <Link
                href="/upload-csv"
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                Upload CSV
              </Link>
              <Link
                href="/grades"
                className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                Grades List
              </Link>
              <Link
                href="/importers"
                className="bg-teal-600 hover:bg-teal-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                Importers List
              </Link>
              <Link
                href="/consignors"
                className="bg-orange-600 hover:bg-orange-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium text-center"
              >
                Consignors List
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product, index) => (
              <div key={index} className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-sm font-medium">
                          {product.charAt(0).toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                          Product
                        </dt>
                        <dd className="text-lg font-medium text-gray-900 dark:text-white">
                          {product}
                        </dd>
                      </dl>
                    </div>
                  </div>
                  <div className="mt-5">
                    <Link
                      href={`/data?product=${encodeURIComponent(product)}`}
                      className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 text-sm font-medium"
                    >
                      View Data →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}