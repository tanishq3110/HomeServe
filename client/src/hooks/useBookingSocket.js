import { useEffect, useRef } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * useBookingSocket
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom hook to subscribe to real-time status updates for a specific booking.
 *
 * @param {string} bookingId - The MongoDB _id of the booking to track
 * @param {Function} onStatusUpdated - Callback invoked with event payload { bookingId, status, previousStatus, booking }
 * @param {Function} [onReconnect] - Optional callback to re-fetch initial data if connection dropped
 */
export const useBookingSocket = (
  bookingId,
  onStatusUpdated,
  onReconnect,
  locationHandlers = {}
) => {
  const { socket, isConnected, connectionStatus, joinBookingRoom, leaveBookingRoom } = useSocket();

  const onStatusUpdatedRef = useRef(onStatusUpdated);
  onStatusUpdatedRef.current = onStatusUpdated;

  const onReconnectRef = useRef(onReconnect);
  onReconnectRef.current = onReconnect;

  const locationHandlersRef = useRef(locationHandlers);
  locationHandlersRef.current = locationHandlers;

  useEffect(() => {
    if (!socket || !bookingId) return;

    // Join room when connected
    if (isConnected) {
      joinBookingRoom(bookingId);
    }

    // Listener for status updates
    const handleStatusUpdated = (payload) => {
      if (payload?.bookingId === bookingId && onStatusUpdatedRef.current) {
        onStatusUpdatedRef.current(payload);
      }
    };

    // Phase 8: Listeners for real-time location events
    const handleLocationUpdated = (payload) => {
      if (payload?.bookingId === bookingId && locationHandlersRef.current?.onLocationUpdated) {
        locationHandlersRef.current.onLocationUpdated(payload);
      }
    };

    const handleSharingStarted = (payload) => {
      if (payload?.bookingId === bookingId && locationHandlersRef.current?.onSharingStarted) {
        locationHandlersRef.current.onSharingStarted(payload);
      }
    };

    const handleSharingStopped = (payload) => {
      if (payload?.bookingId === bookingId && locationHandlersRef.current?.onSharingStopped) {
        locationHandlersRef.current.onSharingStopped(payload);
      }
    };

    // Reconnection handler: re-join room and refresh REST data
    const handleReconnect = () => {
      joinBookingRoom(bookingId);
      if (onReconnectRef.current) {
        onReconnectRef.current();
      }
    };

    socket.on('booking:status_updated', handleStatusUpdated);
    socket.on('location:updated', handleLocationUpdated);
    socket.on('location:sharing_started', handleSharingStarted);
    socket.on('location:sharing_stopped', handleSharingStopped);
    socket.on('reconnect', handleReconnect);

    return () => {
      socket.off('booking:status_updated', handleStatusUpdated);
      socket.off('location:updated', handleLocationUpdated);
      socket.off('location:sharing_started', handleSharingStarted);
      socket.off('location:sharing_stopped', handleSharingStopped);
      socket.off('reconnect', handleReconnect);
      leaveBookingRoom(bookingId);
    };
  }, [socket, isConnected, bookingId, joinBookingRoom, leaveBookingRoom]);

  return { isConnected, connectionStatus };
};

export default useBookingSocket;
