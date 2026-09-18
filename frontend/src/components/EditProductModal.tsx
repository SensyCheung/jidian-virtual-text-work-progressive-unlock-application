import { useState } from 'react';
import { useUpdateProduct } from '../hooks/useQueries';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { AlertCircle, Upload, X, Image as ImageIcon, Loader2, FileText, Music } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { resizeImageToScale, getImageQualityLabel } from '../lib/imageUtils';
import { uploadFileToBlobStorage } from '../lib/blobStorage';
import RichTextEditor from './RichTextEditor';
import type { Work, ImageVersion, FileVersion, WorkType } from '../backend';

interface EditProductModalProps {
  product: Work;
  receivedAmount: bigint;
  onClose: () => void;
}

export default function EditProductModal({ product, receivedAmount, onClose }: EditProductModalProps) {
  const workType = product.workType === 'image' ? 'image' : product.workType === 'file' ? 'file' : product.workType === 'audio' ? 'audio' : 'text';
  const hasReceivedPayments = receivedAmount > BigInt(0);
  
  const [title, setTitle] = useState(product.title);
  const [freeContent, setFreeContent] = useState(product.content.split('\n')[0] || '');
  const [paidContent, setPaidContent] = useState(product.content.split('\n').slice(1).join('\n') || '');
  const [targetAmount, setTargetAmount] = useState((Number(product.targetAmount) / 100000000).toString());
  const [accountId, setAccountId] = useState(product.accountId);
  const [progressiveUnlock, setProgressiveUnlock] = useState(product.progressiveUnlock);
  const [randomUnlock, setRandomUnlock] = useState(product.randomUnlock);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateProduct = useUpdateProduct();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error('请选择图片文件');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('图片大小不能超过10MB');
        return;
      }
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error('文件大小不能超过50MB');
        return;
      }
      setUploadFile(file);
    }
  };

  const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp3|wav)$/i)) {
        toast.error('请选择音频文件（MP3 或 WAV）');
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error('音频文件大小不能超过50MB');
        return;
      }
      setAudioFile(file);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const removeFile = () => {
    setUploadFile(null);
  };

  const removeAudio = () => {
    setAudioFile(null);
  };

  const processAndConvertImage = async (file: File): Promise<ImageVersion[]> => {
    const scales = [10, 40, 70, 100];
    const imageVersions: ImageVersion[] = [];
    
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i];
      setUploadProgress(Math.floor((i / scales.length) * 100));
      
      console.log(`[EditProduct] Processing image at ${scale}% scale`);
      
      const resizedBlob = await resizeImageToScale(file, scale);
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resizedBlob);
      });
      
      console.log(`[EditProduct] Image processed at ${scale}%, size: ${dataUrl.length} bytes`);
      
      imageVersions.push({
        url: dataUrl,
        resolutionPercentage: BigInt(scale),
        fundingThreshold: BigInt(scale),
      });
    }
    
    setUploadProgress(100);
    return imageVersions;
  };

  const processFile = async (file: File): Promise<FileVersion> => {
    console.log('[EditProduct] Processing file:', file.name, file.type);
    
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    console.log('[EditProduct] File processed, size:', dataUrl.length, 'bytes');
    
    return {
      url: dataUrl,
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      fundingThreshold: BigInt(100),
    };
  };

  const processAudio = async (file: File): Promise<FileVersion> => {
    console.log('[EditProduct] Processing audio file:', file.name, file.size, 'bytes');
    
    // Upload audio to blob storage - returns blob:// URL (not data URL)
    // This avoids embedding binary data in the updateWork request
    const audioUrl = await uploadFileToBlobStorage(file, (progress) => {
      setUploadProgress(progress);
    });
    
    console.log('[EditProduct] Audio uploaded, URL type:', audioUrl.startsWith('blob:') ? 'blob URL' : 'other');
    console.log('[EditProduct] URL length:', audioUrl.length, 'characters (no binary data embedded)');
    
    // Normalize mimeType to ensure it's recognized as audio
    let mimeType = file.type || 'audio/mpeg';
    if (!mimeType.startsWith('audio/')) {
      if (file.name.toLowerCase().endsWith('.mp3')) {
        mimeType = 'audio/mpeg';
      } else if (file.name.toLowerCase().endsWith('.wav')) {
        mimeType = 'audio/wav';
      }
    }
    
    return {
      url: audioUrl,
      originalFilename: file.name,
      mimeType: mimeType,
      fundingThreshold: BigInt(100),
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasReceivedPayments) {
      toast.error('当作品已有转入金额时，无法修改或删除');
      return;
    }

    if (!title.trim()) {
      toast.error('请输入作品名称');
      return;
    }

    if (workType === 'text') {
      if (!freeContent.trim() || freeContent === '<p><br></p>') {
        toast.error('请输入免费内容');
        return;
      }
      if (!paidContent.trim() || paidContent === '<p><br></p>') {
        toast.error('请输入付费内容');
        return;
      }
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      toast.error('请输入有效的目标金额');
      return;
    }
    if (!accountId.trim()) {
      toast.error('请输入接收账户ID');
      return;
    }

    try {
      setIsProcessing(true);
      
      if (workType === 'image') {
        if (imageFile) {
          console.log('[EditProduct] Processing new image');
          toast.info('正在处理图片，请稍候...');
          
          const imageVersions = await processAndConvertImage(imageFile);
          
          console.log('[EditProduct] All image versions processed:', imageVersions.length);
          
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '图片作品',
            paidContent: paidContent.trim() || '完整高清图片',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock,
            randomUnlock: false,
            workType: 'image' as WorkType,
            imageVersions,
          });
        } else {
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '图片作品',
            paidContent: paidContent.trim() || '完整高清图片',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock,
            randomUnlock: false,
            workType: 'image' as WorkType,
            imageVersions: product.imageVersions || [],
          });
        }
        
        toast.success('图片作品更新成功');
      } else if (workType === 'file') {
        if (uploadFile) {
          console.log('[EditProduct] Processing new file');
          toast.info('正在处理文件，请稍候...');
          
          const fileVersion = await processFile(uploadFile);
          
          console.log('[EditProduct] File processed successfully');
          
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '文件作品',
            paidContent: paidContent.trim() || '完整文件下载',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock: false,
            randomUnlock: false,
            workType: 'file' as WorkType,
            fileVersion,
          });
        } else {
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '文件作品',
            paidContent: paidContent.trim() || '完整文件下载',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock: false,
            randomUnlock: false,
            workType: 'file' as WorkType,
            fileVersion: product.fileVersion,
          });
        }
        
        toast.success('文件作品更新成功');
      } else if (workType === 'audio') {
        if (audioFile) {
          console.log('[EditProduct] Processing new audio');
          toast.info('正在处理音频，请稍候...');
          
          // Process audio - returns blob:// URL without binary data
          const audioVersion = await processAudio(audioFile);
          
          console.log('[EditProduct] Audio processed successfully');
          
          // updateWork mutation now receives only metadata and blob URL reference
          // No binary data is included in the request payload
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '音频作品',
            paidContent: paidContent.trim() || '完整音频播放',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock,
            randomUnlock: false,
            workType: 'audio' as WorkType,
            fileVersion: audioVersion,
          });
        } else {
          await updateProduct.mutateAsync({
            id: product.id,
            title: title.trim(),
            freeContent: freeContent.trim() || '音频作品',
            paidContent: paidContent.trim() || '完整音频播放',
            targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
            accountId: accountId.trim(),
            progressiveUnlock,
            randomUnlock: false,
            workType: 'audio' as WorkType,
            fileVersion: product.fileVersion,
          });
        }
        
        toast.success('音频作品更新成功');
      } else {
        await updateProduct.mutateAsync({
          id: product.id,
          title: title.trim(),
          freeContent: freeContent.trim(),
          paidContent: paidContent.trim(),
          targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
          accountId: accountId.trim(),
          progressiveUnlock,
          randomUnlock,
        });
        
        toast.success('作品更新成功');
      }
      
      onClose();
    } catch (error: any) {
      if (error?.message?.includes('已有转入金额')) {
        toast.error('当前作品已有转入金额，不可修改或删除');
      } else {
        toast.error('更新失败，请重试');
      }
      console.error('[EditProduct] Error:', error);
    } finally {
      setIsProcessing(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  const getWorkTypeBadge = () => {
    if (workType === 'image') {
      return <Badge variant="secondary" className="ml-2"><ImageIcon className="h-3 w-3 mr-1" />图片作品</Badge>;
    } else if (workType === 'file') {
      return <Badge variant="secondary" className="ml-2"><FileText className="h-3 w-3 mr-1" />文件作品</Badge>;
    } else if (workType === 'audio') {
      return <Badge variant="secondary" className="ml-2"><Music className="h-3 w-3 mr-1" />音频作品</Badge>;
    }
    return <Badge variant="secondary" className="ml-2">文本作品</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            编辑作品
            {getWorkTypeBadge()}
          </DialogTitle>
          <DialogDescription>
            修改作品的信息和内容。作品类型不可更改。
          </DialogDescription>
        </DialogHeader>

        {hasReceivedPayments && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              当作品已有转入金额时，无法修改或删除。
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">作品名称 *</Label>
            <Input
              id="title"
              placeholder="输入作品标题"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isProcessing || hasReceivedPayments}
            />
          </div>

          {workType === 'text' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="freeContent">免费内容 *</Label>
                <RichTextEditor
                  value={freeContent}
                  onChange={setFreeContent}
                  placeholder="输入公开可见的免费内容..."
                  disabled={isProcessing || hasReceivedPayments}
                />
                <p className="text-xs text-muted-foreground">
                  此内容将对所有人公开显示。支持富文本格式和图片插入。
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paidContent">付费内容 *</Label>
                <RichTextEditor
                  value={paidContent}
                  onChange={setPaidContent}
                  placeholder="输入需要付费解锁的内容..."
                  disabled={isProcessing || hasReceivedPayments}
                />
                <p className="text-xs text-muted-foreground">
                  此内容将根据收款进度逐步解锁。支持富文本格式和图片插入。
                </p>
              </div>
            </>
          )}

          {workType === 'image' && (
            <>
              <div className="space-y-2">
                <Label>当前图片</Label>
                {product.imageVersions && product.imageVersions.length > 0 && !imagePreview && (
                  <div className="space-y-2">
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={product.imageVersions[product.imageVersions.length - 1].url}
                        alt="当前图片"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {product.imageVersions.map((version, idx) => (
                        <Badge key={idx} variant="outline">
                          {getImageQualityLabel(Number(version.resolutionPercentage))}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageUpload">替换图片（可选）</Label>
                {!imagePreview ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      id="imageUpload"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                      disabled={isProcessing || hasReceivedPayments}
                    />
                    <label htmlFor="imageUpload" className={(isProcessing || hasReceivedPayments) ? 'cursor-not-allowed' : 'cursor-pointer'}>
                      <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        点击上传新图片
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 JPG、PNG、GIF 格式，最大 10MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg overflow-hidden border">
                    <img
                      src={imagePreview}
                      alt="新图片预览"
                      className="w-full h-auto max-h-96 object-contain"
                    />
                    {!isProcessing && !hasReceivedPayments && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={removeImage}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
                <Alert>
                  <ImageIcon className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    上传新图片将自动生成多个分辨率版本（10%、40%、70%、100%）
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label htmlFor="imageFreeContent">图片描述（可选）</Label>
                <RichTextEditor
                  value={freeContent}
                  onChange={setFreeContent}
                  placeholder="输入图片的描述信息..."
                  disabled={isProcessing || hasReceivedPayments}
                />
              </div>
            </>
          )}

          {workType === 'file' && (
            <>
              <div className="space-y-2">
                <Label>当前文件</Label>
                {product.fileVersion && !uploadFile && (
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.fileVersion.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">{product.fileVersion.mimeType}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileUpload">替换文件（可选）</Label>
                {!uploadFile ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      id="fileUpload"
                      type="file"
                      onChange={handleFileChange}
                      className="hidden"
                      disabled={isProcessing || hasReceivedPayments}
                    />
                    <label htmlFor="fileUpload" className={(isProcessing || hasReceivedPayments) ? 'cursor-not-allowed' : 'cursor-pointer'}>
                      <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        点击上传新文件
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 PDF、ZIP、DOCX、EXE 等格式，最大 50MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <FileText className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uploadFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(uploadFile.size)}</p>
                      </div>
                      {!isProcessing && !hasReceivedPayments && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={removeFile}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <Alert>
                  <FileText className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    文件将在收款达到100%时提供下载
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fileFreeContent">文件描述（可选）</Label>
                <RichTextEditor
                  value={freeContent}
                  onChange={setFreeContent}
                  placeholder="输入文件的描述信息..."
                  disabled={isProcessing || hasReceivedPayments}
                />
              </div>
            </>
          )}

          {workType === 'audio' && (
            <>
              <div className="space-y-2">
                <Label>当前音频</Label>
                {product.fileVersion && !audioFile && (
                  <div className="rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Music className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.fileVersion.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">{product.fileVersion.mimeType}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="audioUpload">替换音频（可选）</Label>
                {!audioFile ? (
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                    <input
                      id="audioUpload"
                      type="file"
                      accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
                      onChange={handleAudioChange}
                      className="hidden"
                      disabled={isProcessing || hasReceivedPayments}
                    />
                    <label htmlFor="audioUpload" className={(isProcessing || hasReceivedPayments) ? 'cursor-not-allowed' : 'cursor-pointer'}>
                      <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground mb-1">
                        点击上传新音频文件
                      </p>
                      <p className="text-xs text-muted-foreground">
                        支持 MP3、WAV 格式，最大 50MB
                      </p>
                    </label>
                  </div>
                ) : (
                  <div className="relative rounded-lg border p-4 bg-muted/30">
                    <div className="flex items-center gap-3">
                      <Music className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{audioFile.name}</p>
                        <p className="text-xs text-muted-foreground">{formatFileSize(audioFile.size)}</p>
                      </div>
                      {!isProcessing && !hasReceivedPayments && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="shrink-0"
                          onClick={removeAudio}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}
                <Alert>
                  <Music className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    音频将被处理为流媒体片段
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label htmlFor="audioFreeContent">音频描述（可选）</Label>
                <RichTextEditor
                  value={freeContent}
                  onChange={setFreeContent}
                  placeholder="输入音频的描述信息..."
                  disabled={isProcessing || hasReceivedPayments}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="targetAmount">目标金额 (ICP) *</Label>
            <Input
              id="targetAmount"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={targetAmount}
              onChange={(e) => setTargetAmount(e.target.value)}
              disabled={isProcessing || hasReceivedPayments}
            />
            <p className="text-xs text-muted-foreground">
              达到此金额后将完全解锁{workType === 'text' ? '付费内容' : workType === 'image' ? '高清图片' : workType === 'audio' ? '完整音频' : '文件下载'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="accountId">接收账户ID *</Label>
            <Input
              id="accountId"
              placeholder="输入您的账户ID"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              className="font-mono text-sm"
              disabled={isProcessing || hasReceivedPayments}
            />
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                建议为每个作品使用唯一的账户ID，以便准确追踪收款
              </AlertDescription>
            </Alert>
          </div>

          {workType !== 'file' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="progressiveUnlock" className="text-base">
                  渐进解锁模式
                </Label>
                <p className="text-sm text-muted-foreground">
                  根据收款百分比逐步{workType === 'text' ? '显示付费内容' : workType === 'audio' ? '解锁音频片段' : '提升图片清晰度'}
                </p>
              </div>
              <Switch
                id="progressiveUnlock"
                checked={progressiveUnlock}
                onCheckedChange={setProgressiveUnlock}
                disabled={isProcessing || hasReceivedPayments}
              />
            </div>
          )}

          {workType === 'text' && (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="randomUnlock" className="text-base">
                  随机解锁模式
                </Label>
                <p className="text-sm text-muted-foreground">
                  付费内容将以随机分布的方式解锁，而非顺序显示
                </p>
              </div>
              <Switch
                id="randomUnlock"
                checked={randomUnlock}
                onCheckedChange={setRandomUnlock}
                disabled={isProcessing || hasReceivedPayments}
              />
            </div>
          )}

          {isProcessing && uploadProgress > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>处理进度</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={updateProduct.isPending || isProcessing || hasReceivedPayments}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  处理中...
                </>
              ) : updateProduct.isPending ? (
                '更新中...'
              ) : (
                '更新作品'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
