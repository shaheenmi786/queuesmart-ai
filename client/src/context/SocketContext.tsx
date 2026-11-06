import React, { createContext, useContext, useEffect, useState } from 'react';
import { socketService } from '../services/socket';

interface SocketContextType {
  isConnected: boolean;
  subscribe: (event: string, callback: (data: any) => void) => () => void;
  joinQueue: (departmentId: number) => void;
  leaveQueue: (departmentId: number) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    socketService.connect();
    const unsubscribe = socketService.onStatusChange((status) => {
      setIsConnected(status);
    });

    return () => {
      unsubscribe();
      socketService.disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        subscribe: (event, cb) => socketService.subscribe(event, cb),
        joinQueue: (deptId) => socketService.joinQueue(deptId),
        leaveQueue: (deptId) => socketService.leaveQueue(deptId),
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = (): SocketContextType => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
