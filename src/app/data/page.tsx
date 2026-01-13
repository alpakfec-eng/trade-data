import { Suspense } from 'react';
import DataPageClient from './DataPageClient';

export default function DataPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DataPageClient />
    </Suspense>
  );
}