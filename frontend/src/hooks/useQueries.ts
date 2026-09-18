import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { TimeWindow, TextWorkId } from '../backend';
import type { Work, WorkSummary, UserProfile, ImageVersion, FileVersion, WorkType, RandomUnlockState, AppSettings } from '../backend';
import { Principal } from '@icp-sdk/core/principal';
import { getAccountTransactions } from '../lib/icpIndexService';

// Define TransferRecord locally since it's not exported from backend
export interface TransferRecord {
  txId: string;
  from: string;
  amount: bigint;
  timestamp: bigint;
}

// Client-side validation function to ensure work summary data integrity
function isValidWorkSummary(work: WorkSummary): boolean {
  try {
    // Check required fields
    if (!work.id || work.id.trim().length === 0) {
      console.warn('[isValidWorkSummary] Invalid work: missing or empty id', work);
      return false;
    }
    if (!work.title || work.title.trim().length === 0) {
      console.warn('[isValidWorkSummary] Invalid work: missing or empty title', work);
      return false;
    }
    if (!work.author || work.author.trim().length === 0) {
      console.warn('[isValidWorkSummary] Invalid work: missing or empty author', work);
      return false;
    }
    if (!work.workType) {
      console.warn('[isValidWorkSummary] Invalid work: missing workType', work);
      return false;
    }
    
    // Validate workType is one of the expected values
    const validWorkTypes = ['text', 'image', 'audio', 'file'];
    if (!validWorkTypes.includes(work.workType)) {
      console.warn('[isValidWorkSummary] Invalid work: invalid workType', work.workType, work);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[isValidWorkSummary] Error validating work:', error, work);
    return false;
  }
}

// Client-side validation function to ensure full work data integrity
function isValidWork(work: Work): boolean {
  try {
    // Check required fields
    if (!work.id || work.id.trim().length === 0) {
      console.warn('[isValidWork] Invalid work: missing or empty id', work);
      return false;
    }
    if (!work.title || work.title.trim().length === 0) {
      console.warn('[isValidWork] Invalid work: missing or empty title', work);
      return false;
    }
    if (!work.creator || work.creator.toString().length === 0) {
      console.warn('[isValidWork] Invalid work: missing or invalid creator', work);
      return false;
    }
    if (!work.workType) {
      console.warn('[isValidWork] Invalid work: missing workType', work);
      return false;
    }
    
    // Validate workType is one of the expected values
    const validWorkTypes = ['text', 'image', 'audio', 'file'];
    if (!validWorkTypes.includes(work.workType)) {
      console.warn('[isValidWork] Invalid work: invalid workType', work.workType, work);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('[isValidWork] Error validating work:', error, work);
    return false;
  }
}

export function useGetCallerUserProfile() {
  const { actor, isFetching: actorFetching } = useActor();

  const query = useQuery<UserProfile | null>({
    queryKey: ['currentUserProfile'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getCallerUserProfile();
    },
    enabled: !!actor && !actorFetching,
    retry: false,
  });

  return {
    ...query,
    isLoading: actorFetching || query.isLoading,
    isFetched: !!actor && query.isFetched,
  };
}

export function useSaveCallerUserProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      if (!actor) throw new Error('Actor not available');
      return actor.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUserProfile'] });
    },
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<boolean>({
    queryKey: ['isAdmin'],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<AppSettings>({
    queryKey: ['appSettings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: AppSettings) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
      queryClient.invalidateQueries({ queryKey: ['analyticsSettings'] });
    },
  });
}

export function useGetAnalyticsSettings() {
  const { actor, isFetching } = useActor();

  return useQuery<{ gaTrackingId?: string; analyticsEnabled: boolean }>({
    queryKey: ['analyticsSettings'],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      return actor.getAnalyticsSettings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateAnalyticsSettings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: { gaTrackingId?: string; analyticsEnabled: boolean }) => {
      if (!actor) throw new Error('Actor not available');
      return actor.updateAnalyticsSettings(settings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['analyticsSettings'] });
      queryClient.invalidateQueries({ queryKey: ['appSettings'] });
    },
  });
}

