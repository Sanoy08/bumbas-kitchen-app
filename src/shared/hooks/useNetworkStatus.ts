import { useState, useEffect, useRef } from 'react';
import NetInfo from '@react-native-community/netinfo';
import { DeviceEventEmitter } from 'react-native';

export const useNetworkStatus = () => {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);
  const wasOffline = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const currentConnection = state.isConnected ?? true;
      setIsConnected(currentConnection);
      
      if (!currentConnection) {
        wasOffline.current = true;
      } else if (currentConnection && wasOffline.current) {
        wasOffline.current = false;
        DeviceEventEmitter.emit('network_restored');
      }
    });

    // Check initial state
    NetInfo.fetch().then((state) => {
      const currentConnection = state.isConnected ?? true;
      setIsConnected(currentConnection);
      if (!currentConnection) wasOffline.current = true;
    });

    return () => unsubscribe();
  }, []);

  const checkConnection = async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected ?? true);
    return state.isConnected ?? true;
  };

  return { isConnected, checkConnection };
};
