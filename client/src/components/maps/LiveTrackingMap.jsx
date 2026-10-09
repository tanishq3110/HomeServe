import React, { useEffect, useRef, useState } from 'react';
import { MapPin, Navigation, AlertTriangle, RefreshCw, Key, Info, ShieldCheck } from 'lucide-react';

/**
 * Script loader utility for Google Maps JavaScript API
 * Ensures the script is only loaded once and avoids global pollution collisions.
 */
let googleMapsPromise = null;

function loadGoogleMapsScript(apiKey) {
  if (window.google && window.google.maps) {
    return Promise.resolve(window.google.maps);
  }

  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const callbackName = '__googleMapsApiLoadedCallback';
    window[callbackName] = () => {
      delete window[callbackName];
      resolve(window.google.maps);
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=${callbackName}`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      delete window[callbackName];
      googleMapsPromise = null;
      reject(new Error('Failed to load Google Maps script. Check your API key and network connection.'));
    };

    document.head.appendChild(script);
  });

  return googleMapsPromise;
}

/**
 * LiveTrackingMap
 * ─────────────────────────────────────────────────────────────────────────────
 * Real-time map component for HomeServe live technician tracking.
 *
 * @param {object} technicianLocation - { latitude, longitude, accuracy, heading, speed, updatedAt }
 * @param {object} [destinationLocation] - { latitude, longitude, addressLine, city }
 * @param {boolean} isSharing - Whether the technician is actively streaming GPS
 * @param {string} [technicianName] - Technician full name
 * @param {string} [className] - Optional custom styles
 */
export const LiveTrackingMap = ({
  technicianLocation,
  destinationLocation,
  isSharing = false,
  technicianName = 'Technician',
  className = '',
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const techMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);

  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

  const [loading, setLoading] = useState(Boolean(apiKey));
  const [loadError, setLoadError] = useState('');

  const hasTechCoords =
    technicianLocation &&
    typeof technicianLocation.latitude === 'number' &&
    typeof technicianLocation.longitude === 'number' &&
    Number.isFinite(technicianLocation.latitude) &&
    Number.isFinite(technicianLocation.longitude);

  const hasDestCoords =
    destinationLocation &&
    typeof destinationLocation.latitude === 'number' &&
    typeof destinationLocation.longitude === 'number' &&
    Number.isFinite(destinationLocation.latitude) &&
    Number.isFinite(destinationLocation.longitude);

  // Initialize Map
  useEffect(() => {
    if (!apiKey) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setLoadError('');

    loadGoogleMapsScript(apiKey)
      .then((maps) => {
        if (!isMounted || !mapContainerRef.current) return;

        // Default center: technician coordinates if available, destination, or India centroid
        const defaultCenter = hasTechCoords
          ? { lat: technicianLocation.latitude, lng: technicianLocation.longitude }
          : hasDestCoords
          ? { lat: destinationLocation.latitude, lng: destinationLocation.longitude }
          : { lat: 20.5937, lng: 78.9629 };

        const map = new maps.Map(mapContainerRef.current, {
          center: defaultCenter,
          zoom: hasTechCoords ? 15 : 12,
          disableDefaultUI: false,
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: true,
          styles: [
            { featureType: 'poi', stylers: [{ visibility: 'off' }] },
            { featureType: 'transit', stylers: [{ visibility: 'simplified' }] },
          ],
        });

        mapInstanceRef.current = map;
        setLoading(false);
      })
      .catch((err) => {
        if (isMounted) {
          setLoadError(err.message || 'Error loading Google Maps.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (techMarkerRef.current) {
        techMarkerRef.current.setMap(null);
        techMarkerRef.current = null;
      }
      if (destMarkerRef.current) {
        destMarkerRef.current.setMap(null);
        destMarkerRef.current = null;
      }
      mapInstanceRef.current = null;
    };
  }, [apiKey]);

  // Update or Create Technician Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google || !window.google.maps) return;

    if (hasTechCoords) {
      const pos = new window.google.maps.LatLng(technicianLocation.latitude, technicianLocation.longitude);

      if (!techMarkerRef.current) {
        // Create custom branded pin for technician
        const techPinSvg = {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: '#FF5A1F',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 3,
        };

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: `${technicianName} (Live GPS)`,
          icon: techPinSvg,
          animation: window.google.maps.Animation.DROP,
        });

        const infoWindow = new window.google.maps.InfoWindow({
          content: `<div style="font-family: sans-serif; padding: 4px;">
            <strong style="color: #111827;">${technicianName}</strong>
            <p style="margin: 2px 0 0; font-size: 11px; color: #6B7280;">Live Location</p>
          </div>`,
        });

        marker.addListener('click', () => {
          infoWindow.open(map, marker);
        });

        techMarkerRef.current = marker;
      } else {
        // Smoothly update marker position without reinitializing
        techMarkerRef.current.setPosition(pos);
      }

      // Smooth pan to technician
      map.panTo(pos);
    } else if (techMarkerRef.current) {
      techMarkerRef.current.setMap(null);
      techMarkerRef.current = null;
    }
  }, [hasTechCoords, technicianLocation?.latitude, technicianLocation?.longitude, technicianName]);

  // Destination Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !window.google || !window.google.maps) return;

    if (hasDestCoords) {
      const pos = new window.google.maps.LatLng(destinationLocation.latitude, destinationLocation.longitude);

      if (!destMarkerRef.current) {
        const destPinSvg = {
          path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: '#111827',
          fillOpacity: 1,
          strokeColor: '#FFFFFF',
          strokeWeight: 2,
        };

        const marker = new window.google.maps.Marker({
          position: pos,
          map,
          title: 'Service Address',
          icon: destPinSvg,
        });

        destMarkerRef.current = marker;
      } else {
        destMarkerRef.current.setPosition(pos);
      }
    }
  }, [hasDestCoords, destinationLocation?.latitude, destinationLocation?.longitude]);

  // If Google Maps API key is not configured, show informative, styled setup state
  if (!apiKey) {
    return (
      <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${className}`}>
        {/* Map Header Status */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 text-brand-accent flex items-center justify-center">
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-white leading-tight">Live Technician Location</h4>
              <p className="text-[11px] text-slate-400">GPS Stream Active</p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
              isSharing
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isSharing ? '● Sharing Live' : '○ Standby'}
          </span>
        </div>

        {/* Informative Map Card Fallback */}
        <div className="p-6 bg-slate-50/70 border-b border-slate-100 space-y-4">
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 text-xs text-amber-800">
            <Key className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Google Maps API Key Required for Visual Rendering</span>
              <p className="text-[11px] text-amber-700 mt-0.5 leading-relaxed">
                Add <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">VITE_GOOGLE_MAPS_API_KEY</code> to your <code className="bg-amber-100/80 px-1 py-0.5 rounded font-mono text-[10px]">client/.env</code> to render the live interactive Google Map.
                Real-time GPS coordinates are actively streaming through Socket.IO.
              </p>
            </div>
          </div>

          {/* Coordinates Inspection Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3 shadow-2xl shadow-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-brand-accent" />
                <span className="text-xs font-bold text-slate-800">Verified GPS Telemetry</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {technicianLocation?.updatedAt
                  ? `Updated ${new Date(technicianLocation.updatedAt).toLocaleTimeString()}`
                  : 'Awaiting first lock'}
              </span>
            </div>

            {hasTechCoords ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">Latitude</p>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                    {technicianLocation.latitude.toFixed(6)}°
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">Longitude</p>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                    {technicianLocation.longitude.toFixed(6)}°
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">Accuracy</p>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                    {technicianLocation.accuracy ? `±${Math.round(technicianLocation.accuracy)}m` : 'High'}
                  </p>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <p className="text-[10px] text-slate-400 font-medium">Speed</p>
                  <p className="font-mono font-bold text-slate-800 text-xs mt-0.5">
                    {technicianLocation.speed ? `${(technicianLocation.speed * 3.6).toFixed(1)} km/h` : 'Stopped'}
                  </p>
                </div>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="text-xs text-slate-500 font-medium">
                  {isSharing
                    ? 'Technician has started sharing. Acquiring GPS lock...'
                    : 'Technician has not enabled live location sharing yet.'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // If load error occurred with configured key
  if (loadError) {
    return (
      <div className={`bg-white rounded-2xl border border-rose-200 p-6 text-center space-y-3 ${className}`}>
        <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto" />
        <h4 className="text-sm font-bold text-slate-900">Map Rendering Failed</h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">{loadError}</p>
        <p className="text-[11px] text-slate-400">
          Ensure Maps JavaScript API is enabled in Google Cloud Console and billing is active.
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm relative ${className}`}>
      {/* Map Header Status */}
      <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-orange-500/20 text-brand-accent flex items-center justify-center">
            <Navigation className="w-3.5 h-3.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white leading-tight">Live Location Map</h4>
            <p className="text-[10px] text-slate-400">
              {hasTechCoords ? `${technicianName} en route` : 'Awaiting technician GPS'}
            </p>
          </div>
        </div>
        <span
          className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
            isSharing
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border-slate-700'
          }`}
        >
          {isSharing ? '● Live' : '○ Standby'}
        </span>
      </div>

      {/* Map Canvas */}
      <div className="relative w-full h-[320px] sm:h-[380px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full" />

        {loading && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-2 z-10">
            <RefreshCw className="w-6 h-6 text-brand-accent animate-spin" />
            <p className="text-xs font-semibold text-slate-600">Loading Google Maps...</p>
          </div>
        )}

        {!hasTechCoords && !loading && (
          <div className="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center p-4 pointer-events-none">
            <div className="bg-white/95 rounded-xl shadow-lg border border-slate-200 p-4 max-w-xs text-center space-y-1">
              <MapPin className="w-5 h-5 text-slate-400 mx-auto" />
              <p className="text-xs font-bold text-slate-800">Technician Position Pending</p>
              <p className="text-[11px] text-slate-500">
                {isSharing
                  ? 'Awaiting first GPS coordinate packet from device...'
                  : 'Technician will share location upon departing for your address.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer Info Strip */}
      {hasTechCoords && (
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Encrypted Socket.IO telemetry</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            {technicianLocation.updatedAt
              ? `Last updated ${new Date(technicianLocation.updatedAt).toLocaleTimeString()}`
              : 'Live'}
          </span>
        </div>
      )}
    </div>
  );
};

export default LiveTrackingMap;
