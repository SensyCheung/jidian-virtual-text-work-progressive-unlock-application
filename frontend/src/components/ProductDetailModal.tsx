import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Lock, Unlock, Copy, RefreshCw, Trash2, Edit, ArrowDownLeft, Download, Image as ImageIcon, FileText, Shuffle, Music, Play, Pause } from 'lucide-react';
import { useAccountReceivedAmount, useTransactions, useDeleteProduct, useGetRandomUnlockState, useSaveRandomUnlockState, useUpdateRandomUnlockState } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useLanguage } from '../contexts/LanguageContext';
import { toast } from 'sonner';
import { useState, useMemo, useEffect, useRef } from 'react';
import EditProductModal from './EditProductModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { getImageResolutionLevel, getImageQualityLabel } from '../lib/imageUtils';
import { extractTextFromHtml, calculateTargetCharacterCount, generateRandomCharacters, renderMaskedContent } from '../lib/randomUnlockUtils';
import type { Work } from '../backend';

interface ProductDetailModalProps {
  product: Work;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  const { t } = useLanguage();
  const { data: receivedAmount, refetch: refetchAmount, isFetching: isFetchingAmount } = useAccountReceivedAmount(product.accountId, product.timeWindow);
  const { data: transfers, refetch: refetchTransfers, isFetching: isFetchingTransfers } = useTransactions(product.accountId, product.timeWindow);
  const { data: randomUnlockState, refetch: refetchUnlockState } = useGetRandomUnlockState(product.id);
  const { identity } = useInternetIdentity();
  const deleteProduct = useDeleteProduct();
  const saveRandomUnlockState = useSaveRandomUnlockState();
  const updateRandomUnlockState = useUpdateRandomUnlockState();
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioCurrentTime, setAudioCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const currentAmountE8s = receivedAmount || BigInt(0);
  const targetAmountE8s = product.targetAmount;
  
  const percentage = targetAmountE8s > BigInt(0) 
    ? Math.min(Number((currentAmountE8s * BigInt(10000)) / targetAmountE8s) / 100, 100) 
    : 0;
  const isFullyUnlocked = percentage >= 100;

  const isOwner = identity?.getPrincipal().toString() === product.creator.toString();
  const isImageWork = product.workType === 'image';
  const isTextWork = product.workType === 'text';
  const fileVersion = product.fileVersion;
  
  // Check if it's an audio work by workType or mimeType
  const isAudioWork = product.workType === 'audio' || 
    (fileVersion && (fileVersion.mimeType.includes('audio/mpeg') || fileVersion.mimeType.includes('audio/wav')));
  
  // File work is anything with fileVersion that's not audio
  const isFileWork = product.workType === 'file' && !isAudioWork;
  
  const imageVersions = product.imageVersions || [];

  // Parse content for text works
  const [freeContent, paidContent] = product.content.includes('\n') 
    ? [product.content.split('\n')[0], product.content.split('\n').slice(1).join('\n')]
    : [product.content, ''];

  // Handle random unlock state initialization and updates
  useEffect(() => {
    if (!product.randomUnlock || product.workType !== 'text' || isFullyUnlocked) {
      return;
    }

    const textContent = extractTextFromHtml(paidContent);
    const totalCharacters = textContent.length;
    
    if (totalCharacters === 0) return;

    const currentPercentage = Math.floor(percentage);
    const targetCharacterCount = calculateTargetCharacterCount(totalCharacters, currentPercentage);

    // If no state exists, generate initial random characters
    if (!randomUnlockState) {
      const initialUnlockedText = generateRandomCharacters(textContent, targetCharacterCount, '');
      
      saveRandomUnlockState.mutate({
        workId: product.id,
        unlockedText: initialUnlockedText,
        fundingPercentage: BigInt(currentPercentage),
      });
      return;
    }

    // Check if funding has increased and we need to unlock more characters
    const storedPercentage = Number(randomUnlockState.fundingPercentageWhenGenerated);
    const currentUnlockedCount = randomUnlockState.unlockedString.length;

    if (currentPercentage > storedPercentage && targetCharacterCount > currentUnlockedCount) {
      const newCharacters = generateRandomCharacters(
        textContent,
        targetCharacterCount,
        randomUnlockState.unlockedString
      );
      
      if (newCharacters.length > 0) {
        updateRandomUnlockState.mutate({
          workId: product.id,
          newUnlockedText: newCharacters,
          currentFundingPercentage: BigInt(currentPercentage),
        });
      }
    }
  }, [product, paidContent, percentage, isFullyUnlocked, randomUnlockState, saveRandomUnlockState, updateRandomUnlockState]);

