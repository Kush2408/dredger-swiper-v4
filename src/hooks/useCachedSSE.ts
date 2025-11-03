import { useEffect, useState, useRef } from 'react';
import { useSSE } from './useSSE';
import { dataCache } from '../services/dataCacheService';

interface UseCachedSSEOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  cacheKey: string;
  forceRefresh?: boolean;
}

interface UseCachedSSEReturn<T> {
  data: T | null;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  loaFding: boolean;
  reconnect: () => void;
  close: () => void;
  isCached: boolean;
  isStale: boolean;
  refreshData: () => void;
}

export function useCachedSSE<T = any>(
  url: string,
  options: UseCachedSSEOptions
): UseCachedSSEReturn<T> {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    cacheKey,
    forceRefresh = false
  } = options;

  const [isCached, setIsCached] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const hasConnectedRef = useRef(false);

  // Get cached data first
  const cachedData = dataCache.get<T>(cacheKey);
  const cachedExists = dataCache.has(cacheKey);
  const cachedIsStale = dataCache.isStale(cacheKey);

  // Use SSE hook only if URL is provided
  const sseResult = useSSE<T>(url || '', {
    onMessage: (data) => {
      // Store new data in cache
      dataCache.set(cacheKey, data);
      setIsCached(true);
      setIsStale(false);
      onMessage?.(data);
    },
    onError: (error) => {
      onError?.(error);
    },
    onOpen: () => {
      hasConnectedRef.current = true;
      onOpen?.();
    },
    onClose: () => {
      onClose?.();
    }
  });

  // Determine if we should show loading state
  const shouldShowLoading = () => {
    // If no URL is provided, don't show loading
    if (!url || url.trim() === '') {
      return false;
    }
    
    // Always show loading on first load if no cached data
    if (initialLoad && !cachedExists) {
      return true;
    }
    
    // Show loading if force refresh is requested
    if (forceRefresh) {
      return true;
    }
    
    // Show loading if we have cached data but it's stale and we're connecting
    if (cachedExists && cachedIsStale && sseResult.isConnecting) {
      return true;
    }
    
    // Don't show loading if we have fresh cached data
    if (cachedExists && !cachedIsStale) {
      return false;
    }
    
    // Default to SSE loading state
    return sseResult.loading;
  };

  // Set initial data from cache if available
  useEffect(() => {
    if (cachedData && !forceRefresh) {
      console.log(`📦 Using cached data for ${cacheKey}`);
      setIsCached(true);
      setIsStale(cachedIsStale);
      setInitialLoad(false);
    } else if (forceRefresh) {
      console.log(`🔄 Force refresh requested for ${cacheKey}`);
      dataCache.clear(cacheKey);
      setIsCached(false);
      setIsStale(false);
      setInitialLoad(true);
    }
  }, [cacheKey, forceRefresh, cachedData, cachedIsStale]);

  // Update stale state when SSE data changes
  useEffect(() => {
    if (sseResult.data) {
      setIsCached(true);
      setIsStale(false);
      setInitialLoad(false);
    }
  }, [sseResult.data]);

  // Refresh data function
  const refreshData = () => {
    console.log(`🔄 Manually refreshing data for ${cacheKey}`);
    dataCache.markStale(cacheKey);
    setIsStale(true);
    setInitialLoad(true);
  };

  // Determine which data to use
  const data = (() => {
    // If we have fresh SSE data, use it
    if (sseResult.data && !forceRefresh) {
      return sseResult.data;
    }
    
    // If we have cached data and not forcing refresh, use it
    if (cachedData && !forceRefresh) {
      return cachedData;
    }
    
    // Otherwise return null
    return null;
  })();

  return {
    data,
    error: sseResult.error,
    isConnected: sseResult.isConnected,
    isConnecting: sseResult.isConnecting,
    loading: shouldShowLoading(),
    reconnect: sseResult.reconnect,
    close: sseResult.close,
    isCached,
    isStale,
    refreshData
  };
}

export default useCachedSSE;
