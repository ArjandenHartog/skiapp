"use client";
import { useState, useEffect } from 'react';
import { useClientSide } from '../hooks/useClientSide';
import { usePermissions } from '../hooks/usePermissions';
import LoadingSpinner from './LoadingSpinner';
import SpeedGraph from './SpeedGraph';
import { motion } from 'framer-motion';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import { LatLngTuple, LatLngExpression } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { TrophyIcon, FireIcon, SparklesIcon } from '@heroicons/react/24/solid';

// Add this function at the top of the file, before the SessionStats component
function formatDuration(seconds: number): string {
  if (!seconds) return '0:00';
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// Add this function near the top of the file, after imports
function getSlopeDifficulty(angle: number): { label: string; color: string } {
  if (angle <= 0) return { label: 'Vlak', color: 'text-gray-500' };
  if (angle < 15) return { label: 'Beginner (Groen)', color: 'text-green-500' };
  if (angle < 25) return { label: 'Gemiddeld (Blauw)', color: 'text-blue-500' };
  if (angle < 40) return { label: 'Gevorderd (Rood)', color: 'text-red-500' };
  return { label: 'Expert (Zwart)', color: 'text-gray-900' };
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  unlocked: boolean;
}

function SessionStats({ duration, distance, averageSpeed, maxSpeed, caloriesBurned }: { 
  duration: number;
  distance: number;
  averageSpeed: number;
  maxSpeed: number;
  caloriesBurned: number;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6"
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">Sessie Duur</p>
          <p className="text-2xl font-bold text-gray-900">{formatDuration(duration)}</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">Totale Afstand</p>
          <p className="text-2xl font-bold text-gray-900">{(distance / 1000).toFixed(2)} km</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">Gemiddelde Snelheid</p>
          <p className="text-2xl font-bold text-gray-900">{averageSpeed.toFixed(1)} km/u</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">Max Snelheid</p>
          <p className="text-2xl font-bold text-gray-900">{maxSpeed.toFixed(1)} km/u</p>
        </div>
        <div className="text-center p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-500 font-medium">Calorieën</p>
          <p className="text-2xl font-bold text-gray-900">{Math.round(caloriesBurned)} kcal</p>
        </div>
      </div>
    </motion.div>
  );
}

export default function SkiMetrics() {
  const isClient = useClientSide();
  const [speed, setSpeed] = useState<number>(0);
  const [altitude, setAltitude] = useState<number>(0);
  const [angle, setAngle] = useState<number>(0);
  const [locationError, setLocationError] = useState<string>('');
  const [retrying, setRetrying] = useState(false);
  const geolocation = usePermissions('geolocation');
  const orientation = usePermissions('deviceOrientation');
  const [maxSpeed, setMaxSpeed] = useState<number>(0);
  const [distance, setDistance] = useState<number>(0);
  const [lastPosition, setLastPosition] = useState<GeolocationCoordinates | null>(null);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [duration, setDuration] = useState<number>(0);
  const [averageSpeed, setAverageSpeed] = useState<number>(0);
  const [caloriesBurned, setCaloriesBurned] = useState<number>(0);
  const [speedHistory, setSpeedHistory] = useState<number[]>([]);
  const [timeLabels, setTimeLabels] = useState<string[]>([]);
  const [route, setRoute] = useState<LatLngTuple[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'speed30',
      title: 'Snelheidsduivel',
      description: 'Bereik een snelheid van 30 km/u',
      icon: <SparklesIcon className="w-8 h-8 text-yellow-500" />,
      unlocked: false
    },
    {
      id: 'distance5',
      title: 'Kilometervreter',
      description: 'Ski 5 kilometer in één sessie',
      icon: <TrophyIcon className="w-8 h-8 text-blue-500" />,
      unlocked: false
    },
    {
      id: 'calories500',
      title: 'Calorieverbrander',
      description: 'Verbrand 500 calorieën',
      icon: <FireIcon className="w-8 h-8 text-red-500" />,
      unlocked: false
    }
  ]);

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  };

  // Check achievements
  useEffect(() => {
    const newAchievements = [...achievements];
    let updated = false;

    if (maxSpeed >= 30 && !achievements.find(a => a.id === 'speed30')?.unlocked) {
      const index = newAchievements.findIndex(a => a.id === 'speed30');
      newAchievements[index].unlocked = true;
      updated = true;
    }

    if (distance >= 5000 && !achievements.find(a => a.id === 'distance5')?.unlocked) {
      const index = newAchievements.findIndex(a => a.id === 'distance5');
      newAchievements[index].unlocked = true;
      updated = true;
    }

    if (caloriesBurned >= 500 && !achievements.find(a => a.id === 'calories500')?.unlocked) {
      const index = newAchievements.findIndex(a => a.id === 'calories500');
      newAchievements[index].unlocked = true;
      updated = true;
    }

    if (updated) {
      setAchievements(newAchievements);
    }
  }, [maxSpeed, distance, caloriesBurned, achievements]);

  const startLocationTracking = async () => {
    try {
      setRetrying(true);
      if (!('geolocation' in navigator)) {
        setLocationError('Locatie tracking wordt niet ondersteund door je browser');
        return;
      }

      const permission = await navigator.permissions.query({ name: 'geolocation' });
      if (permission.state === 'denied') {
        setLocationError('Locatie toegang is geweigerd. Schakel locatie services in om je statistieken te volgen.');
        return;
      }

      navigator.geolocation.getCurrentPosition(
        () => {
          setLocationError('');
          setRetrying(false);
          setStartTime(new Date());
        },
        (error) => {
          console.error('Initial position error:', error);
          setLocationError('Kan je huidige locatie niet bepalen. Controleer je instellingen en probeer opnieuw.');
          setRetrying(false);
        },
        { timeout: 10000, enableHighAccuracy: true }
      );
    } catch (error) {
      console.error('Permission check failed:', error);
      setRetrying(false);
    }
  };

  const resetSession = () => {
    setMaxSpeed(0);
    setDistance(0);
    setStartTime(new Date());
    setDuration(0);
    setAverageSpeed(0);
    setCaloriesBurned(0);
    setSpeedHistory([]);
    setTimeLabels([]);
    setRoute([]);
  };

  useEffect(() => {
    if (!isClient) return;

    let watchId: number | null = null;
    let timerInterval: NodeJS.Timeout | null = null;

    const startTracking = async () => {
      try {
        if (!('geolocation' in navigator)) {
          setLocationError('Locatie tracking wordt niet ondersteund door je browser');
          return;
        }

        watchId = navigator.geolocation.watchPosition(
          (position) => {
            setLocationError('');
            const currentSpeed = position.coords.speed ? position.coords.speed * 3.6 : 0;
            setSpeed(currentSpeed);
            setMaxSpeed(prev => Math.max(prev, currentSpeed));
            setAltitude(position.coords.altitude || 0);

            // Update speed history
            const currentTime = new Date();
            setSpeedHistory(prev => [...prev, currentSpeed].slice(-20));
            setTimeLabels(prev => [...prev, currentTime.toLocaleTimeString()].slice(-20));

            // Update route
            setRoute(prev => [...prev, [position.coords.latitude, position.coords.longitude]]);

            if (lastPosition) {
              const newDistance = calculateDistance(
                lastPosition.latitude,
                lastPosition.longitude,
                position.coords.latitude,
                position.coords.longitude
              );
              setDistance(prev => prev + newDistance);
              
              // Bereken verbrande calorieën (schatting gebaseerd op intensiteit)
              const intensity = currentSpeed > 20 ? 8 : currentSpeed > 10 ? 6 : 4; // MET waarden voor verschillende ski intensiteiten
              const timeInHours = 1/3600; // tijd sinds laatste update (1 seconde)
              const weight = 75; // gemiddeld gewicht in kg
              const calories = intensity * weight * timeInHours;
              setCaloriesBurned(prev => prev + calories);
            }

            setLastPosition(position.coords);
            
            if (startTime) {
              const currentDuration = (new Date().getTime() - startTime.getTime()) / 1000; // in seconds
              setDuration(currentDuration);
              if (currentDuration > 0) {
                setAverageSpeed((distance / 1000) / (currentDuration / 3600)); // km/h
              }
            }
          },
          (error) => {
            console.error('Geolocation error:', {
              code: error.code,
              message: error.message
            });

            let errorMessage = 'Er is een onbekende fout opgetreden bij het ophalen van je locatie.';
            if (error instanceof GeolocationPositionError) {
              switch (error.code) {
                case 1:
                  errorMessage = 'Locatie toegang is geweigerd. Schakel locatie services in via je browser instellingen.';
                  break;
                case 2:
                  errorMessage = 'Locatie informatie is momenteel niet beschikbaar. Controleer je GPS signaal.';
                  break;
                case 3:
                  errorMessage = 'Locatie verzoek time-out. Controleer je internet verbinding en GPS signaal.';
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
        setLocationError('Kon locatie tracking niet starten. Vernieuw de pagina en probeer opnieuw.');
      }

      if (orientation.status === 'granted') {
        window.addEventListener('deviceorientation', handleOrientation);
      }

      // Update duration every second
      timerInterval = setInterval(() => {
        if (startTime) {
          const currentDuration = (new Date().getTime() - startTime.getTime()) / 1000;
          setDuration(currentDuration);
        }
      }, 1000);
    };

    const handleOrientation = (event: DeviceOrientationEvent) => {
      setAngle(event.beta || 0);
    };

    startTracking();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (timerInterval !== null) {
        clearInterval(timerInterval);
      }
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [isClient, geolocation.status, orientation.status, lastPosition, distance, startTime]);

  if (!isClient) {
    return (
      <div className="p-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border border-gray-200">
        <div className="flex flex-col items-center justify-center space-y-4">
          <LoadingSpinner size="lg" color="blue" />
          <p className="text-lg font-medium text-gray-700">Laden van ski statistieken...</p>
        </div>
      </div>
    );
  }

  if (locationError || orientation.error) {
    return (
      <div className="p-8 bg-white/95 backdrop-blur-sm rounded-xl shadow-xl border-2 border-red-200">
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
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex justify-between items-center mb-4">
        <motion.h1 
          initial={{ x: -20 }}
          animate={{ x: 0 }}
          className="text-2xl font-bold text-gray-900"
        >
          Ski Sessie
        </motion.h1>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={resetSession}
          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition-colors"
        >
          Sessie Resetten
        </motion.button>
      </div>

      <SessionStats 
        duration={duration}
        distance={distance}
        averageSpeed={averageSpeed}
        maxSpeed={maxSpeed}
        caloriesBurned={caloriesBurned}
      />

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Snelheid Geschiedenis</h2>
          <div className="h-64">
            <SpeedGraph data={speedHistory} labels={timeLabels} />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6"
        >
          <h2 className="text-lg font-semibold mb-4">Route</h2>
          {route.length > 0 && (
            <div className="h-64 rounded-lg overflow-hidden">
              <MapContainer
                center={route[route.length - 1] as LatLngExpression}
                zoom={15}
                scrollWheelZoom={false}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Polyline
                  positions={route}
                  pathOptions={{ color: 'blue', weight: 3 }}
                />
              </MapContainer>
            </div>
          )}
        </motion.div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      >
        <MetricCard
          title="Huidige Snelheid"
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
          value={`${angle.toFixed(1)}° - ${getSlopeDifficulty(Math.abs(angle)).label}`}
          color="purple"
          loading={orientation.status !== 'granted'}
          subValue={<span className={getSlopeDifficulty(Math.abs(angle)).color}>●</span>}
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white/95 backdrop-blur-sm rounded-xl shadow-lg p-6"
      >
        <h2 className="text-lg font-semibold mb-4">Prestaties</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <motion.div
              key={achievement.id}
              whileHover={{ scale: 1.02 }}
              className={`p-4 rounded-lg ${
                achievement.unlocked 
                  ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' 
                  : 'bg-gray-100 text-gray-500'
              }`}
            >
              <div className="flex items-center space-x-3">
                {achievement.icon}
                <div>
                  <h3 className={`font-semibold ${achievement.unlocked ? 'text-white' : 'text-gray-900'}`}>
                    {achievement.title}
                  </h3>
                  <p className={`text-sm ${achievement.unlocked ? 'text-blue-100' : 'text-gray-500'}`}>
                    {achievement.description}
                  </p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  color: 'blue' | 'emerald' | 'purple';
  loading?: boolean;
  subValue?: React.ReactNode;
}

function MetricCard({ title, value, color, loading, subValue }: MetricCardProps) {
  const colorClasses = {
    blue: 'from-blue-500 to-blue-700 shadow-blue-500/25 ring-blue-500/10',
    emerald: 'from-emerald-500 to-emerald-700 shadow-emerald-500/25 ring-emerald-500/10',
    purple: 'from-purple-500 to-purple-700 shadow-purple-500/25 ring-purple-500/10'
  };

  return (
    <div className={`relative p-6 rounded-xl bg-gradient-to-br ${colorClasses[color]} shadow-lg ring-1 backdrop-blur-sm transition-all group hover:scale-[1.02] hover:-translate-y-0.5 duration-300`}>
      <div className="relative z-10">
        <h2 className="text-base font-medium text-white/80 mb-1">{title}</h2>
        <div className="flex items-center gap-2">
          <p className="text-4xl font-bold text-white tracking-tight">{value}</p>
          {subValue && <span className="text-3xl">{subValue}</span>}
        </div>
        {loading && (
          <div className="flex items-center space-x-2 mt-3">
            <LoadingSpinner size="sm" color="white" />
            <p className="text-sm text-white/75">Wachtend op toestemming...</p>
          </div>
        )}
      </div>
      <div className="absolute inset-0 bg-white/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </div>
  );
}