  // Calculate visible paid content with persistent random unlock
  const visiblePaidContent = useMemo(() => {
    if (!product.progressiveUnlock || isFullyUnlocked) {
      return paidContent;
    }
    
    const textContent = extractTextFromHtml(paidContent);
    const visibleLength = Math.floor((textContent.length * percentage) / 100);
    
    if (visibleLength >= textContent.length) {
      return paidContent;
    }
    
    // If random unlock is enabled and we have state, use persisted characters
    if (product.randomUnlock && randomUnlockState) {
      return renderMaskedContent(paidContent, randomUnlockState.unlockedString);
    }
    
    // Sequential unlock (default behavior)
    const visibleText = textContent.substring(0, visibleLength);
    return `<div>${visibleText}...</div>`;
  }, [product.progressiveUnlock, product.randomUnlock, isFullyUnlocked, percentage, paidContent, currentAmountE8s, randomUnlockState]);

  // Calculate unlock progress for random mode
  const randomUnlockProgress = useMemo(() => {
    if (!product.randomUnlock || !randomUnlockState || isFullyUnlocked) {
      return null;
    }

    const textContent = extractTextFromHtml(paidContent);
    const totalCharacters = textContent.length;
    const unlockedCharacters = randomUnlockState.unlockedString.length;
    const characterPercentage = totalCharacters > 0 ? (unlockedCharacters / totalCharacters) * 100 : 0;

    return {
      unlockedCharacters,
      totalCharacters,
      characterPercentage: Math.round(characterPercentage),
    };
  }, [product.randomUnlock, randomUnlockState, isFullyUnlocked, paidContent]);

  // Refetch unlock state when received amount changes
  useEffect(() => {
    if (receivedAmount !== undefined && product.randomUnlock) {
      refetchUnlockState();
    }
  }, [receivedAmount, product.randomUnlock, refetchUnlockState]);

  // Audio progressive unlock: calculate playable duration
  const audioPlayableDuration = useMemo(() => {
    if (!isAudioWork || !audioDuration) return 0;
    if (isFullyUnlocked) return audioDuration;
    return (audioDuration * percentage) / 100;
  }, [isAudioWork, audioDuration, percentage, isFullyUnlocked]);

