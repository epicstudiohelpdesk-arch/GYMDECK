/**
 * GymDeck Member Mobile - Network Status Listener Hook
 */

import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { useSyncStore } from '../store/syncStore';
import { Logger } from '../observability';

export interface NetworkStatus {
  isConnected: boolean;
  isInternetReachable: boolean | null;
  type: string;
}

export const useNetworkStatus = (): NetworkStatus => {
  const setOnlineStatus = useSyncStore((state) => state.setOnlineStatus);
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
    type: 'unknown',
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      const isConnected = !!state.isConnected && state.isInternetReachable !== false;
      
      setStatus({
        isConnected: !!state.isConnected,
        isInternetReachable: state.isInternetReachable,
        type: state.type,
      });

      setOnlineStatus(isConnected);
      Logger.debug(`[NetworkStatus] Connection change: isConnected=${isConnected}, type=${state.type}`);
    });

    return () => {
      unsubscribe();
    };
  }, [setOnlineStatus]);

  return status;
};

export default useNetworkStatus;
