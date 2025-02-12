"use client";
import { useState, useEffect } from 'react';
import { useClientSide } from '../hooks/useClientSide';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from './LoadingSpinner';

export default function SkiMetrics() {
  const isClient = useClientSide();
  const [speed, setSpeed] = useState<number>(0);
  const [altitude, setAltitude] = useState<number>(0);
  const [angle, setAngle] = useState<number>(0);
  const [locationError, setLocationError] = useState<string>('');
  const [retrying, setRetrying] = useState(false);
  const geolocation = usePermissions('geolocation');
  const orientation = usePermissions('deviceOrientation');

  const startLocationTracking = async () => {
    try {
      setRetrying(true);
      if (!('geolocation' in navigator)) {
        setLocationError('Geolocation is not supported by your browser');
        return;
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        setLocationError('Location access was denied. Please enable location services to track your metrics.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationError('');
          setRetrying(false);
        },
        (error) => {
          console.error('Initial position error:', error);
          setLocationError('Could not get your initial location. Please check your settings and try again.');
          setRetrying(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      setRetrying(false);
    }
  };

  useEffect(() => {
    if (!isClient) return;

    let watchId: number | null = null;

    const startTracking = async () => {
      try {
        if (!('geolocation' in navigator)) {
          setLocationError('Geolocation is not supported by your browser');
          return;
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setLocationError('');
            setSpeed(position.coords.speed ? position.coords.speed * 3.6 : 0);
            setAltitude(position.coords.altitude || 0);
          },
          (error) => {
            console.error('Geolocation error:', {
              code: error.code,
              message: error.message
            });

            let errorMessage = 'An unknown error occurred while getting location.';
            if (error instanceof GeolocationPositionError) {
              switch (error.code) {
                case 1:
                  errorMessage = 'Location access was denied. Please enable location services in your browser settings.';
                  break;
                case 2:
                  errorMessage = 'Location information is currently unavailable. Please check your GPS signal.';
                  break;
                case 3:
                  errorMessage = 'Location request timed out. Please check your internet connection and GPS signal.';
                  break;
              }
            }
            setLocationError(errorMessage);
          },
          {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 10000
          }
        );
      } catch (error) {
        console.error('Error starting location tracking:', error);
        setLocationError('Failed to start location tracking. Please refresh and try again.');
      }

      if (orientation.status === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
      }
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setAngle(event.beta || 0);
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isClient, geolocation.status, orientation.status]);

  if (!isClient) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-xl border border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner size="lg" color="blue" />
          <p className="text-lg font-medium text-gray-700">Laden van ski metrics...</p>
        </div>
      </div>
    );
  }

  if (locationError || orientation.error) {
    return (
      <div className="p-8 bg-white rounded-xl shadow-xl border-2 border-red-200">
        <div className="text-center space-y-6">
          {locationError && (
            <div className="space-y-4">
              <div className="inline-flex items-center justify-center px-4 py-2 bg-red-50 rounded-lg">
                <svg className="w-6 h-6 text-red-600 mr-2" fill="none" strokeWidth="1.5" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
                <p className="text-lg font-medium text-red-700">{locationError}</p>
              </div>
              {geolocation.status === 'denied' && (
                <div className="p-6 bg-gray-50 rounded-xl border border-gray-200">
                  <p className="font-semibold text-gray-900 mb-3">Om locatie tracking in te schakelen:</p>
                  <ol className="text-gray-700 space-y-3 list-decimal list-inside">
                    <li className="pl-2">Klik op het slot/info icoon in de adresbalk van je browser</li>
                    <li className="pl-2">Zoek "Locatie" in de site-instellingen</li>
                    <li className="pl-2">Verander de toestemming naar "Toestaan"</li>
                  </ol>
                </div>
              )}
              <button
                onClick={startLocationTracking}
                disabled={retrying}
                className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow"
              >
                {retrying ? (
                  <>
                    <LoadingSpinner size="sm" color="white" />
                    <span className="ml-2">Opnieuw proberen...</span>
                  </>
                ) : (
                  'Opnieuw proberen'
                )}
              </button>
            </div>
          )}
          {orientation.error && (
            <p className="text-red-700 font-medium bg-red-50 px-4 py-2 rounded-lg inline-block">{orientation.error}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-3">
        <MetricCard
          title="Snelheid"
          value={`${speed.toFixed(1)} km/u`}
          color="blue"
          loading={geolocation.status !== 'granted'}
        />
        <MetricCard
          title="Hoogte"
          value={`${altitude.toFixed(1)} m`}
          color="emerald"
          loading={geolocation.status !== 'granted'}
        />
        <MetricCard
          title="Helling"
          value={`${angle.toFixed(1)}°`}
          color="purple"
          loading={orientation.status !== 'granted'}
        />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  color: 'blue' | 'emerald' | 'purple';
  loading?: boolean;
}

function MetricCard({ title, value, color, loading }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-600 shadow-blue-500/25',
    emerald: 'from-emerald-500 to-emerald-600 shadow-emerald-500/25',
    purple: 'from-purple-500 to-purple-600 shadow-purple-500/25'
  };

  return (
    <div className={`p-6 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg transition-all`}>
      <h2 className="text-lg font-medium text-white/90 mb-1">{title}</h2>
      <p className="text-3xl font-bold text-white tracking-tight">{value}</p>
      {loading && (
        <div className="flex items-center space-x-2 mt-3">
          <LoadingSpinner size="sm" color="white" />
          <p className="text-sm text-white/75">Wachtend op toestemming...</p>
        </div>
      )}
    </div>
  );
}