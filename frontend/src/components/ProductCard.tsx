import { useNavigate } from '@tanstack/react-router';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Image as ImageIcon, FileText, User, Shuffle, Music } from 'lucide-react';
import type { WorkSummary } from '../backend';

interface ProductCardProps {
  product: WorkSummary;
}

export default function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate();

  const formatICP = (e8s: bigint): string => {
    return (Number(e8s) / 100_000_000).toFixed(4);
  };

  const formatDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleClick = () => {
    navigate({ to: '/article/$id', params: { id: product.id } });
  };

  const isTextWork = product.workType === 'text';
  const isImageWork = product.workType === 'image';
  const isAudioWork = product.workType === 'audio';
  const isFileWork = product.workType === 'file';

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow flex flex-col"
      onClick={handleClick}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">{product.title}</CardTitle>
          <div className="flex flex-col gap-1 shrink-0">
            {isImageWork && (
              <Badge variant="outline" className="text-xs">
                <ImageIcon className="h-3 w-3 mr-1" />
                图片
              </Badge>
            )}
            {isAudioWork && (
              <Badge variant="outline" className="text-xs">
                <Music className="h-3 w-3 mr-1" />
                音频
              </Badge>
            )}
            {isFileWork && (
              <Badge variant="outline" className="text-xs">
                <FileText className="h-3 w-3 mr-1" />
                文件
              </Badge>
            )}
            {isTextWork && product.randomUnlock && (
              <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                <Shuffle className="h-3 w-3 mr-1" />
                随机解锁
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <User className="h-3.5 w-3.5" />
            <span className="font-medium">{product.author}</span>
          </div>
          <span className="text-muted-foreground">•</span>
          <span className="text-muted-foreground">{formatDate(product.publishedAt)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 flex-1">
        {product.contentPreview && (
          <div className="text-sm text-muted-foreground line-clamp-3">
            {product.contentPreview}
          </div>
        )}
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">目标金额</span>
            <span className="font-medium">{formatICP(product.targetAmount)} ICP</span>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        {isTextWork && product.randomUnlock && (
          <Badge variant="outline" className="bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
            <Shuffle className="h-3 w-3 mr-1" />
            随机解锁模式
          </Badge>
        )}
      </CardFooter>
    </Card>
  );
}
