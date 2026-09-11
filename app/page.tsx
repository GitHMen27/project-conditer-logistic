'use client';

import { useState, useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import { HUBS } from '@/constants/hubs';
import { ActiveTruck } from '@/types/delivery';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center text-slate-400 font-mono text-xs gap-2">
      <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span>Загрузка геоинформационной системы...</span>
    </div>
  ),
});

async function fetchRoute(startCoords: [number, number], endCoords: [number, number]): Promise<[number, number][]> {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startCoords[1]},${startCoords[0]};${endCoords[1]},${endCoords[0]}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.routes?.[0]?.geometry?.coordinates) {
      return data.routes[0].geometry.coordinates.map((c: [number, number]) => [c[1], c[0]]);
    }
  } catch (e) {
    console.error('Ошибка OSRM API:', e);
  }
  return [startCoords, endCoords];
}

export default function Home() {
  const [trucks, setTrucks] = useState<ActiveTruck[]>([]);
  const [fromHub, setFromHub] = useState(HUBS[0].id);
  const [toHub, setToHub] = useState(HUBS[3]?.id || HUBS[1].id);
  const [userOrdersCount, setUserOrdersCount] = useState(0);

  const animFrameRef = useRef<number | null>(null);

  // 1. Генератор автоматического трафика
  useEffect(() => {
    let isMounted = true;

    const createTruck = async () => {
      const randomFrom = HUBS[Math.floor(Math.random() * HUBS.length)];
      let randomTo = HUBS[Math.floor(Math.random() * HUBS.length)];
      while (randomTo.id === randomFrom.id) {
        randomTo = HUBS[Math.floor(Math.random() * HUBS.length)];
      }

      const route = await fetchRoute(randomFrom.coords, randomTo.coords);
      if (!isMounted) return;

      const newTruck: ActiveTruck = {
        id: `SYS-${Math.floor(100 + Math.random() * 900)}`,
        fromHubId: randomFrom.id,
        toHubId: randomTo.id,
        route,
        currentPosition: route[0],
        progress: 0,
        duration: 14000 + Math.random() * 6000,
        startTime: Date.now(),
        isUserOrder: false,
      };

      setTrucks((prev) => (prev.length < 5 ? [...prev, newTruck] : prev));
    };

    createTruck();
    const interval = setInterval(createTruck, 7000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  // 2. Единый кадр анимации перемещения
  useEffect(() => {
    const updatePositions = () => {
      const now = Date.now();

      setTrucks((prevTrucks) =>
        prevTrucks
          .map((truck) => {
            const elapsed = now - truck.startTime;
            const progress = Math.min(elapsed / truck.duration, 1);
            const index = Math.floor(progress * (truck.route.length - 1));

            return {
              ...truck,
              progress,
              currentPosition: truck.route[index] || truck.route[truck.route.length - 1],
            };
          })
          .filter((truck) => truck.progress < 1)
      );

      animFrameRef.current = requestAnimationFrame(updatePositions);
    };

    animFrameRef.current = requestAnimationFrame(updatePositions);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  const handleCreateUserOrder = async () => {
    if (fromHub === toHub) {
      alert('Точки отправления и назначения должны отличаться');
      return;
    }

    const startObj = HUBS.find((h) => h.id === fromHub)!;
    const endObj = HUBS.find((h) => h.id === toHub)!;
    const route = await fetchRoute(startObj.coords, endObj.coords);

    const userTruck: ActiveTruck = {
      id: `EXP-${Math.floor(1000 + Math.random() * 9000)}`,
      fromHubId: startObj.id,
      toHubId: endObj.id,
      route,
      currentPosition: route[0],
      progress: 0,
      duration: 12000,
      startTime: Date.now(),
      isUserOrder: true,
    };

    setTrucks((prev) => [...prev, userTruck]);
    setUserOrdersCount((c) => c + 1);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-slate-950">
      {/* Шапка управления */}
      <header className="h-14 px-6 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between z-10 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <h1 className="font-mono font-semibold tracking-wider text-xs uppercase text-slate-200">
            Logistics Control Center <span className="text-slate-500">v2.4</span>
          </h1>
        </div>

        <div className="flex items-center gap-4 text-xs font-mono">
          <div className="flex items-center gap-2 text-slate-400">
            <span>Статус сети:</span>
            <span className="text-emerald-400 font-semibold">АКТИВЕН</span>
          </div>
          <div className="h-4 w-px bg-slate-800" />
          <div className="text-slate-300">
            В пути: <span className="text-white font-bold">{trucks.length}</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden">
        {/* Боковая консоль диспетчера */}
        <aside className="w-80 bg-slate-900 border-r border-slate-800 p-5 flex flex-col justify-between z-10">
          <div className="space-y-5">
            <div>
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-3">
                Диспетчеризация Рейса
              </h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Пункт отправления
                  </label>
                  <select
                    value={fromHub}
                    onChange={(e) => setFromHub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {HUBS.map((h) => (
                      <option key={h.id} value={h.id}>
                        [{h.type.toUpperCase().slice(0, 3)}] {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-slate-400 uppercase mb-1">
                    Пункт назначения
                  </label>
                  <select
                    value={toHub}
                    onChange={(e) => setToHub(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                  >
                    {HUBS.map((h) => (
                      <option key={h.id} value={h.id}>
                        [{h.type.toUpperCase().slice(0, 3)}] {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={handleCreateUserOrder}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-mono font-bold py-2.5 rounded text-xs transition tracking-wide uppercase shadow-lg shadow-emerald-950"
                >
                  Сформировать рейс
                </button>
              </div>
            </div>

            {/* Активные борты */}
            <div>
              <h2 className="text-[11px] font-mono uppercase tracking-widest text-slate-400 mb-2">
                Мониторинг Бортов ({trucks.length})
              </h2>
              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {trucks.length === 0 && (
                  <div className="text-[11px] text-slate-600 font-mono italic">Нет активных рейсов...</div>
                )}
                {trucks.map((t) => (
                  <div
                    key={t.id}
                    className={`p-2 rounded border text-[11px] font-mono flex items-center justify-between ${
                      t.isUserOrder
                        ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{t.id}</div>
                      <div className="text-[9px] text-slate-500">
                        {Math.round(t.progress * 100)}% пройдено
                      </div>
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-semibold">
                      {t.isUserOrder ? 'ПРИОРИТЕТ' : 'НОРМА'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-3 text-[10px] font-mono text-slate-500 flex justify-between">
            <span>Всего рейсов: {userOrdersCount}</span>
            <span>OSRM Routing Engine</span>
          </div>
        </aside>

        <main className="flex-1 relative">
          <Map trucks={trucks} />
        </main>
      </div>
    </div>
  );
}