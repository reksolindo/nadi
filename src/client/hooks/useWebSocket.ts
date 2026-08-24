import { useState, useEffect, useRef, useCallback } from 'react';
import type { UserBandwidthSample, NetworkSummary, WebSocketMessage } from '../../server/types.js';

// ==========================================
// WebSocket Realtime Hook
// ==========================================

export interface WebSocketState {
  connected: boolean;
  lastUpdated: number | null;
  summary: NetworkSummary | null;
  users: UserBandwidthSample[];
  routerConnected: boolean;
  routerError: string | null;
  reconnect: () => void;
}

export function useWebSocket(): WebSocketState {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [summary, setSummary] = useState<NetworkSummary | null>(null);
  const [users, setUsers] = useState<UserBandwidthSample[]>([]);
  const [routerConnected, setRouterConnected] = useState<boolean>(true);
  const [routerError, setRouterError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const isUnmountingRef = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (isUnmountingRef.current) return;

    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      // console.log(`[WS Hook] Connecting to ${wsUrl}...`);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        // console.log('[WS Hook] Connected successfully');
        setConnected(true);
        retryCountRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (message.type === 'snapshot') {
            setLastUpdated(message.timestamp);
            setSummary(message.summary);
            setUsers(message.users || []);
            setRouterConnected(message.routerConnected);
            setRouterError(message.routerError || null);
          }
        } catch (err) {
          console.error('[WS Hook] Error parsing message:', err);
        }
      };

      ws.onclose = () => {
        setConnected(false);
        wsRef.current = null;

        if (!isUnmountingRef.current) {
          // Exponential backoff reconnect: 1s, 2s, 4s, capped at 10s
          const delay = Math.min(10000, 1000 * Math.pow(1.5, retryCountRef.current));
          retryCountRef.current += 1;
          // console.log(`[WS Hook] Disconnected. Reconnecting in ${Math.round(delay)}ms...`);
          retryTimeoutRef.current = setTimeout(connect, delay);
        }
      };

      ws.onerror = (err) => {
        console.warn('[WS Hook] WebSocket error encountered', err);
        ws.close();
      };
    } catch (err) {
      console.error('[WS Hook] Failed to initialize WebSocket:', err);
      setConnected(false);
    }
  }, []);

  const reconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    retryCountRef.current = 0;
    connect();
  }, [connect]);

  useEffect(() => {
    isUnmountingRef.current = false;
    connect();

    return () => {
      isUnmountingRef.current = true;
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return {
    connected,
    lastUpdated,
    summary,
    users,
    routerConnected,
    routerError,
    reconnect,
  };
}