export function useGetAllWorksAdmin() {
  const { actor, isFetching } = useActor();

  return useQuery<Work[]>({
    queryKey: ['allWorksAdmin'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const works = await actor.getAllWorksAdmin();
        console.log('[useGetAllWorksAdmin] Retrieved works count:', works.length);
        
        // Filter out invalid works on the client side as well
        const validWorks = works.filter(isValidWork);
        const invalidCount = works.length - validWorks.length;
        
        if (invalidCount > 0) {
          console.warn(`[useGetAllWorksAdmin] Filtered out ${invalidCount} invalid works`);
        }
        
        return validWorks;
      } catch (error) {
        console.error('[useGetAllWorksAdmin] Error fetching works:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllPaidWorks() {
  const { actor, isFetching } = useActor();

  return useQuery<WorkSummary[]>({
    queryKey: ['paidWorks'],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const works = await actor.getAllPaidWorks();
        console.log('[useGetAllPaidWorks] Retrieved work summaries count:', works.length);
        console.log('[useGetAllPaidWorks] Work types:', works.map(w => ({ id: w.id, type: w.workType })));
        
        // Filter out invalid works on the client side as well
        const validWorks = works.filter(isValidWorkSummary);
        const invalidCount = works.length - validWorks.length;
        
        if (invalidCount > 0) {
          console.warn(`[useGetAllPaidWorks] Filtered out ${invalidCount} invalid works`);
        }
        
        return validWorks;
      } catch (error) {
        console.error('[useGetAllPaidWorks] Error fetching works:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching,
    refetchInterval: 30000,
  });
}

export function useGetWork(id: TextWorkId) {
  const { actor, isFetching } = useActor();

  return useQuery<Work | null>({
    queryKey: ['work', id],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not available');
      try {
        const result = await actor.getWork(id);
        console.log('[useGetWork] Retrieved work:', id, result ? 'found' : 'not found');
        
        // Validate the work if it exists
        if (result && !isValidWork(result)) {
          console.warn('[useGetWork] Work failed validation:', id);
          return null;
        }
        
        return result || null;
      } catch (error) {
        console.error('[useGetWork] Error fetching work:', id, error);
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!id,
    refetchInterval: 30000,
  });
}

export function useGetWorksByCreator(creator: Principal) {
  const { actor, isFetching } = useActor();

  return useQuery<WorkSummary[]>({
    queryKey: ['works', 'creator', creator.toString()],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const works = await actor.getWorksByCreator(creator);
        const validWorks = works.filter(isValidWorkSummary);
        const invalidCount = works.length - validWorks.length;
        
        if (invalidCount > 0) {
          console.warn(`[useGetWorksByCreator] Filtered out ${invalidCount} invalid works`);
        }
        
        return validWorks;
      } catch (error) {
        console.error('[useGetWorksByCreator] Error fetching works:', error);
        return [];
      }
    },
    enabled: !!actor && !isFetching && !!creator,
  });
}

export function useCreateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: TextWorkId;
      title: string;
      freeContent: string;
      paidContent: string;
      targetAmount: bigint;
      accountId: string;
      timeWindow: TimeWindow;
      progressiveUnlock: boolean;
      randomUnlock?: boolean;
      workType?: WorkType;
      imageVersions?: ImageVersion[];
      fileVersion?: FileVersion;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('[useCreateProduct] Creating work:', {
        id: params.id,
        title: params.title,
        workType: params.workType || 'text',
        hasFileVersion: !!params.fileVersion,
        hasImageVersions: !!params.imageVersions,
      });

      // Verify current works count before creation
      try {
        const beforeWorks = await actor.getAllPaidWorks();
        console.log('[useCreateProduct] Works count before creation:', beforeWorks.length);
      } catch (e) {
        console.warn('[useCreateProduct] Could not verify works before creation:', e);
      }
      
      const combinedContent = `${params.freeContent}\n${params.paidContent}`;
      
      try {
        await actor.createWork(
          params.id,
          params.title,
          combinedContent,
          params.workType || ('text' as WorkType),
          params.targetAmount,
          params.accountId,
          params.progressiveUnlock,
          params.randomUnlock || false,
          params.fileVersion || null,
          params.imageVersions || null,
          params.timeWindow
        );

        console.log('[useCreateProduct] Work created successfully:', params.id);

        // Verify works count after creation
        try {
          const afterWorks = await actor.getAllPaidWorks();
          console.log('[useCreateProduct] Works count after creation:', afterWorks.length);
          
          // Verify the new work exists
          const newWork = await actor.getWork(params.id);
          if (!newWork) {
            console.error('[useCreateProduct] CRITICAL: Work was not persisted!', params.id);
            throw new Error('Work creation failed: Work not found after creation');
          } else {
            console.log('[useCreateProduct] Verified new work exists:', newWork.id, newWork.workType);
          }
        } catch (e) {
          console.error('[useCreateProduct] Error verifying work after creation:', e);
          throw e;
        }
      } catch (error) {
        console.error('[useCreateProduct] Error during work creation:', error);
        
        // Verify state after error
        try {
          const errorWorks = await actor.getAllPaidWorks();
          console.log('[useCreateProduct] Works count after error:', errorWorks.length);
        } catch (e) {
          console.error('[useCreateProduct] Could not verify works after error:', e);
        }
        
        throw error;
      }
    },
    onSuccess: (_, variables) => {
      console.log('[useCreateProduct] Invalidating queries after successful creation');
      queryClient.invalidateQueries({ queryKey: ['paidWorks'] });
      queryClient.invalidateQueries({ queryKey: ['allWorksAdmin'] });
      queryClient.invalidateQueries({ queryKey: ['work', variables.id] });
    },
    onError: (error, variables) => {
      console.error('[useCreateProduct] Mutation error:', error);
      console.error('[useCreateProduct] Failed work ID:', variables.id);
      
      // Force refetch to verify current state
      queryClient.invalidateQueries({ queryKey: ['paidWorks'] });
      queryClient.invalidateQueries({ queryKey: ['allWorksAdmin'] });
    },
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      id: TextWorkId;
      title: string;
      freeContent: string;
      paidContent: string;
      targetAmount: bigint;
      accountId: string;
      progressiveUnlock: boolean;
      randomUnlock?: boolean;
      workType?: WorkType;
      imageVersions?: ImageVersion[];
      fileVersion?: FileVersion;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      console.log('[useUpdateProduct] Updating work:', params.id);
      
      const combinedContent = `${params.freeContent}\n${params.paidContent}`;
      
      await actor.updateWork(
        params.id,
        params.title,
        combinedContent,
        '',
        params.workType || ('text' as WorkType),
        params.targetAmount,
        params.accountId,
        params.progressiveUnlock,
        params.randomUnlock || false,
        params.fileVersion || null,
        params.imageVersions || null
      );

      console.log('[useUpdateProduct] Work updated successfully:', params.id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['paidWorks'] });
      queryClient.invalidateQueries({ queryKey: ['work', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['allWorksAdmin'] });
    },
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: TextWorkId) => {
      if (!actor) throw new Error('Actor not available');
      console.log('[useDeleteProduct] Deleting work:', id);
      await actor.deleteWork(id);
      console.log('[useDeleteProduct] Work deleted successfully:', id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['paidWorks'] });
      queryClient.invalidateQueries({ queryKey: ['allWorksAdmin'] });
    },
  });
}

