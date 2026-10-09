import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useSocket } from '../../context/SocketContext';

/**
 * ConnectionStatusBadge
 * Displays real-time WebSocket connection state in a subtle, non-intrusive badge.
 */
const ConnectionStatusBadge = ({ onRefresh, className = '' }) => {
  const { connectionStatus, isConnected } = useSocket();

  if (isConnected || connectionStatus === 'connected') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 transition-colors ${className}`}
        title="Real-time updates active via Socket.IO"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="hidden sm:inline">Live Updates</span>
        <span className="sm:hidden">Live</span>
      </div>
    );
  }

  if (connectionStatus === 'reconnecting' || connectionStatus === 'connecting') {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 transition-colors ${className}`}
        title="Reconnecting to real-time service..."
      >
        <RefreshCw className="w-3 h-3 animate-spin text-amber-600" />
        <span>Reconnecting</span>
      </div>
    );
  }

  // Disconnected / Offline state
  return (
    <div
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 transition-colors ${className}`}
      title="Real-time disconnected. Click refresh to sync."
    >
      <WifiOff className="w-3 h-3 text-slate-400" />
      <span>Offline</span>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="ml-1 text-[10px] text-brand-accent hover:underline font-bold"
          title="Refresh booking data"
        >
          Sync
        </button>
      )}
    </div>
  );
};

export default ConnectionStatusBadge;
