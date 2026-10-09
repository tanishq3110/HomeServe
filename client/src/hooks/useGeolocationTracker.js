import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../context/SocketContext';

/**
 * useGeolocationTracker
 * ─────────────────────────────────────────────────────────────────────────────
 * Hook for managing technician real-time GPS tracking using navigator.geolocation.watchPosition().
 *
 * Coordinates are streamed over the authenticated Socket.IO connection.
 * Lifecycle, watchers, permissions, errors, and clean unmounting are strictly managed.
 *
 * @param {string} bookingId - Active booking ID
 * @param {boolean} isEligible - Whether the booking is in an eligible tracking status
 * @param {Function} [onLocationUpdated] - Callback fired when a new coordinate is obtained
 */
export const useGeolocationTracker = (bookingId, isEligible, onLocationUpdated) => {
  const { socket, isConnected } = useSocket();

  // Statuses: 'idle' | 'requesting' | 'sharing' | 'denied' | 'error' | 'stopped'
  const [status, setStatus] = useState('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [currentCoords, setCurrentCoords] = useState(null);
  const [lastEmittedAt, setLastEmittedAt] = useState(null);

  const watchIdRef = useRef(null);
  const isSharingRef = useRef(false);
  const onLocationUpdatedRef = useRef(onLocationUpdated);
  onLocationUpdatedRef.current = onLocationUpdated;

  /**
   * Internal cleanup for active geolocation watcher
   */
  const stopWatch = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  /**
   * Stop tracking and notify backend
   */
  const stopTracking = useCallback(() => {
    stopWatch();
    isSharingRef.current = false;
    setStatus('stopped');

    if (socket && isConnected && bookingId) {
      socket.emit('location:share_stop', { bookingId });
    }
  }, [socket, isConnected, bookingId, stopWatch]);

  /**
   * Start tracking explicitly on user gesture
   */
  const startTracking = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setStatus('error');
      setErrorMessage('Geolocation is not supported by your browser.');
      return;
    }

    if (!isEligible) {
      setStatus('error');
      setErrorMessage('This booking is not currently eligible for location sharing.');
      return;
    }

    // Prevent duplicate watchers
    stopWatch();

    setStatus('requesting');
    setErrorMessage('');
    isSharingRef.current = true;

    // Notify backend that location sharing is starting
    if (socket && isConnected && bookingId) {
      socket.emit('location:share_start', { bookingId });
    }

    const options = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    };

    const handleSuccess = (position) => {
      if (!isSharingRef.current) return;

      const { latitude, longitude, accuracy, heading, speed } = position.coords;
      const timestamp = new Date(position.timestamp || Date.now()).toISOString();

      const coordsPayload = {
        latitude,
        longitude,
        accuracy: typeof accuracy === 'number' && Number.isFinite(accuracy) ? accuracy : null,
        heading: typeof heading === 'number' && Number.isFinite(heading) ? heading : null,
        speed: typeof speed === 'number' && Number.isFinite(speed) ? speed : null,
        timestamp,
      };

      setCurrentCoords(coordsPayload);
      setStatus('sharing');
      setErrorMessage('');
      setLastEmittedAt(new Date());

      if (onLocationUpdatedRef.current) {
        onLocationUpdatedRef.current(coordsPayload);
      }

      // Stream to server via authenticated Socket.IO connection
      if (socket && socket.connected && bookingId) {
        socket.emit('location:update', {
          bookingId,
          ...coordsPayload,
        });
      }
    };

    const handleError = (error) => {
      let msg = 'Failed to retrieve location.';
      let newStatus = 'error';

      switch (error.code) {
        case error.PERMISSION_DENIED:
          msg = 'Location permission was denied. Please allow location access in your browser settings to share your live location.';
          newStatus = 'denied';
          break;
        case error.POSITION_UNAVAILABLE:
          msg = 'Location information is currently unavailable from your device GPS.';
          break;
        case error.TIMEOUT:
          msg = 'The location request timed out. Retrying GPS lock...';
          break;
        default:
          msg = error.message || 'An unknown geolocation error occurred.';
      }

      setErrorMessage(msg);
      setStatus(newStatus);
    };

    try {
      const id = navigator.geolocation.watchPosition(handleSuccess, handleError, options);
      watchIdRef.current = id;
    } catch (err) {
      setStatus('error');
      setErrorMessage('Could not initiate GPS position tracking: ' + err.message);
    }
  }, [bookingId, isEligible, socket, isConnected, stopWatch]);

  // If booking becomes ineligible, automatically stop tracking
  useEffect(() => {
    if (!isEligible && isSharingRef.current) {
      stopTracking();
    }
  }, [isEligible, stopTracking]);

  // Clean up on component unmount
  useEffect(() => {
    return () => {
      stopWatch();
      if (isSharingRef.current && socket && bookingId) {
        socket.emit('location:share_stop', { bookingId });
      }
      isSharingRef.current = false;
    };
  }, [stopWatch, socket, bookingId]);

  return {
    status,
    errorMessage,
    currentCoords,
    lastEmittedAt,
    isSharing: status === 'sharing',
    startTracking,
    stopTracking,
  };
};

export default useGeolocationTracker;
