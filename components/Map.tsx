'use client';

import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { HUBS } from '@/constants/hubs';
import { ActiveTruck } from '@/types/delivery';

const createVehicleIcon = (isUserOrder: boolean = false) =>
  L.divIcon({
    className: 'custom-vehicle-icon',
    html: `
      <div class="relative flex items-center justify-center w-6 h-6">
        <span class="animate-ping absolute inline-flex h-full w-full rounded-full ${
          isUserOrder ? 'bg-emerald-400 opacity-75' : 'bg-cyan-400 opacity-40'
        }"></span>
        <div class="relative w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
          isUserOrder ? 'bg-emerald-400 shadow-[0_0_12px_#34d399]' : 'bg-cyan-400 shadow-[0_0_8px_#22d3ee]'
        }"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });

const createHubIcon = (type: string, name: string) =>
  L.divIcon({
    className: 'custom-hub-icon',
    html: `
      <div class="group relative flex items-center gap-2 cursor-pointer">
        <div class="w-3.5 h-3.5 rounded-sm border border-slate-300 transition-transform group-hover:scale-125 ${
          type === 'factory'
            ? 'bg-amber-500 shadow-[0_0_10px_#f59e0b]'
            : type === 'warehouse'
            ? 'bg-indigo-500 shadow-[0_0_10px_#6366f1]'
            : 'bg-emerald-400 shadow-[0_0_10px_#34d399]'
        }"></div>
        <span class="text-[10px] font-mono tracking-wider font-semibold uppercase text-slate-200 bg-slate-900/95 px-2 py-0.5 rounded border border-slate-700/80 whitespace-nowrap shadow-md">
          ${name}
        </span>
      </div>
    `,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

interface MapProps {
  trucks?: ActiveTruck[];
}

export default function LogisticsMap({ trucks = [] }: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  const vehicleMarkersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const vehicleRoutesRef = useRef<globalThis.Map<string, L.Polyline>>(new globalThis.Map());

  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
    }).setView([55.751244, 37.618423], 10);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Отрисовка филиалов
    HUBS.forEach((hub) => {
      const typeLabel =
        hub.type === 'factory'
          ? 'Производственный комплекс'
          : hub.type === 'warehouse'
          ? 'Логистический хаб'
          : 'Торговый филиал';

      const popupContent = `
        <div class="p-1 font-sans text-slate-100 min-w-50">
          <div class="mb-2 border-b border-slate-700/80 pb-2">
            <span class="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold block mb-0.5">
              ${typeLabel}
            </span>
            <h3 class="font-bold text-xs text-slate-100 leading-snug">${hub.name}</h3>
          </div>
          
          <div class="flex flex-col gap-1.5 mt-3">
            <a 
              href="${hub.websiteUrl || '#'}" 
              target="_blank" 
              rel="noopener noreferrer"
              class="w-full text-center bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600/80 font-mono text-[11px] font-semibold py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5 no-underline"
            >
              <span>🌐</span> Главный сайт
            </a>
            
            <a 
              href="${hub.adminUrl || '#'}" 
              class="w-full text-center bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono text-[11px] font-bold py-1.5 px-2 rounded transition flex items-center justify-center gap-1.5 no-underline shadow-sm"
            >
              <span>⚙️</span> Панель управления
            </a>
          </div>
        </div>
      `;

      L.marker(hub.coords, { icon: createHubIcon(hub.type, hub.name) })
        .addTo(map)
        .bindPopup(popupContent, {
          className: 'dark-custom-popup',
          closeButton: false,
        });
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const safeTrucks = trucks || [];
    const activeIds = new Set(safeTrucks.map((t) => t.id));

    vehicleMarkersRef.current.forEach((marker, id) => {
      if (!activeIds.has(id)) {
        map.removeLayer(marker);
        vehicleMarkersRef.current.delete(id);
      }
    });

    vehicleRoutesRef.current.forEach((polyline, id) => {
      if (!activeIds.has(id)) {
        map.removeLayer(polyline);
        vehicleRoutesRef.current.delete(id);
      }
    });

    safeTrucks.forEach((truck) => {
      const isUser = !!truck.isUserOrder;

      if (!vehicleRoutesRef.current.has(truck.id) && truck.route && truck.route.length > 0) {
        const polyline = L.polyline(truck.route, {
          color: isUser ? '#34d399' : '#38bdf8',
          weight: isUser ? 3 : 1.5,
          opacity: isUser ? 0.9 : 0.4,
          dashArray: isUser ? undefined : '4, 6',
        }).addTo(map);

        vehicleRoutesRef.current.set(truck.id, polyline);
      }

      const existingMarker = vehicleMarkersRef.current.get(truck.id);

      if (!existingMarker) {
        const marker = L.marker(truck.currentPosition, {
          icon: createVehicleIcon(isUser),
        })
          .addTo(map)
          .bindPopup(`
            <div class="font-mono text-xs">
              <div class="font-bold text-slate-800">Борт: ${truck.id}</div>
              <div class="${isUser ? 'text-emerald-600 font-bold' : 'text-slate-500'}">
                ${isUser ? 'ПРИОРИТЕТНЫЙ РЕЙС' : 'Стандартная доставка'}
              </div>
            </div>
          `);

        vehicleMarkersRef.current.set(truck.id, marker);
      } else {
        existingMarker.setLatLng(truck.currentPosition);
      }
    });
  }, [trucks]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full z-0 bg-slate-950"
      style={{
        background: 'linear-gradient(to bottom, #020617, #0f172a)',
      }}
    />
  );
}