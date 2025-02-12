import { useState, useEffect } from 'react';

type PermissionType = 'geolocation' | 'deviceOrientation';
type PermissionStatus = 'granted' | 'denied' | 'prompt' | 'unavailable';

export function usePermissions(type: PermissionType) {
  const [status, setStatus] = useState<PermissionStatus>('prompt');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermission = async () => {
      try {
        if (type === 'geolocation') {
          if (!('geolocation' in navigator)) {
            setStatus('unavailable');
            setError('Geolocation is not supported by your browser');
            return;
          }

          if ('permissions' in navigator && 'query' in navigator.permissions) {
            const result = await navigator.permissions.query({ name: 'geolocation' });
            setStatus(result.state as PermissionStatus);

            result.addEventListener('change', () => {
              setStatus(result.state as PermissionStatus);
            });
          }
        } else if (type === 'deviceOrientation') {
          if (!('DeviceOrientationEvent' in window)) {
            setStatus('unavailable');
            setError('Device orientation is not supported by your browser');
            return;
          }

          // iOS requires explicit permission for device orientation
          if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
              const permission = await (DeviceOrientationEvent as any).requestPermission();
              setStatus(permission);
            } catch (err) {
              setStatus('denied');
              setError('Device orientation permission was denied');
            }
          } else {
            // Most browsers don't require explicit permission
            setStatus('granted');
          }
        }
      } catch (err) {
        setStatus('unavailable');
        setError('Error checking permissions');
      }
    };

    checkPermission();
  }, [type]);

  const requestPermission = async () => {
    try {
      if (type === 'deviceOrientation' && typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        const permission = await (DeviceOrientationEvent as any).requestPermission();
        setStatus(permission);
        return permission === 'granted';
      }
      return true;
    } catch (err) {
      setError('Failed to request permission');
      return false;
    }
  };

  return {
    status,
    error,
    requestPermission,
  };
}