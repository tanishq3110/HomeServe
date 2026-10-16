import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LiveTrackingMap } from '../components/maps/LiveTrackingMap';

describe('Frontend — LiveTrackingMap & GPS Telemetry Suite', () => {
  it('renders Google Maps missing-key banner when API key is not configured', () => {
    render(
      <LiveTrackingMap
        technicianLocation={null}
        destinationLocation={null}
        isSharing={false}
        technicianName="Vikram Singh"
      />
    );

    // Verify fallback notice explaining Google Maps key requirement
    expect(
      screen.getByText(/Google Maps API Key Required for Visual Rendering/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/VITE_GOOGLE_MAPS_API_KEY/i)).toBeInTheDocument();
  });

  it('renders standby state when technician is not yet streaming GPS', () => {
    render(
      <LiveTrackingMap
        technicianLocation={null}
        destinationLocation={{ latitude: 12.9716, longitude: 77.5946 }}
        isSharing={false}
        technicianName="Vikram Singh"
      />
    );

    expect(screen.getByText('○ Standby')).toBeInTheDocument();
    expect(
      screen.getByText(/Technician has not enabled live location sharing yet/i)
    ).toBeInTheDocument();
  });

  it('renders live coordinate telemetry and active status when technician streams GPS', () => {
    const mockLocation = {
      latitude: 12.9716,
      longitude: 77.5946,
      accuracy: 8,
      speed: 4.5,
      heading: 90,
      updatedAt: new Date().toISOString(),
    };

    render(
      <LiveTrackingMap
        technicianLocation={mockLocation}
        destinationLocation={{ latitude: 12.9716, longitude: 77.5946 }}
        isSharing={true}
        technicianName="Vikram Singh"
      />
    );

    // Status pill
    expect(screen.getByText('● Sharing Live')).toBeInTheDocument();

    // Telemetry grid
    expect(screen.getByText(/Verified GPS Telemetry/i)).toBeInTheDocument();
    expect(screen.getByText('12.971600°')).toBeInTheDocument();
    expect(screen.getByText('77.594600°')).toBeInTheDocument();
    expect(screen.getByText('±8m')).toBeInTheDocument();
    expect(screen.getByText('16.2 km/h')).toBeInTheDocument(); // 4.5 * 3.6 = 16.2
  });
});
