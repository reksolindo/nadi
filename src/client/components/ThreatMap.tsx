import React, { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import {
  Shield,
  ShieldAlert,
  Globe,
  Crosshair,
  Radio,
  Zap,
  Lock,
  Activity,
  Maximize2,
  RefreshCw,
  Navigation,
} from 'lucide-react';
import type { ThreatMapSummary, AttackEvent } from '../../server/types.js';

interface ThreatMapProps {
  threatMap?: ThreatMapSummary;
  onRefresh?: () => void;
}

// Calculate curved trajectory points between attacker and Jakarta target
function getCurvedTrajectory(
  start: [number, number],
  end: [number, number],
  steps = 30
): [number, number][] {
  const points: [number, number][] = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const dist = Math.sqrt(dLat * dLat + dLng * dLng);

  // Curve upward to create realistic great-circle cyber trajectory
  const curveOffset = Math.min(25, Math.max(5, dist * 0.18));
  const controlLat = midLat + curveOffset;
  const controlLng = midLng - (dLat > 0 ? 1 : -1) * (dist * 0.05);

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const lat =
      (1 - t) * (1 - t) * lat1 + 2 * (1 - t) * t * controlLat + t * t * lat2;
    const lng =
      (1 - t) * (1 - t) * lng1 + 2 * (1 - t) * t * controlLng + t * t * lng2;
    points.push([lat, lng]);
  }
  return points;
}

