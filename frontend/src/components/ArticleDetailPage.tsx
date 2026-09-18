import { useParams, useNavigate } from '@tanstack/react-router';
import { useGetWork, useAccountReceivedAmount, useTransactions, useDeleteProduct, useGetRandomUnlockState, useSaveRandomUnlockState, useUpdateRandomUnlockState } from '../hooks/useQueries';
import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { useLanguage } from '../contexts/LanguageContext';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Lock, Unlock, Copy, RefreshCw, Trash2, Edit, ArrowDownLeft, Calendar, User, Image as ImageIcon, Download, FileText, Shuffle, Music, Play, Pause } from 'lucide-react';
import { toast } from 'sonner';
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

export default function ArticleDetailPage() {
  const { id } = useParams({ from: '/article/$id' });
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { data: work, isLoading, error, refetch: refetchWork } = useGetWork(id);
  const { data: receivedAmount, refetch: refetchAmount, isFetching: isFetchingAmount } = useAccountReceivedAmount(work?.accountId || '', work?.timeWindow);
  const { data: transfers, refetch: refetchTransfers, isFetching: isFetchingTransfers } = useTransactions(work?.accountId || '', work?.timeWindow);
  const { data: randomUnlockState, refetch: refetchUnlockState } = useGetRandomUnlockState(id);
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

  // Calculate percentage and parse content at the top level (before any returns)
  const currentAmountE8s = receivedAmount || BigInt(0);
  const targetAmountE8s = work?.targetAmount || BigInt(0);
  
  const percentage = targetAmountE8s > BigInt(0) 
    ? Math.min(Number((currentAmountE8s * BigInt(10000)) / targetAmountE8s) / 100, 100) 
    : 0;
  const isFullyUnlocked = percentage >= 100;

  // Parse content for text works
  const [freeContent, paidContent] = work?.content.includes('\n') 
    ? [work.content.split('\n')[0], work.content.split('\n').slice(1).join('\n')]
    : [work?.content || '', ''];

  // Handle random unlock state initialization and updates
  useEffect(() => {
    if (!work || !work.randomUnlock || work.workType !== 'text' || isFullyUnlocked) {
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
        workId: work.id,
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
          workId: work.id,
          newUnlockedText: newCharacters,
          currentFundingPercentage: BigInt(currentPercentage),
        });
      }
    }
  }, [work, paidContent, percentage, isFullyUnlocked, randomUnlockState, saveRandomUnlockState, updateRandomUnlockState]);

  // Calculate visible paid content with persistent random unlock
  const visiblePaidContent = useMemo(() => {
    if (!work) return '';
    
    if (!work.progressiveUnlock || isFullyUnlocked) {
      return paidContent;
    }
    
    const textContent = extractTextFromHtml(paidContent);
    const visibleLength = Math.floor((textContent.length * percentage) / 100);
    
    if (visibleLength >= textContent.length) {
      return paidContent;
    }
    
    // If random unlock is enabled and we have state, use persisted characters
    if (work.randomUnlock && randomUnlockState) {
      return renderMaskedContent(paidContent, randomUnlockState.unlockedString);
    }
    
    // Sequential unlock (default behavior)
    const visibleText = textContent.substring(0, visibleLength);
    return `<div>${visibleText}...</div>`;
  }, [work, work?.progressiveUnlock, work?.randomUnlock, isFullyUnlocked, percentage, paidContent, currentAmountE8s, randomUnlockState]);

  // Calculate unlock progress for random mode
  const randomUnlockProgress = useMemo(() => {
    if (!work?.randomUnlock || !randomUnlockState || isFullyUnlocked) {
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
  }, [work?.randomUnlock, randomUnlockState, isFullyUnlocked, paidContent]);

  // Refetch unlock state when received amount changes
  useEffect(() => {
    if (receivedAmount !== undefined && work?.randomUnlock) {
      refetchUnlockState();
      refetchWork();
    }
  }, [receivedAmount, work?.randomUnlock, refetchUnlockState, refetchWork]);

  // Audio progressive unlock: calculate playable duration
  const audioPlayableDuration = useMemo(() => {
    if (!work) return 0;
    const fileVersion = work.fileVersion;
    const isAudioWork = work.workType === 'audio' || 
      (fileVersion && (fileVersion.mimeType.includes('audio/mpeg') || fileVersion.mimeType.includes('audio/wav')));
    
    if (!isAudioWork || !audioDuration) return 0;
    if (isFullyUnlocked) return audioDuration;
    return (audioDuration * percentage) / 100;
  }, [work, audioDuration, percentage, isFullyUnlocked]);

  // Handle audio time update to enforce progressive unlock
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || !work || isFullyUnlocked) return;
    
    const fileVersion = work.fileVersion;
    const isAudioWork = work.workType === 'audio' || 
      (fileVersion && (fileVersion.mimeType.includes('audio/mpeg') || fileVersion.mimeType.includes('audio/wav')));
    
    if (!isAudioWork) return;

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
  }, [work, audioPlayableDuration, isFullyUnlocked, t]);

  useEffect(() => {
    if (work) {
      document.title = `${work.title} - ${work.author} | JiDian吉店`;
      
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        const contentPreview = work.content.replace(/<[^>]*>/g, '').substring(0, 100);
        metaDescription.setAttribute('content', `${work.title} - 作者：${work.author}。${contentPreview}...`);
      }
      
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', `${work.title} - ${work.author} | JiDian吉店`);
      }
      
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        const contentPreview = work.content.replace(/<[^>]*>/g, '').substring(0, 100);
        ogDescription.setAttribute('content', `作者：${work.author}。${contentPreview}...`);
      }
    }
    
    return () => {
      document.title = 'JiDian吉店 - 点滴资助，步步解锁';
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription) {
        metaDescription.setAttribute('content', 'JiDian吉店 - 点滴资助，步步解锁。发布文本作品，支持渐进式内容解锁功能。');
      }
      const ogTitle = document.querySelector('meta[property="og:title"]');
      if (ogTitle) {
        ogTitle.setAttribute('content', 'JiDian吉店 - 点滴资助，步步解锁');
      }
      const ogDescription = document.querySelector('meta[property="og:description"]');
      if (ogDescription) {
        ogDescription.setAttribute('content', '发布文本作品，支持渐进式内容解锁功能。');
      }
    };
  }, [work]);

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">{t.common.loading}</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !work) {
    return (
      <div className="container py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="text-center">
            <p className="text-lg font-medium text-muted-foreground mb-4">{t.common.error}</p>
            <Button onClick={() => navigate({ to: '/' })}>{t.common.back}</Button>
          </div>
        </div>
      </div>
    );
  }

  const isOwner = identity?.getPrincipal().toString() === work.creator.toString();
  const isImageWork = work.workType === 'image';
  const isTextWork = work.workType === 'text';
  const fileVersion = work.fileVersion;
  
  // Check if it's an audio work by workType or mimeType
  const isAudioWork = work.workType === 'audio' || 
    (fileVersion && (fileVersion.mimeType.includes('audio/mpeg') || fileVersion.mimeType.includes('audio/wav')));
  
  // File work is anything with fileVersion that's not audio
  const isFileWork = work.workType === 'file' && !isAudioWork;
  
  const imageVersions = work.imageVersions || [];

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
    navigator.clipboard.writeText(work.accountId);
    toast.success(t.productDetail.accountIdCopied);
  };

  const handleRefreshAll = async () => {
    await Promise.all([refetchAmount(), refetchTransfers(), refetchWork(), refetchUnlockState()]);
    toast.success(t.productDetail.dataRefreshed);
  };

  const handleDelete = async () => {
    try {
      await deleteProduct.mutateAsync(work.id);
      toast.success(t.productDetail.workDeleted);
      navigate({ to: '/' });
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

  const formatPublishedDate = (timestamp: bigint) => {
    const date = new Date(Number(timestamp) / 1_000_000);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const shortenAddress = (address: string) => {
    if (address.length <= 16) return address;
    return `${address.substring(0, 8)}...${address.substring(address.length - 8)}`;
  };

  // Get time window label
  const getTimeWindowLabel = () => {
    switch (work.timeWindow) {
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
      <div className="container py-8 max-w-4xl">
        <div className="space-y-6">
          {/* Header Section */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold break-words mb-4">{work.title}</h1>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="h-4 w-4" />
                    <span>{work.author}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    <span>{formatPublishedDate(work.publishedAt)}</span>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {isImageWork && (
                    <Badge variant="outline" className="text-xs">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      {t.productDetail.image}
                    </Badge>
                  )}
                  {isAudioWork && (
                    <Badge variant="outline" className="text-xs">
                      <Music className="h-3 w-3 mr-1" />
                      {t.productDetail.audio}
                    </Badge>
                  )}
                  {isFileWork && (
                    <Badge variant="outline" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      {t.productDetail.file}
                    </Badge>
                  )}
                  {work.progressiveUnlock && (
                    <Badge variant="secondary" className="text-xs">{t.productDetail.progressiveUnlock}</Badge>
                  )}
                  {isTextWork && work.randomUnlock && (
                    <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                      <Shuffle className="h-3 w-3 mr-1" />
                      {t.productCard.randomUnlock}
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-xs">
                    {t.productDetail.timeWindow}: {getTimeWindowLabel()}
                  </Badge>
                  {isFullyUnlocked && (
                    <Badge className="bg-green-500 text-xs">{t.productDetail.completed}</Badge>
                  )}
                </div>
              </div>
              {isOwner && (
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setShowEditModal(true)}
                  >
                    <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 sm:h-10 sm:w-10"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Progress Section */}
          <div className="rounded-lg border bg-muted/30 p-4 sm:p-6">
            <div className="mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-sm font-medium">{t.productDetail.unlockProgress}</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold">{percentage.toFixed(1)}%</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 sm:h-8 sm:w-8"
                  onClick={handleRefreshAll}
                  disabled={isFetchingAmount || isFetchingTransfers}
                >
                  <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${(isFetchingAmount || isFetchingTransfers) ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <Progress value={percentage} className="h-2.5 sm:h-3 mb-2" />
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-0 text-xs sm:text-sm text-muted-foreground">
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
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="flex-1 rounded-md border bg-muted/50 px-3 py-2 text-xs sm:text-sm font-mono break-all overflow-wrap-anywhere">
                {work.accountId}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={copyAccountId}
                className="h-9 w-9 sm:h-10 sm:w-10 shrink-0"
              >
                <Copy className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Audio Work Content */}
          {isAudioWork && fileVersion ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {isFullyUnlocked ? (
                  <Unlock className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <h2 className="font-semibold text-lg">{t.productDetail.audioContent}</h2>
              </div>
              <div className="rounded-lg border bg-card p-4 sm:p-6">
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
                  <Unlock className="h-4 w-4 text-green-500 shrink-0" />
                ) : (
                  <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <h2 className="font-semibold text-lg">{t.productDetail.fileContent}</h2>
              </div>
              <div className="rounded-lg border bg-card p-4 sm:p-6">
                {isFullyUnlocked ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                      <Download className="h-10 w-10 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{fileVersion.originalFilename}</p>
                        <p className="text-xs text-muted-foreground">{fileVersion.mimeType}</p>
                      </div>
                    </div>
                    <Button onClick={handleDownload} className="w-full" size="lg">
                      <Download className="mr-2 h-5 w-5" />
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
                  <div className="flex items-center justify-center py-8 sm:py-12 text-muted-foreground">
                    <div className="text-center">
                      <Lock className="mx-auto mb-2 h-10 w-10 sm:h-12 sm:w-12" />
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {isFullyUnlocked ? (
                    <Unlock className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                  )}
                  <h2 className="font-semibold text-lg">{t.productDetail.imageContent}</h2>
                </div>
                <Badge variant="outline" className="text-xs">
                  {getImageQualityLabel(currentImageLevel)}
                </Badge>
              </div>
              <div className="rounded-lg border bg-card p-4 sm:p-6">
                <div className="relative w-full">
                  <img
                    src={imageUrl}
                    alt={work.title}
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
                  <Unlock className="h-4 w-4 text-green-500 shrink-0" />
                  <h2 className="font-semibold text-lg">{t.productDetail.freeContent}</h2>
                </div>
                <div className="rounded-lg border bg-card p-4 sm:p-6">
                  <div 
                    className="prose prose-sm max-w-none dark:prose-invert break-words"
                    dangerouslySetInnerHTML={{ __html: freeContent }}
                  />
                </div>
              </div>

              {/* Paid Content Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isFullyUnlocked ? (
                      <Unlock className="h-4 w-4 text-green-500 shrink-0" />
                    ) : (
                      <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <h2 className="font-semibold text-lg">{t.productDetail.paidContent}</h2>
                    {work.randomUnlock && !isFullyUnlocked && (
                      <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30">
                        <Shuffle className="h-3 w-3 mr-1" />
                        {t.productDetail.randomUnlock}
                      </Badge>
                    )}
                  </div>
                  {!isFullyUnlocked && work.progressiveUnlock && (
                    <span className="text-xs text-muted-foreground">
                      {percentage.toFixed(1)}%
                    </span>
                  )}
                </div>
                <div className="rounded-lg border bg-card p-4 sm:p-6">
                  {work.progressiveUnlock && !isFullyUnlocked ? (
                    <div className="relative">
                      {work.randomUnlock && (
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
                          {work.randomUnlock && randomUnlockProgress && (
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
                    <div className="flex items-center justify-center py-8 sm:py-12 text-muted-foreground">
                      <div className="text-center">
                        <Lock className="mx-auto mb-2 h-8 w-8 sm:h-10 sm:w-10" />
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <ArrowDownLeft className="h-4 w-4 text-primary shrink-0" />
                <h2 className="font-semibold text-lg">{t.productDetail.transferRecords}</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="self-start sm:self-auto"
                onClick={() => refetchTransfers()}
                disabled={isFetchingTransfers}
              >
                <RefreshCw className={`h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1.5 ${isFetchingTransfers ? 'animate-spin' : ''}`} />
                {t.common.refresh}
              </Button>
            </div>
            <div className="rounded-lg border bg-card">
              {transfers && transfers.length > 0 ? (
                <div className="divide-y">
                  {transfers.map((transfer) => (
                    <div key={transfer.txId} className="p-4 sm:p-5 hover:bg-muted/50 transition-colors">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 sm:gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-1">
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
                <div className="flex items-center justify-center py-8 sm:py-12 text-muted-foreground">
                  <div className="text-center">
                    <ArrowDownLeft className="mx-auto mb-2 h-8 w-8 sm:h-10 sm:w-10 opacity-50" />
                    <p className="text-sm">{t.productDetail.noRecords}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {showEditModal && (
        <EditProductModal
          product={work}
          receivedAmount={currentAmountE8s}
          onClose={() => {
            setShowEditModal(false);
          }}
        />
      )}

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="w-[90vw] max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>{t.productDetail.confirmDelete}</AlertDialogTitle>
            <AlertDialogDescription>
              {t.productDetail.confirmDeleteDesc}"{work.title}"? {t.productDetail.confirmDeleteNote}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-row gap-2">
            <AlertDialogCancel className="w-full sm:w-auto">{t.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="w-full sm:w-auto bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteProduct.isPending ? t.productDetail.deleting : t.productDetail.deleteButton}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