// Helper function to get time window duration in nanoseconds
function getTimeWindowNanos(timeWindow: TimeWindow): bigint {
  switch (timeWindow) {
    case TimeWindow.last1Hour:
      return BigInt(3_600_000_000_000); // 1 hour in nanoseconds
    case TimeWindow.last24Hours:
      return BigInt(86_400_000_000_000); // 24 hours in nanoseconds
    case TimeWindow.last7Days:
      return BigInt(604_800_000_000_000); // 7 days in nanoseconds
    case TimeWindow.last30Days:
      return BigInt(2_592_000_000_000_000); // 30 days in nanoseconds
    case TimeWindow.permanent:
      return BigInt(0); // No time limit
    default:
      return BigInt(0);
  }
}

// Helper function to check if a transaction is within the time window
function isTransactionInTimeWindow(txTimestamp: bigint, timeWindow: TimeWindow): boolean {
  if (timeWindow === TimeWindow.permanent) {
    return true;
  }

  const now = BigInt(Date.now()) * BigInt(1_000_000); // Current time in nanoseconds
  const windowDuration = getTimeWindowNanos(timeWindow);
  const cutoffTime = now - windowDuration;

  return txTimestamp >= cutoffTime;
}

// Hook to fetch and filter transactions by time window
export function useTransactions(accountId: string, timeWindow?: TimeWindow) {
  return useQuery<TransferRecord[]>({
    queryKey: ['icpTransactions', accountId, timeWindow || TimeWindow.permanent],
    queryFn: async () => {
      if (!accountId) return [];
      
      try {
        const result = await getAccountTransactions(accountId, 100);
        
        if (!result || !result.transactions) {
          return [];
        }

        // Transform ICP index canister transactions to TransferRecord format
        const records: TransferRecord[] = [];
        
        for (const tx of result.transactions) {
          // Extract operation details
          const operation = tx.transaction.operation && tx.transaction.operation.length > 0 
            ? tx.transaction.operation[0] 
            : null;
          
          if (!operation) continue;

          // Only process Transfer operations
          if ('Transfer' in operation) {
            const transfer = operation.Transfer;
            
            // Extract timestamp - use created_at_time if available, otherwise use current time
            let timestamp: bigint;
            if (tx.transaction.created_at_time && tx.transaction.created_at_time.length > 0 && tx.transaction.created_at_time[0]) {
              // Timestamp is already in nanoseconds
              timestamp = tx.transaction.created_at_time[0].timestamp_nanos;
            } else {
              // Fallback to current time if no timestamp available
              timestamp = BigInt(Date.now()) * BigInt(1_000_000);
            }

            // Filter by time window if specified
            if (timeWindow && !isTransactionInTimeWindow(timestamp, timeWindow)) {
              continue;
            }

            records.push({
              txId: tx.id.toString(),
              from: transfer.from,
              amount: transfer.amount.e8s,
              timestamp: timestamp,
            });
          }
        }

        return records;
      } catch (error) {
        console.error('Failed to fetch transaction records:', error);
        return [];
      }
    },
    enabled: !!accountId,
    refetchInterval: 30000,
  });
}