export const ThreatMap: React.FC<ThreatMapProps> = ({ threatMap, onRefresh }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const [activePortFilter, setActivePortFilter] = useState<number | null>(null);

  const attacks = threatMap?.activeAttacks || [];
  const topCountries = threatMap?.topCountries || [];
  const topPorts = threatMap?.topTargetPorts || [];

  const filteredAttacks = activePortFilter
    ? attacks.filter((a) => a.targetPort === activePortFilter)
    : attacks;

  const targetCoords: [number, number] = [-6.2088, 106.8456]; // Jakarta, Indonesia

  const getPortColor = (port: number) => {
    switch (port) {
      case 8291:
        return {
          stroke: '#f43f5e',
          glow: 'rgba(244, 63, 94, 0.7)',
          text: 'text-rose-400',
          bg: 'bg-rose-500/10 border-rose-500/20',
          name: 'Winbox',
        };
      case 22:
        return {
          stroke: '#f97316',
          glow: 'rgba(249, 115, 22, 0.7)',
          text: 'text-orange-400',
          bg: 'bg-orange-500/10 border-orange-500/20',
          name: 'SSH',
        };
      case 80:
      case 443:
      case 8080:
        return {
          stroke: '#38bdf8',
          glow: 'rgba(56, 189, 248, 0.7)',
          text: 'text-sky-400',
          bg: 'bg-sky-500/10 border-sky-500/20',
          name: 'WebFig',
        };
      case 8728:
      case 8729:
        return {
          stroke: '#c084fc',
          glow: 'rgba(192, 132, 252, 0.7)',
          text: 'text-purple-400',
          bg: 'bg-purple-500/10 border-purple-500/20',
          name: 'API',
        };
      case 3389:
        return {
          stroke: '#facc15',
          glow: 'rgba(250, 204, 21, 0.7)',
          text: 'text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          name: 'RDP',
        };
      default:
        return {
          stroke: '#2dd4bf',
          glow: 'rgba(45, 212, 191, 0.7)',
          text: 'text-teal-400',
          bg: 'bg-teal-500/10 border-teal-500/20',
          name: 'Other',
        };
    }
  };

  // Initialize Leaflet map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [20, 45],
      zoom: 2.2,
      minZoom: 1.8,
      maxZoom: 12,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
    });

    // ESRI ArcGIS World Dark Gray Base (100% Free, No API Key Required)
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
        attribution: 'Esri, HERE, Garmin, © OpenStreetMap contributors',
      }
    ).addTo(map);

    // ESRI ArcGIS World Dark Gray Reference (Labels & Country Boundaries)
    L.tileLayer(
      'https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
      {
        maxZoom: 16,
      }
    ).addTo(map);

    // Dedicated layer group for attack lasers and beacons
    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update map overlays whenever attacks or filter changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    layerGroup.clearLayers();

    // 1. Target Gateway Router Marker (Jakarta, Indonesia)
    const targetIcon = L.divIcon({
      className: 'target-node-marker',
      html: `
        <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 44px; height: 44px;">
          <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(16, 185, 129, 0.3); animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
          <div style="position: absolute; width: 22px; height: 22px; border-radius: 50%; background: rgba(16, 185, 129, 0.5); animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
          <div style="width: 12px; height: 12px; border-radius: 50%; background: #10b981; border: 2px solid #0f172a; box-shadow: 0 0 16px #10b981;"></div>
          <div style="position: absolute; top: 32px; white-space: nowrap; padding: 2px 8px; border-radius: 6px; background: rgba(15, 23, 42, 0.95); border: 1px solid rgba(16, 185, 129, 0.5); font-size: 9px; font-weight: 800; color: #10b981; font-family: monospace; box-shadow: 0 4px 12px rgba(0,0,0,0.8); pointer-events: none;">
            🇮🇩 GATEWAY ROUTER (JKT)
          </div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
    });

    const targetMarker = L.marker(targetCoords, { icon: targetIcon });
    targetMarker.bindPopup(`
      <div style="font-family: monospace; font-size: 11px; padding: 6px; color: #e2e8f0; background: #090d16; border-radius: 8px; border: 1px solid #1e293b;">
        <div style="font-weight: bold; color: #10b981; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
          <span>🇮🇩</span> Target Gateway Router
        </div>
        <div>Location: Jakarta, Indonesia</div>
        <div>Coordinates: -6.2088°, 106.8456°</div>
        <div>Firewall: RouterOS Active Dropper</div>
        <div style="color: #10b981; font-weight: bold; margin-top: 4px;">Status: PROTECTED (100% INTRUSIONS BLOCKED)</div>
      </div>
    `);
    layerGroup.addLayer(targetMarker);

    // 2. Render Active Attacker Nodes & Glowing Ballistic Laser Arcs
    const activeAttacksToRender = filteredAttacks.slice(0, 16);

    interface ActivePhotonTracker {
      marker: L.CircleMarker;
      trajectory: [number, number][];
      duration: number;
      offset: number;
    }

    const photonTrackers: ActivePhotonTracker[] = [];

    activeAttacksToRender.forEach((atk, index) => {
      const colorInfo = getPortColor(atk.targetPort);
      const startCoords: [number, number] = [atk.lat, atk.lng];

      // A. Curved Ballistic Trajectory Points
      const trajectoryPoints = getCurvedTrajectory(startCoords, targetCoords, 50);

      // B. Subtle Static Background Guide Trail
      const trailLine = L.polyline(trajectoryPoints, {
        color: colorInfo.stroke,
        weight: 1.5,
        opacity: 0.25,
        className: 'cyber-laser-trail',
      });
      layerGroup.addLayer(trailLine);

      // C. Animated Cyber Laser Flight Beam (Dashing line)
      const laserLine = L.polyline(trajectoryPoints, {
        color: colorInfo.stroke,
        weight: 2.5,
        opacity: 0.85,
        dashArray: '8 14',
        className: 'cyber-laser-beam',
      });

      laserLine.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; padding: 6px; color: #e2e8f0; background: #090d16; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="font-weight: bold; color: #f43f5e; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 4px;">
            🚨 Intercepted Intrusion Vector
          </div>
          <div>Origin: ${atk.city || 'Unknown'}, ${atk.countryName} ${atk.flagEmoji}</div>
          <div>Attacker IP: <b style="color: #fff;">${atk.sourceIp}</b></div>
          <div>Target: <b style="color: #f43f5e;">Port ${atk.targetPort} (${atk.targetService})</b></div>
          <div>Protocol: ${atk.protocol}</div>
          <div style="color: #10b981; font-weight: bold; margin-top: 4px;">Firewall Action: BLOCKED / DROP</div>
        </div>
      `);
      layerGroup.addLayer(laserLine);

      // D. Origin Attacker Node Marker (Pulsing glowing dot)
      const attackerIcon = L.divIcon({
        className: 'attacker-node-marker',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 30px; height: 30px; cursor: pointer;">
            <div style="position: absolute; width: 24px; height: 24px; border-radius: 50%; background: ${colorInfo.stroke}; opacity: 0.35; animation: ping 2s cubic-bezier(0, 0, 0.2, 1) infinite; animation-delay: ${index * 0.2}s;"></div>
            <div style="width: 8px; height: 8px; border-radius: 50%; background: ${colorInfo.stroke}; border: 1.5px solid #090d16; box-shadow: 0 0 10px ${colorInfo.stroke};"></div>
          </div>
        `,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      });

      const attackerMarker = L.marker(startCoords, { icon: attackerIcon });
      attackerMarker.bindPopup(`
        <div style="font-family: monospace; font-size: 11px; padding: 6px; color: #e2e8f0; background: #090d16; border-radius: 8px; border: 1px solid #1e293b;">
          <div style="font-weight: bold; color: ${colorInfo.stroke}; border-bottom: 1px solid #1e293b; padding-bottom: 4px; margin-bottom: 4px; display: flex; align-items: center; gap: 4px;">
            <span>${atk.flagEmoji}</span> ${atk.countryName} (${atk.city || 'Origin'})
          </div>
          <div>Attacker IP: <b style="color: #fff;">${atk.sourceIp}</b></div>
          <div>Target Port: <b style="color: #f43f5e;">${atk.targetPort} (${atk.targetService})</b></div>
          <div>Protocol: ${atk.protocol}</div>
          <div>Time: ${atk.timeStr}</div>
          <div style="color: #10b981; font-weight: bold; margin-top: 4px;">STATUS: BLOCKED</div>
        </div>
      `);
      layerGroup.addLayer(attackerMarker);

      // E. Guided Ballistic Missile with animated flame and dynamic flight heading
      const missileIcon = L.divIcon({
        className: 'cyber-missile-marker',
        html: `
          <div class="missile-sprite-wrapper" style="width: 36px; height: 20px; display: flex; align-items: center; justify-content: center; transform-origin: 18px 10px; pointer-events: none;">
            <svg width="36" height="20" viewBox="0 0 36 20" style="overflow: visible; filter: drop-shadow(0 0 8px ${colorInfo.stroke});">
              <!-- Jet Thrust Flame Plume with High-Speed Flicker -->
              <polygon points="0,10 9,6 12,10 9,14" fill="#ff3b30">
                <animate attributeName="points" values="0,10 9,6 12,10 9,14; -6,10 9,5 13,10 9,15; 0,10 9,6 12,10 9,14" dur="0.12s" repeatCount="indefinite" />
              </polygon>
              <polygon points="3,10 8,7 11,10 8,13" fill="#ffcc00">
                <animate attributeName="points" values="3,10 8,7 11,10 8,13; 0,10 8,6 12,10 8,14; 3,10 8,7 11,10 8,13" dur="0.12s" repeatCount="indefinite" />
              </polygon>
              
              <!-- Rear Guidance Fins -->
              <polygon points="10,6 5,1 15,6" fill="${colorInfo.stroke}" stroke="#090d16" stroke-width="0.8" />
              <polygon points="10,14 5,19 15,14" fill="${colorInfo.stroke}" stroke="#090d16" stroke-width="0.8" />
              
              <!-- Missile Fuselage -->
              <path d="M 8 6 L 24 6 Q 32 10 24 14 L 8 14 Z" fill="#f8fafc" stroke="#090d16" stroke-width="0.8" />
              
              <!-- Warhead Cone -->
              <path d="M 23 6 Q 34 10 23 14 Z" fill="${colorInfo.stroke}" />
              
              <!-- Center Strike Stripe -->
              <line x1="16" y1="6" x2="16" y2="14" stroke="${colorInfo.stroke}" stroke-width="1.5" />
            </svg>
          </div>
        `,
        iconSize: [36, 20],
        iconAnchor: [18, 10],
      });

      const missileMarker = L.marker(startCoords, {
        icon: missileIcon,
        interactive: false,
      });
      layerGroup.addLayer(missileMarker);

      photonTrackers.push({
        marker: missileMarker as any,
        trajectory: trajectoryPoints,
        duration: 2400 + (index % 4) * 400,
        offset: index * 350,
      });
    });

    // Real-time animation loop for flying attack ballistic missiles
    let animFrameId: number;

    const animatePhotons = (timestamp: number) => {
      photonTrackers.forEach((tracker) => {
        const elapsed = (timestamp + tracker.offset) % tracker.duration;
        const progress = elapsed / tracker.duration;
        const pointIdx = Math.min(
          tracker.trajectory.length - 1,
          Math.floor(progress * tracker.trajectory.length)
        );
        const nextIdx = Math.min(tracker.trajectory.length - 1, pointIdx + 1);

        const curr = tracker.trajectory[pointIdx];
        const next = tracker.trajectory[nextIdx];

        // Compute heading rotation angle in degrees
        const dLat = next[0] - curr[0];
        const dLng = next[1] - curr[1];
        const angleDeg = (Math.atan2(-dLat, dLng) * 180) / Math.PI;

        tracker.marker.setLatLng(curr);

        const el = tracker.marker.getElement();
        if (el) {
          const inner = el.querySelector('.missile-sprite-wrapper') as HTMLElement | null;
          if (inner) {
            inner.style.transform = `rotate(${angleDeg}deg)`;
          }
        }
      });
      animFrameId = requestAnimationFrame(animatePhotons);
    };

    animFrameId = requestAnimationFrame(animatePhotons);

    return () => {
      cancelAnimationFrame(animFrameId);
    };
  }, [filteredAttacks]);

  // Reset Map View to default world view
  const handleResetView = () => {
    mapInstanceRef.current?.setView([20, 45], 2.2, { animate: true });
  };

  // Focus Map View directly to Jakarta
  const handleFocusJakarta = () => {
    mapInstanceRef.current?.setView(targetCoords, 5, { animate: true });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="bg-slate-900/80 border border-rose-500/20 rounded-2xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Blocked Attacks (24h)</span>
            <ShieldAlert className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold text-white font-mono-num mt-1.5">
            {threatMap?.totalAttacks24h?.toLocaleString('en-US') || 0}
          </div>
          <div className="flex items-center space-x-1.5 text-[11px] text-emerald-400 mt-1 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span>100% Blocked by Firewall</span>
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Top Origin Country</span>
            <Globe className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-white font-mono-num mt-1.5 truncate">
            {topCountries[0]?.flagEmoji} {topCountries[0]?.countryName || 'Global'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono-num">
            {topCountries[0]?.percentage || 0}% of all intrusions
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Most Targeted Port</span>
            <Crosshair className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-orange-400 font-mono-num mt-1.5 truncate">
            {topPorts[0]?.service || 'Port 8291'}
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono-num">
            {topPorts[0]?.count || 0} probing attempts
          </div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold uppercase tracking-wider">
            <span>Router Node Status</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono-num mt-1.5 flex items-center space-x-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>PROTECTED</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 font-mono-num">
            RouterOS Firewall Active
          </div>
        </div>
      </div>

      {/* Main Realistic Cyber Threat Radar Map */}
      <div className="relative bg-slate-950 border border-slate-800/80 rounded-2xl overflow-hidden shadow-2xl">
        {/* Radar Map Top Control Header */}
        <div className="p-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-950/95 backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 animate-pulse">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm sm:text-base font-extrabold text-white tracking-wide">
                  REAL-TIME CYBER THREAT RADAR MAP
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold tracking-wider animate-pulse">
                  LIVE INTERCEPT
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Worldwide real-time intrusion map matching AwanPintar & Enterprise SOC standards
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* Quick Port Filter Buttons */}
            <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setActivePortFilter(null)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  activePortFilter === null
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All
              </button>
              {topPorts.slice(0, 4).map((p) => (
                <button
                  key={p.port}
                  onClick={() =>
                    setActivePortFilter(activePortFilter === p.port ? null : p.port)
                  }
                  className={`px-2 py-1 rounded-lg font-mono-num font-medium transition-all text-[11px] ${
                    activePortFilter === p.port
                      ? 'bg-rose-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  :{p.port}
                </button>
              ))}
            </div>

            {/* Map Action Buttons */}
            <button
              onClick={handleResetView}
              title="Reset World View"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all text-xs flex items-center space-x-1"
            >
              <Globe className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">World</span>
            </button>

            <button
              onClick={handleFocusJakarta}
              title="Focus on Gateway Router"
              className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 transition-all text-xs flex items-center space-x-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gateway</span>
            </button>

            {onRefresh && (
              <button
                onClick={onRefresh}
                title="Refresh Threat Feed"
                className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition-all"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative w-full h-[420px] sm:h-[500px] bg-slate-950">
          <div ref={mapContainerRef} className="w-full h-full z-0" />

          {/* Map Legend Overlay */}
          <div className="absolute bottom-3 left-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-[10px] space-y-1.5 shadow-2xl hidden sm:block">
            <div className="text-slate-400 font-bold uppercase tracking-wider">
              Attack Classification:
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 font-medium">
              <div className="flex items-center space-x-1.5 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e]"></span>
                <span>Winbox (:8291)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-orange-400">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-[0_0_8px_#f97316]"></span>
                <span>SSH (:22)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-sky-400">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]"></span>
                <span>WebFig (:80/443)</span>
              </div>
              <div className="flex items-center space-x-1.5 text-purple-400">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]"></span>
                <span>API (:8728)</span>
              </div>
            </div>
          </div>

          {/* Live Activity Badge */}
          <div className="absolute top-3 right-3 z-10 bg-slate-950/90 backdrop-blur-md border border-slate-800 px-3 py-1.5 rounded-xl text-xs font-mono-num flex items-center space-x-2 text-slate-300 shadow-xl">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            <span>{filteredAttacks.length} Active Intrusions Rendered</span>
          </div>
        </div>
      </div>

      {/* Leaderboard & Live Attack Feed Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Top Attacking Countries & Targeted Ports */}
        <div className="space-y-4">
          {/* Top Origin Countries */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>Top Origin Countries</span>
              </h4>
              <span className="text-[10px] text-slate-500 font-mono-num">
                Global Share
              </span>
            </div>

            <div className="space-y-2.5">
              {topCountries.map((c) => (
                <div key={c.countryCode} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center space-x-2 text-slate-200">
                      <span>{c.flagEmoji}</span>
                      <span>{c.countryName}</span>
                    </div>
                    <span className="font-mono-num text-slate-400">
                      {c.percentage}% ({c.count})
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, c.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Targeted Services */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center space-x-1.5">
              <Crosshair className="w-3.5 h-3.5 text-orange-400" />
              <span>Targeted Ports & Services</span>
            </h4>

            <div className="space-y-2">
              {topPorts.map((p) => {
                const colorInfo = getPortColor(p.port);
                return (
                  <div
                    key={p.port}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs"
                  >
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-1.5 py-0.5 rounded font-mono-num font-bold text-[10px] ${colorInfo.bg} ${colorInfo.text}`}
                      >
                        :{p.port}
                      </span>
                      <span className="font-semibold text-slate-200">
                        {p.service}
                      </span>
                    </div>
                    <span className="font-mono-num font-bold text-slate-400">
                      {p.percentage}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Live Attack Stream Table */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-sm space-y-3 flex flex-col">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-rose-400 animate-pulse" />
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Live Attack Intercept Feed (RouterOS Firewall Log)
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono-num">
              Showing {filteredAttacks.length} recent intercepts
            </span>
          </div>

          <div className="flex-1 overflow-x-auto border border-slate-800/80 rounded-xl overflow-y-auto max-h-[380px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800 sticky top-0 z-10">
                <tr>
                  <th className="py-2.5 px-3">Time</th>
                  <th className="py-2.5 px-3">Attacker Origin (IP & Country)</th>
                  <th className="py-2.5 px-3">Target Port & Service</th>
                  <th className="py-2.5 px-3">Protocol</th>
                  <th className="py-2.5 px-3 text-right">Firewall Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAttacks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No intrusion attempts detected with current filter
                    </td>
                  </tr>
                ) : (
                  filteredAttacks.map((atk) => {
                    const colorInfo = getPortColor(atk.targetPort);
                    return (
                      <tr
                        key={atk.id}
                        className="hover:bg-slate-800/40 transition-colors"
                      >
                        <td className="py-2.5 px-3 font-mono-num text-slate-400 text-[11px]">
                          {atk.timeStr}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span>{atk.flagEmoji}</span>
                            <span className="font-bold text-white font-mono-num">
                              {atk.sourceIp}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono-num">
                            {atk.city}, {atk.countryName}
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center space-x-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded font-mono-num font-bold text-[10px] ${colorInfo.bg} ${colorInfo.text}`}
                            >
                              :{atk.targetPort}
                            </span>
                            <span className="font-medium text-slate-200 text-[11px]">
                              {atk.targetService}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono-num text-[11px] text-slate-300">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold">
                            {atk.protocol}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono-num">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold">
                            <Lock className="w-3 h-3" />
                            <span>BLOCKED / DROP</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
