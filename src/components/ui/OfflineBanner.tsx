import React, { useState, useEffect } from 'react';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { OfflineSyncService } from '../../services/offlineSyncService';
import { ClientStorage } from '../../storage/clientStorage';

export const OfflineBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [lastSynced, setLastSynced] = useState<string>(ClientStorage.getLastSyncTime());
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  useEffect(() => {
    OfflineSyncService.init();
    const unsubscribe = OfflineSyncService.subscribe((online) => {
      setIsOnline(online);
      setLastSynced(ClientStorage.getLastSyncTime());
    });
    return () => unsubscribe();
  }, []);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await OfflineSyncService.flushQueue();
    setTimeout(() => {
      setLastSynced(ClientStorage.getLastSyncTime());
      setIsSyncing(false);
    }, 600);
  };

  const formattedTime = (() => {
    try {
      const d = new Date(lastSynced);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  })();

  if (isOnline) {
    return null;
  }

  return (
    <div className="bg-amber-950/70 border-b border-amber-800/60 px-4 py-2 text-xs flex items-center justify-between text-amber-200">
      <div className="flex items-center gap-2">
        <WifiOff size={14} className="text-amber-400 shrink-0" />
        <span>
          <strong>Offline Mode</strong> · Last synced {formattedTime}
        </span>
      </div>
      <button
        onClick={handleManualSync}
        disabled={isSyncing}
        className="flex items-center gap-1.5 px-2 py-1 bg-amber-900/60 hover:bg-amber-900 border border-amber-700/50 rounded-md font-medium text-amber-100 transition-colors"
      >
        <RefreshCw size={11} className={isSyncing ? 'animate-spin' : ''} />
        <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
      </button>
    </div>
  );
};
