import { useGetAllPaidWorks } from '../hooks/useQueries';
import { useState } from 'react';
import ProductCard from './ProductCard';
import { Input } from '@/components/ui/input';
import { Search, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProductList() {
  const { data: works, isLoading, refetch, isFetching } = useGetAllPaidWorks();
  const [searchQuery, setSearchQuery] = useState('');

  // Sort works by publication date (newest to oldest)
  const sortedWorks = works?.slice().sort((a, b) => {
    return Number(b.publishedAt) - Number(a.publishedAt);
  });

  const filteredWorks = sortedWorks?.filter((work) =>
    work.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    work.author.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold">付费作品</h2>
            <p className="text-sm text-muted-foreground">
              共 {filteredWorks?.length || 0} 个作品
            </p>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索作品或作者..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {!filteredWorks || filteredWorks.length === 0 ? (
        <div className="flex min-h-[400px] items-center justify-center rounded-lg border-2 border-dashed">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? '未找到匹配的作品' : '暂无作品'}
            </p>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? '尝试其他搜索词' : '发布第一个作品吧！'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWorks.map((work) => (
            <ProductCard
              key={work.id}
              product={work}
            />
          ))}
        </div>
      )}
    </div>
  );
}
