import { useState, useEffect } from 'react';
import { useCreateProduct, useGetSettings, useGetAllPaidWorks } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useLanguage } from '../contexts/LanguageContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { AlertCircle, Upload, X, Image as ImageIcon, Loader2, FileText, Clock, Music } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { resizeImageToScale } from '../lib/imageUtils';
import { uploadFileToBlobStorage } from '../lib/blobStorage';
import RichTextEditor from './RichTextEditor';
import { TimeWindow } from '../backend';
import type { ImageVersion, FileVersion, WorkType } from '../backend';

interface CreateProductModalProps {
  onClose: () => void;
}

export default function CreateProductModal({ onClose }: CreateProductModalProps) {
  const { t } = useLanguage();
  const { identity } = useInternetIdentity();
  const { data: settings } = useGetSettings();
  const { refetch: refetchWorks } = useGetAllPaidWorks();
  const [workType, setWorkType] = useState<'text' | 'image' | 'file' | 'audio'>('text');
  const [title, setTitle] = useState('');
  const [freeContent, setFreeContent] = useState('');
  const [paidContent, setPaidContent] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [accountId, setAccountId] = useState('');
  const [timeWindow, setTimeWindow] = useState<TimeWindow>(TimeWindow.permanent);
  const [progressiveUnlock, setProgressiveUnlock] = useState(true);
  const [randomUnlock, setRandomUnlock] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const createProduct = useCreateProduct();

  // Check if anonymous publishing is allowed
  const isAuthenticated = !!identity;
  const allowAnonymousPublishing = settings?.allowAnonymousPublishing ?? true;

  // Show error if user is not authenticated and anonymous publishing is disabled
  useEffect(() => {
    if (!isAuthenticated && !allowAnonymousPublishing) {
      toast.error(t.createProduct.errorAnonymousDisabled);
      onClose();
    }
  }, [isAuthenticated, allowAnonymousPublishing, onClose, t]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        toast.error(t.createProduct.errorImageType);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(t.createProduct.errorImageSize);
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
        toast.error(t.createProduct.errorFileSize);
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
        toast.error(t.createProduct.errorAudioType);
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        toast.error(t.createProduct.errorAudioSize);
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
      
      const resizedBlob = await resizeImageToScale(file, scale);
      
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(resizedBlob);
      });
      
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
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    
    return {
      url: dataUrl,
      originalFilename: file.name,
      mimeType: file.type || 'application/octet-stream',
      fundingThreshold: BigInt(100),
    };
  };

  const processAudio = async (file: File): Promise<FileVersion> => {
    console.log('[CreateProductModal] Processing audio file:', file.name, file.size, 'bytes');
    
    // Upload audio to blob storage - returns blob:// URL (not data URL)
    // This avoids embedding binary data in the createWork request
    const audioUrl = await uploadFileToBlobStorage(file, (progress) => {
      setUploadProgress(progress);
    });
    
    console.log('[CreateProductModal] Audio uploaded, URL type:', audioUrl.startsWith('blob:') ? 'blob URL' : 'other');
    console.log('[CreateProductModal] URL length:', audioUrl.length, 'characters (no binary data embedded)');
    
    // Normalize mimeType to ensure it's recognized as audio
    let mimeType = file.type || 'audio/mpeg';
    if (!mimeType.startsWith('audio/')) {
      // If browser doesn't provide proper mime type, detect from extension
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

    if (!title.trim()) {
      toast.error(t.createProduct.errorTitle);
      return;
    }

    if (workType === 'text') {
      if (!freeContent.trim() || freeContent === '<p><br></p>') {
        toast.error(t.createProduct.errorFreeContent);
        return;
      }
      if (!paidContent.trim() || paidContent === '<p><br></p>') {
        toast.error(t.createProduct.errorPaidContent);
        return;
      }
    } else if (workType === 'image') {
      if (!imageFile) {
        toast.error(t.createProduct.errorImage);
        return;
      }
    } else if (workType === 'file') {
      if (!uploadFile) {
        toast.error(t.createProduct.errorFile);
        return;
      }
    } else if (workType === 'audio') {
      if (!audioFile) {
        toast.error(t.createProduct.errorAudio);
        return;
      }
    }

    if (!targetAmount || Number(targetAmount) <= 0) {
      toast.error(t.createProduct.errorTargetAmount);
      return;
    }
    if (!accountId.trim()) {
      toast.error(t.createProduct.errorAccountId);
      return;
    }

    try {
      setIsProcessing(true);
      const id = `work_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      console.log('[CreateProductModal] Starting work creation:', { id, workType, title });
      
      if (workType === 'image' && imageFile) {
        toast.info(t.createProduct.processingImage);
        
        const imageVersions = await processAndConvertImage(imageFile);
        
        await createProduct.mutateAsync({
          id,
          title: title.trim(),
          freeContent: freeContent.trim() || '图片作品',
          paidContent: paidContent.trim() || '完整高清图片',
          targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
          accountId: accountId.trim(),
          timeWindow,
          progressiveUnlock,
          randomUnlock: false,
          workType: 'image' as WorkType,
          imageVersions,
        });
        
        toast.success(t.createProduct.successImage);
      } else if (workType === 'file' && uploadFile) {
        toast.info(t.createProduct.processingFile);
        
        const fileVersion = await processFile(uploadFile);
        
        await createProduct.mutateAsync({
          id,
          title: title.trim(),
          freeContent: freeContent.trim() || '文件作品',
          paidContent: paidContent.trim() || '完整文件下载',
          targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
          accountId: accountId.trim(),
          timeWindow,
          progressiveUnlock: false,
          randomUnlock: false,
          workType: 'file' as WorkType,
          fileVersion,
        });
        
        toast.success(t.createProduct.successFile);
      } else if (workType === 'audio' && audioFile) {
        toast.info(t.createProduct.processingAudio);
        
        // Process audio - returns blob:// URL without binary data
        const audioVersion = await processAudio(audioFile);
        
        console.log('[CreateProductModal] Audio work prepared:', {
          id,
          mimeType: audioVersion.mimeType,
          filename: audioVersion.originalFilename,
          urlType: audioVersion.url.startsWith('blob:') ? 'blob URL (no binary)' : 'other',
          urlLength: audioVersion.url.length,
        });
        
        // createWork mutation now receives only metadata and blob URL reference
        // No binary data is included in the request payload
        await createProduct.mutateAsync({
          id,
          title: title.trim(),
          freeContent: freeContent.trim() || '音频作品',
          paidContent: paidContent.trim() || '完整音频播放',
          targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
          accountId: accountId.trim(),
          timeWindow,
          progressiveUnlock,
          randomUnlock: false,
          workType: 'audio' as WorkType,
          fileVersion: audioVersion,
        });
        
        console.log('[CreateProductModal] Audio work created successfully (payload contained only URL reference)');
        toast.success(t.createProduct.successAudio);
      } else {
        await createProduct.mutateAsync({
          id,
          title: title.trim(),
          freeContent: freeContent.trim(),
          paidContent: paidContent.trim(),
          targetAmount: BigInt(Math.floor(Number(targetAmount) * 100000000)),
          accountId: accountId.trim(),
          timeWindow,
          progressiveUnlock,
          randomUnlock,
        });
        
        toast.success(t.createProduct.successText);
      }
      
      // Force refetch to verify persistence
      console.log('[CreateProductModal] Forcing works refetch to verify persistence');
      await refetchWorks();
      
      onClose();
    } catch (error: any) {
      console.error('[CreateProductModal] Error creating work:', error);
      
      // Check if error is related to anonymous publishing
      if (error?.message?.includes('匿名发布已禁用') || error?.message?.includes('anonymous')) {
        toast.error(t.createProduct.errorAnonymousDisabled);
      } else if (error?.message?.includes('not found after creation')) {
        toast.error('创建失败：作品未能保存到后端。请联系管理员检查后端状态。/ Creation failed: Work was not persisted. Please contact admin to check backend state.');
      } else {
        toast.error(t.createProduct.errorCreate + (error?.message ? `: ${error.message}` : ''));
      }
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

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.createProduct.title}</DialogTitle>
          <DialogDescription>
            {t.createProduct.description}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={workType} onValueChange={(v) => setWorkType(v as 'text' | 'image' | 'file' | 'audio')}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="text">{t.createProduct.textWork}</TabsTrigger>
              <TabsTrigger value="image">{t.createProduct.imageWork}</TabsTrigger>
              <TabsTrigger value="file">{t.createProduct.fileWork}</TabsTrigger>
              <TabsTrigger value="audio">{t.createProduct.audioWork}</TabsTrigger>
            </TabsList>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">{t.createProduct.workName} *</Label>
                <Input
                  id="title"
                  placeholder={t.createProduct.workNamePlaceholder}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isProcessing}
                />
              </div>

              <TabsContent value="text" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="freeContent">{t.createProduct.freeContent} *</Label>
                  <RichTextEditor
                    value={freeContent}
                    onChange={setFreeContent}
                    placeholder={t.createProduct.freeContentPlaceholder}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.createProduct.freeContentDesc}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paidContent">{t.createProduct.paidContent} *</Label>
                  <RichTextEditor
                    value={paidContent}
                    onChange={setPaidContent}
                    placeholder={t.createProduct.paidContentPlaceholder}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.createProduct.paidContentDesc}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="image" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="imageUpload">{t.createProduct.uploadImage} *</Label>
                  {!imagePreview ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        id="imageUpload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={isProcessing}
                      />
                      <label htmlFor="imageUpload" className={isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}>
                        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.createProduct.uploadImageDesc}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.createProduct.uploadImageFormat}
                        </p>
                      </label>
                    </div>
                  ) : (
                    <div className="relative rounded-lg overflow-hidden border">
                      <img
                        src={imagePreview}
                        alt="预览"
                        className="w-full h-auto max-h-96 object-contain"
                      />
                      {!isProcessing && (
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
                      {t.createProduct.imageProcessingAlert}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="imageFreeContent">{t.createProduct.imageDescription}</Label>
                  <RichTextEditor
                    value={freeContent}
                    onChange={setFreeContent}
                    placeholder={t.createProduct.imageDescriptionPlaceholder}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.createProduct.imageDescriptionDesc}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="file" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="fileUpload">{t.createProduct.uploadFile} *</Label>
                  {!uploadFile ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        id="fileUpload"
                        type="file"
                        onChange={handleFileChange}
                        className="hidden"
                        disabled={isProcessing}
                      />
                      <label htmlFor="fileUpload" className={isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}>
                        <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.createProduct.uploadFileDesc}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.createProduct.uploadFileFormat}
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
                        {!isProcessing && (
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
                      {t.createProduct.fileProcessingAlert}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fileFreeContent">{t.createProduct.fileDescription}</Label>
                  <RichTextEditor
                    value={freeContent}
                    onChange={setFreeContent}
                    placeholder={t.createProduct.fileDescriptionPlaceholder}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.createProduct.fileDescriptionDesc}
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="audio" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="audioUpload">{t.createProduct.uploadAudio} *</Label>
                  {!audioFile ? (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors">
                      <input
                        id="audioUpload"
                        type="file"
                        accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
                        onChange={handleAudioChange}
                        className="hidden"
                        disabled={isProcessing}
                      />
                      <label htmlFor="audioUpload" className={isProcessing ? 'cursor-not-allowed' : 'cursor-pointer'}>
                        <Music className="mx-auto h-12 w-12 text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground mb-1">
                          {t.createProduct.uploadAudioDesc}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {t.createProduct.uploadAudioFormat}
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
                        {!isProcessing && (
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
                      {t.createProduct.audioProcessingAlert}
                    </AlertDescription>
                  </Alert>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="audioFreeContent">{t.createProduct.audioDescription}</Label>
                  <RichTextEditor
                    value={freeContent}
                    onChange={setFreeContent}
                    placeholder={t.createProduct.audioDescriptionPlaceholder}
                    disabled={isProcessing}
                  />
                  <p className="text-xs text-muted-foreground">
                    {t.createProduct.audioDescriptionDesc}
                  </p>
                </div>
              </TabsContent>

              <div className="space-y-2">
                <Label htmlFor="targetAmount">{t.createProduct.targetAmount} *</Label>
                <Input
                  id="targetAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t.createProduct.targetAmountPlaceholder}
                  value={targetAmount}
                  onChange={(e) => setTargetAmount(e.target.value)}
                  disabled={isProcessing}
                />
                <p className="text-xs text-muted-foreground">
                  {workType === 'text' ? t.createProduct.targetAmountDesc : workType === 'image' ? t.createProduct.targetAmountDescImage : workType === 'audio' ? t.createProduct.targetAmountDescAudio : t.createProduct.targetAmountDescFile}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountId">{t.createProduct.accountId} *</Label>
                <Input
                  id="accountId"
                  placeholder={t.createProduct.accountIdPlaceholder}
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="font-mono text-sm"
                  disabled={isProcessing}
                />
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t.createProduct.accountIdAlert}
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label htmlFor="timeWindow">{t.createProduct.timeWindow} *</Label>
                <Select value={timeWindow} onValueChange={(value) => setTimeWindow(value as TimeWindow)} disabled={isProcessing}>
                  <SelectTrigger id="timeWindow">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={TimeWindow.last1Hour}>{t.createProduct.timeWindowLast1Hour}</SelectItem>
                    <SelectItem value={TimeWindow.last24Hours}>{t.createProduct.timeWindowLast24Hours}</SelectItem>
                    <SelectItem value={TimeWindow.last7Days}>{t.createProduct.timeWindowLast7Days}</SelectItem>
                    <SelectItem value={TimeWindow.last30Days}>{t.createProduct.timeWindowLast30Days}</SelectItem>
                    <SelectItem value={TimeWindow.permanent}>{t.createProduct.timeWindowPermanent}</SelectItem>
                  </SelectContent>
                </Select>
                <Alert>
                  <Clock className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {t.createProduct.timeWindowDesc}
                  </AlertDescription>
                </Alert>
              </div>

              {workType !== 'file' && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="progressiveUnlock" className="text-base">
                      {t.createProduct.progressiveUnlockTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {workType === 'text' ? t.createProduct.progressiveUnlockDesc : workType === 'audio' ? t.createProduct.progressiveUnlockDescAudio : t.createProduct.progressiveUnlockDescImage}
                    </p>
                  </div>
                  <Switch
                    id="progressiveUnlock"
                    checked={progressiveUnlock}
                    onCheckedChange={setProgressiveUnlock}
                    disabled={isProcessing}
                  />
                </div>
              )}

              {workType === 'text' && (
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label htmlFor="randomUnlock" className="text-base">
                      {t.createProduct.randomUnlockTitle}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {t.createProduct.randomUnlockDesc}
                    </p>
                  </div>
                  <Switch
                    id="randomUnlock"
                    checked={randomUnlock}
                    onCheckedChange={setRandomUnlock}
                    disabled={isProcessing}
                  />
                </div>
              )}

              {isProcessing && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>{t.createProduct.processingProgress}</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="h-2" />
                </div>
              )}
            </div>
          </Tabs>

          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isProcessing}
            >
              {t.createProduct.cancel}
            </Button>
            <Button
              type="submit"
              disabled={createProduct.isPending || isProcessing}
              className="flex-1"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.createProduct.processing}
                </>
              ) : createProduct.isPending ? (
                t.createProduct.creating
              ) : (
                t.createProduct.create
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