  // Handle audio time update to enforce progressive unlock
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !isAudioWork || isFullyUnlocked) return;

    const handleTimeUpdate = () => {
      setAudioCurrentTime(audio.currentTime);
      
      // Enforce progressive unlock: pause if user tries to seek beyond unlocked portion
      if (audio.currentTime > audioPlayableDuration) {
        audio.currentTime = audioPlayableDuration;
        audio.pause();
        setIsPlaying(false);
        toast.info(t.productDetail.audioLockedDesc);
      }
    };

    const handleLoadedMetadata = () => {
      setAudioDuration(audio.duration);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [isAudioWork, audioPlayableDuration, isFullyUnlocked, t]);

  // Get appropriate image URL based on funding progress
  const getImageUrl = (): string | null => {
    if (!isImageWork || imageVersions.length === 0) return null;
    
    const targetLevel = getImageResolutionLevel(percentage);
    
    const matchingVersion = imageVersions.find(
      v => Number(v.resolutionPercentage) === targetLevel
    );
    
    if (matchingVersion) {
      return matchingVersion.url;
    }
    
    return imageVersions[0]?.url || null;
  };

  const imageUrl = getImageUrl();
  const currentImageLevel = getImageResolutionLevel(percentage);

  const copyAccountId = () => {
    navigator.clipboard.writeText(product.accountId);
    toast.success(t.productDetail.accountIdCopied);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchAmount(), refetchTransfers(), refetchUnlockState()]);
    toast.success(t.productDetail.dataRefreshed);
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(product.id);
      toast.success(t.productDetail.workDeleted);
      onClose();
    } catch (error: any) {
      if (error?.message?.includes('已有转入金额')) {
        toast.error(t.productDetail.deleteErrorHasPayments);
      } else {
        toast.error(t.productDetail.deleteError);
      }
    }
  };

  const handleDownload = () => {
    if (!fileVersion || !isFullyUnlocked) {
      toast.error(t.productDetail.fileNotUnlocked);
      return;
    }

    try {
      const link = document.createElement('a');
      link.href = fileVersion.url;
      link.download = fileVersion.originalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success(t.productDetail.downloadStarted);
    } catch (error) {
      toast.error(t.productDetail.downloadError);
    }
  };

  const toggleAudioPlayback = () => {
    if (!audioRef.current) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleAudioSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const seekTime = parseFloat(e.target.value);
    const maxSeekTime = isFullyUnlocked ? audioDuration : audioPlayableDuration;
    audioRef.current.currentTime = Math.min(seekTime, maxSeekTime);
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatICP = (e8s: bigint): string => {
    return (Number(e8s) / 1e8).toFixed(4);
  };

  const formatDate = (timestamp: bigint) => {
    // Convert from nanoseconds to milliseconds
    const date = new Date(Number(timestamp / BigInt(1_000_000)));
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const shortenAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  // Get time window label
  const getTimeWindowLabel = () => {
    switch (product.timeWindow) {
      case 'last1Hour':
        return t.productDetail.timeWindowLast1Hour;
      case 'last24Hours':
        return t.productDetail.timeWindowLast24Hours;
      case 'last7Days':
        return t.productDetail.timeWindowLast7Days;
      case 'last30Days':
        return t.productDetail.timeWindowLast30Days;
      case 'permanent':
        return t.productDetail.timeWindowPermanent;
      default:
        return t.productDetail.timeWindowPermanent;
    }
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <DialogTitle className="text-2xl mb-2">{product.title}</DialogTitle>
                <DialogDescription className="flex items-center gap-2">
                  <span>{product.author}</span>
                  <span>•</span>
                  <span>{formatDate(product.publishedAt)}</span>
                </DialogDescription>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {isImageWork && (
                <Badge variant="outline">
                  <ImageIcon className="h-3 w-3 mr-1" />
                  {t.productDetail.image}
                </Badge>
              )}
              {isAudioWork && (
                <Badge variant="outline">
                  <Music className="h-3 w-3 mr-1" />
                  {t.productDetail.audio}
                </Badge>
              )}
              {isFileWork && (
                <Badge variant="outline">
                  <FileText className="h-3 w-3 mr-1" />
                  {t.productDetail.file}
                </Badge>
              )}
              {product.progressiveUnlock && (
                <Badge variant="secondary">{t.productDetail.progressiveUnlock}</Badge>
              )}
              {isTextWork && product.randomUnlock && (
                <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                  <Shuffle className="h-3 w-3 mr-1" />
                  {t.productCard.randomUnlock}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {t.productDetail.timeWindow}: {getTimeWindowLabel()}
              </Badge>
              {isFullyUnlocked && (
                <Badge className="bg-green-500">{t.productDetail.completed}</Badge>
              )}
            </div>
          </DialogHeader>

          <div className="space-y-6">
            {/* Progress Section */}
            <div className="rounded-lg border bg-muted/30 p-4">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium">{t.productDetail.unlockProgress}</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold">{percentage.toFixed(1)}%</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleRefreshAll}
                    disabled={isFetchingAmount || isFetchingTransfers}
                  >
                    <RefreshCw className={`h-4 w-4 ${(isFetchingAmount || isFetchingTransfers) ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>
              <Progress value={percentage} className="h-3 mb-2" />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{t.productDetail.received}: {formatICP(currentAmountE8s)} ICP</span>
                <span>{t.productDetail.target}: {formatICP(targetAmountE8s)} ICP</span>
              </div>
              {randomUnlockProgress && (
                <div className="mt-3 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span className="flex items-center gap-1">
                      <Shuffle className="h-3 w-3" />
                      {t.productDetail.randomUnlockProgress}
                    </span>
                    <span>{randomUnlockProgress.characterPercentage}%</span>
                  </div>
                  <Progress value={randomUnlockProgress.characterPercentage} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {randomUnlockProgress.unlockedCharacters} / {randomUnlockProgress.totalCharacters} {t.productDetail.charactersUnlocked}
                  </p>
                </div>
              )}
            </div>

            {/* Account ID Section */}
            <div className="space-y-2">
              <label className="text-sm font-medium">{t.productDetail.accountId}</label>
              <div className="flex gap-2">
                <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-sm font-mono break-all">
                  {product.accountId}
                </div>
                <Button variant="outline" size="icon" onClick={copyAccountId}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Audio Work Content */}
            {isAudioWork && fileVersion ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isFullyUnlocked ? (
                    <Unlock className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">{t.productDetail.audioContent}</h3>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Music className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileVersion.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">{fileVersion.mimeType}</p>
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={toggleAudioPlayback}
                      >
                        {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Custom Audio Player with Progressive Unlock */}
                    <div className="space-y-3">
                      <audio
                        ref={audioRef}
                        src={fileVersion.url}
                        onPlay={() => setIsPlaying(true)}
                        onPause={() => setIsPlaying(false)}
                        onEnded={() => setIsPlaying(false)}
                        className="hidden"
                      />
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <input
                          type="range"
                          min="0"
                          max={audioDuration || 0}
                          value={audioCurrentTime}
                          onChange={handleAudioSeek}
                          className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, 
                              hsl(var(--primary)) 0%, 
                              hsl(var(--primary)) ${(audioCurrentTime / (audioDuration || 1)) * 100}%, 
                              ${!isFullyUnlocked ? `hsl(var(--muted)) ${(audioPlayableDuration / (audioDuration || 1)) * 100}%, hsl(var(--muted)) 100%` : `hsl(var(--muted)) ${(audioCurrentTime / (audioDuration || 1)) * 100}%, hsl(var(--muted)) 100%`}
                            )`
                          }}
                        />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTime(audioCurrentTime)}</span>
                          <span>
                            {!isFullyUnlocked && (
                              <>
                                <Lock className="inline h-3 w-3 mr-1" />
                                {formatTime(audioPlayableDuration)} / 
                              </>
                            )}
                            {formatTime(audioDuration)}
                          </span>
                        </div>
                      </div>

                      {/* Unlock Status */}
                      {!isFullyUnlocked && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-sm text-amber-700 dark:text-amber-300">
                          <Lock className="inline h-4 w-4 mr-2" />
                          {Math.round(percentage)}% {t.productDetail.audioSegmentsUnlocked} - {formatTime(audioPlayableDuration)} {t.productDetail.audioLockedDesc}
                        </div>
                      )}
                    </div>

                    {freeContent && (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert mt-4"
                        dangerouslySetInnerHTML={{ __html: freeContent }}
                      />
                    )}
                  </div>
                </div>
              </div>
            ) : isFileWork && fileVersion ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  {isFullyUnlocked ? (
                    <Unlock className="h-4 w-4 text-green-500" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                  <h3 className="font-semibold">{t.productDetail.fileContent}</h3>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  {isFullyUnlocked ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                        <Download className="h-10 w-10 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{fileVersion.originalFilename}</p>
                          <p className="text-xs text-muted-foreground">{fileVersion.mimeType}</p>
                        </div>
                      </div>
                      <Button onClick={handleDownload} className="w-full">
                        <Download className="mr-2 h-4 w-4" />
                        {t.productDetail.downloadFile}
                      </Button>
                      {freeContent && (
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert mt-4"
                          dangerouslySetInnerHTML={{ __html: freeContent }}
                        />
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <div className="text-center">
                        <Lock className="mx-auto mb-2 h-12 w-12" />
                        <p className="text-base mb-1">{t.productDetail.fileLocked}</p>
                        <p className="text-sm mb-4">{t.productDetail.fileLockedDesc}</p>
                        {freeContent && (
                          <div className="mt-6 text-left max-w-md mx-auto">
                            <div 
                              className="prose prose-sm max-w-none dark:prose-invert"
                              dangerouslySetInnerHTML={{ __html: freeContent }}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : isImageWork && imageUrl ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isFullyUnlocked ? (
                      <Unlock className="h-4 w-4 text-green-500" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    )}
                    <h3 className="font-semibold">{t.productDetail.imageContent}</h3>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {getImageQualityLabel(currentImageLevel)}
                  </Badge>
                </div>
                <div className="rounded-lg border bg-card p-4">
                  <div className="relative w-full">
                    <img
                      src={imageUrl}
                      alt={product.title}
                      className="w-full h-auto rounded-lg"
                    />
                    {!isFullyUnlocked && (
                      <div className="absolute bottom-4 right-4 bg-black/80 text-white px-3 py-2 rounded-lg text-sm">
                        {t.productDetail.currentClarity}: {currentImageLevel}%
                      </div>
                    )}
                  </div>
                  {freeContent && (
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert mt-4"
                      dangerouslySetInnerHTML={{ __html: freeContent }}
                    />
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Free Content Section */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Unlock className="h-4 w-4 text-green-500" />
                    <h3 className="font-semibold">{t.productDetail.freeContent}</h3>
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    <div 
                      className="prose prose-sm max-w-none dark:prose-invert break-words"
                      dangerouslySetInnerHTML={{ __html: freeContent }}
                    />
                  </div>
                </div>

                {/* Paid Content Section */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {isFullyUnlocked ? (
                        <Unlock className="h-4 w-4 text-green-500" />
                      ) : (
                        <Lock className="h-4 w-4 text-muted-foreground" />
                      )}
                      <h3 className="font-semibold">{t.productDetail.paidContent}</h3>
                      {product.randomUnlock && !isFullyUnlocked && (
                        <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                          <Shuffle className="h-3 w-3 mr-1" />
                          {t.productDetail.randomUnlock}
                        </Badge>
                      )}
                    </div>
                    {!isFullyUnlocked && product.progressiveUnlock && (
                      <span className="text-xs text-muted-foreground">
                        {percentage.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg border bg-card p-4">
                    {product.progressiveUnlock && !isFullyUnlocked ? (
                      <div className="relative">
                        {product.randomUnlock && (
                          <div className="mb-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                            <Shuffle className="inline h-4 w-4 mr-2" />
                            {t.productDetail.randomUnlockMode}
                          </div>
                        )}
                        <div 
                          className="prose prose-sm max-w-none dark:prose-invert break-words"
                          dangerouslySetInnerHTML={{ __html: visiblePaidContent }}
                        />
                        {percentage < 100 && (
                          <div className="mt-4 text-muted-foreground text-sm">
                            <Lock className="inline h-4 w-4 mr-1" />
                            {t.productDetail.partiallyLocked}
                            {product.randomUnlock && randomUnlockProgress && (
                              <span className="ml-2">
                                ({randomUnlockProgress.unlockedCharacters}/{randomUnlockProgress.totalCharacters} {t.productDetail.charactersUnlocked})
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : isFullyUnlocked ? (
                      <div 
                        className="prose prose-sm max-w-none dark:prose-invert break-words"
                        dangerouslySetInnerHTML={{ __html: paidContent }}
                      />
                    ) : (
                      <div className="flex items-center justify-center py-12 text-muted-foreground">
                        <div className="text-center">
                          <Lock className="mx-auto mb-2 h-10 w-10" />
                          <p className="text-base">{t.productDetail.fullyLocked}</p>
                          <p className="text-sm">{t.productDetail.fullyLockedDesc}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Transfer Records Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ArrowDownLeft className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{t.productDetail.transferRecords}</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => refetchTransfers()}
                  disabled={isFetchingTransfers}
                >
                  <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${isFetchingTransfers ? 'animate-spin' : ''}`} />
                  {t.common.refresh}
                </Button>
              </div>
              <div className="rounded-lg border bg-card">
                {transfers && transfers.length > 0 ? (
                  <div className="divide-y">
                    {transfers.map((transfer) => (
                      <div key={transfer.txId} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium break-all">
                                {shortenAddress(transfer.from)}
                              </span>
                              <Badge variant="outline" className="text-xs shrink-0">
                                {formatICP(transfer.amount)} ICP
                              </Badge>
                            </div>
                            <div className="text-xs text-muted-foreground break-all">
                              {t.productDetail.transactionId}: {shortenAddress(transfer.txId)}
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0">
                            {formatDate(transfer.timestamp)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <div className="text-center">
                      <ArrowDownLeft className="mx-auto mb-2 h-10 w-10 opacity-50" />
                      <p className="text-sm">{t.productDetail.noRecords}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {showEditModal && (
        <EditProductModal
          product={product}
          receivedAmount={currentAmountE8s}
          onClose={() => {
            setShowEditModal(false);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t.productDetail.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.productDetail.confirmDeleteDesc}"{product.title}"? {t.productDetail.confirmDeleteNote}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? t.productDetail.deleting : t.productDetail.deleteButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
