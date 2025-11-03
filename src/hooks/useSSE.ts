import { useEffect, useState, useRef } from 'react';

interface UseSSEOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface UseSSEReturn<T> {
  data: T | null;
  error: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  loading: boolean;
  reconnect: () => void;
  close: () => void;
}

export function useSSE<T = any>(
  url: string,
  options: UseSSEOptions = {}
): UseSSEReturn<T> {
  const {
    onMessage,
    onError,
    onOpen,
    onClose,
    reconnectInterval = 5000,
    maxReconnectAttempts = 5
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isMountedRef = useRef(true);

  const connect = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setIsConnecting(true);
    setError(null);

    console.log(`Attempting to connect to SSE: ${url}`);

    try {
      const eventSource = new EventSource(url);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        console.log(`✅ SSE connection opened: ${url}`);
        setIsConnected(true);
        setIsConnecting(false);
        reconnectAttemptsRef.current = 0;
        onOpen?.();
      };

      eventSource.onmessage = (event) => {
        console.log(`📨 SSE message received from ${url}:`, event.data);
        try {
          const parsedData = JSON.parse(event.data);
          console.log(`✅ Parsed SSE data:`, parsedData);
          setData(parsedData);
          onMessage?.(parsedData);
        } catch (parseError) {
          console.error('❌ Failed to parse SSE message:', parseError, 'Raw data:', event.data);
          setError('Failed to parse server message');
        }
      };

      eventSource.onerror = (event) => {
        console.error(`❌ SSE connection error: ${url}`, event);
        console.error(`EventSource readyState:`, eventSource.readyState);
        setIsConnected(false);
        setIsConnecting(false);
        
        if (eventSource.readyState === EventSource.CLOSED) {
          setError('Connection closed by server');
        } else {
          setError('Connection error occurred');
        }
        
        onError?.(event);
        
        // Attempt to reconnect if we haven't exceeded max attempts
        if (reconnectAttemptsRef.current < maxReconnectAttempts && isMountedRef.current) {
          reconnectAttemptsRef.current++;
          console.log(`🔄 Attempting to reconnect (${reconnectAttemptsRef.current}/${maxReconnectAttempts}) in ${reconnectInterval}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) {
              connect();
            }
          }, reconnectInterval);
        } else if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
          setError(`Failed to reconnect after ${maxReconnectAttempts} attempts`);
        }
      };

    } catch (err) {
      console.error('❌ Failed to create SSE connection:', err);
      setError('Failed to create connection');
      setIsConnecting(false);
    }
  };

  const reconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    reconnectAttemptsRef.current = 0;
    connect();
  };

  const close = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
    onClose?.();
  };

  useEffect(() => {
    isMountedRef.current = true;
    
    // Only connect if URL is provided and not empty
    if (url && url.trim() !== '') {
      connect();
    } else {
      // If no URL, reset state
      setIsConnected(false);
      setIsConnecting(false);
      setError(null);
    }

    return () => {
      isMountedRef.current = false;
      close();
    };
  }, [url]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  return {
    data,
    error,
    isConnected,
    isConnecting,
    loading: isConnecting || (!isConnected && !error),
    reconnect,
    close
  };
}
