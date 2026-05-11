import { createContext, useContext } from 'react';
import { useUploadQueue } from '../hooks/useUploadQueue';

const UploadContext = createContext(null);

export function UploadProvider({ children }) {
  const queue = useUploadQueue();
  return <UploadContext.Provider value={queue}>{children}</UploadContext.Provider>;
}

export function useUploadContext() {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUploadContext must be used within UploadProvider');
  return ctx;
}