// Hook to calculate received amount within time window
export function useAccountReceivedAmount(accountId: string, timeWindow?: TimeWindow) {
  const { data: transfers, ...rest } = useTransactions(accountId, timeWindow);

  const receivedAmount = transfers?.reduce((sum, transfer) => sum + transfer.amount, BigInt(0)) || BigInt(0);

  return {
    ...rest,
    data: receivedAmount,
  };
}

export function useGetAccountTransfers(accountId: string, timeWindow?: TimeWindow) {
  // Use the updated useTransactions hook that filters by time window
  return useTransactions(accountId, timeWindow);
}

export function useGetRandomUnlockState(workId: TextWorkId) {
  const { actor, isFetching } = useActor();

  return useQuery<RandomUnlockState | null>({
    queryKey: ['randomUnlockState', workId],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getRandomUnlockState(workId);
    },
    enabled: !!actor && !isFetching && !!workId,
    refetchInterval: 30000,
  });
}

export function useSaveRandomUnlockState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workId: TextWorkId;
      unlockedText: string;
      fundingPercentage: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      return actor.saveRandomUnlockState(
        params.workId,
        params.unlockedText,
        params.fundingPercentage
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['randomUnlockState', variables.workId] });
    },
  });
}

export function useUpdateRandomUnlockState() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      workId: TextWorkId;
      newUnlockedText: string;
      currentFundingPercentage: bigint;
    }) => {
      if (!actor) throw new Error('Actor not available');
      
      return actor.updateRandomUnlockState(
        params.workId,
        params.newUnlockedText,
        params.currentFundingPercentage
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['randomUnlockState', variables.workId] });
    },
  });
}

