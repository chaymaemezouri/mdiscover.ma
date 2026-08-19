'use client';

import { useParams } from 'next/navigation';
import { CategoryEditor } from '../../CategoryEditor';

export default function EditCategoryPage() {
  const params = useParams<{ id: string }>();
  return <CategoryEditor categoryId={params.id} />;
}
