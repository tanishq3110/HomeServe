import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'connecting' | 'reconnecting' | 'disconnected' | 'error'
  const socketRef = useRef(null);

  useEffect(() => {
    // Connect ONLY when authenticated with a valid token
    if (!isAuthenticated || !token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
        setConnectionStatus('disconnected');
      }
      return;
    }

    // Determine backend socket URL from VITE_SOCKET_URL, or strip /api from VITE_API_BASE_URL, or default to http://localhost:5000
    let socketUrl = import.meta.env.VITE_SOCKET_URL;
    if (!socketUrl) {
      const apiUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
      socketUrl = apiUrl.replace(/\/api\/?$/, '');
    }

    setConnectionStatus('connecting');

    // Create Socket.IO connection. Token is strictly passed in auth payload (never query params)
    const newSocket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000,
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      if (reason === 'io server disconnect') {
        // Disconnected intentionally by server (e.g. invalid/expired token)
        setConnectionStatus('disconnected');
      } else {
        setConnectionStatus('reconnecting');
      }
    });

    newSocket.on('connect_error', (err) => {
      setIsConnected(false);
      setConnectionStatus('error');
    });

    newSocket.on('reconnect', () => {
      setIsConnected(true);
      setConnectionStatus('connected');
    });

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
      socketRef.current = null;
      setSocket(null);
      setIsConnected(false);
      setConnectionStatus('disconnected');
    };
  }, [token, isAuthenticated]);

  /**
   * Helper to safely join a booking room
   */
  const joinBookingRoom = useCallback((bookingId) => {
    if (!socketRef.current || !socketRef.current.connected || !bookingId) return;
    socketRef.current.emit('booking:join', { bookingId });
  }, []);

  /**
   * Helper to safely leave a booking room
   */
  const leaveBookingRoom = useCallback((bookingId) => {
    if (!socketRef.current || !bookingId) return;
    socketRef.current.emit('booking:leave', { bookingId });
  }, []);

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        connectionStatus,
        joinBookingRoom,
        leaveBookingRoom,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
