import { useEffect, useMemo, useRef, useState } from 'react';
import { SearchItem } from '../data';

interface MapViewProps {
  items: SearchItem[];
  selectedType?: SearchItem['type'] | 'all';
  onSelectItem?: (item: SearchItem) => void;
}

declare global {
  interface Window {
    google?: any;
    __openMapDetail?: (id: string) => void;
  }
}

const pinColors: Record<SearchItem['type'], string> = {
  school: '#d14b4b',
  teacher: '#2f68d7',
  event: '#3b9b63',
  club: '#d5932f',
};

let googleMapsPromise: Promise<void> | null = null;

function loadGoogleMaps(apiKey: string): Promise<void> {
  if (window.google?.maps) return Promise.resolve();
  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(
      'script[src^="https://maps.googleapis.com/maps/api/js"]',
    );
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Google Maps script failed')));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      googleMapsPromise = null;
      reject(new Error('Google Maps script failed to load'));
    };
    document.body.appendChild(script);
  });

  return googleMapsPromise;
}

function isValidCoord(lat: unknown, lng: unknown): boolean {
  return typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng);
}

export function MapView({ items, selectedType = 'all', onSelectItem }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState(false);
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;

  const visibleItems = useMemo(
    () => (selectedType === 'all' ? items : items.filter((item) => item.type === selectedType)),
    [items, selectedType],
  );

  useEffect(() => {
    window.__openMapDetail = (id: string) => {
      const found = items.find((item) => item.id === id);
      if (found && onSelectItem) onSelectItem(found);
    };
    return () => {
      delete window.__openMapDetail;
    };
  }, [items, onSelectItem]);

  // Effect A: Initialize map instance once (apiKey + container only)
  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then(() => {
        if (cancelled || !mapRef.current || googleMapRef.current) return;
        try {
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: 35.6762, lng: 139.6503 },
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false,
          });
          infoWindowRef.current = new window.google.maps.InfoWindow();
          setMapReady(true);
        } catch {
          setMapError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setMapError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Effect B: Update markers when visibleItems or map readiness changes
  useEffect(() => {
    if (!mapReady || !googleMapRef.current || !window.google?.maps) return;

    try {
      const google = window.google;
      const map = googleMapRef.current;

      markersRef.current.forEach((marker) => {
        try { marker.setMap(null); } catch { /* ignore */ }
      });
      markersRef.current = [];

      const validItems = visibleItems.filter((item) => isValidCoord(item.lat, item.lng));
      if (validItems.length === 0) return;

      const bounds = new google.maps.LatLngBounds();

      validItems.forEach((item) => {
        const position = { lat: item.lat, lng: item.lng };
        const marker = new google.maps.Marker({
          map,
          position,
          title: item.name,
          icon: {
            url: buildMarker(pinColors[item.type]),
            scaledSize: new google.maps.Size(30, 30),
          },
        });

        marker.addListener('click', () => {
          try {
            infoWindowRef.current.setContent(`
              <div style="padding:8px 10px; min-width: 220px; font-family: sans-serif;">
                <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${labelOf(item.type)}</div>
                <div style="font-size:15px;font-weight:700;margin-bottom:8px;">${item.name}</div>
                <div style="font-size:13px;line-height:1.6;color:#374151;margin-bottom:10px;">${item.description}</div>
                <button onclick="window.__openMapDetail && window.__openMapDetail('${item.id}')" style="background:#102542;color:#fff;border:none;border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;">詳細を見る</button>
              </div>
            `);
            infoWindowRef.current.open({ anchor: marker, map });
          } catch { /* ignore infowindow errors */ }
        });

        markersRef.current.push(marker);
        const pos = marker.getPosition();
        if (pos) bounds.extend(pos);
      });

      if (validItems.length === 1) {
        map.setCenter({ lat: validItems[0].lat, lng: validItems[0].lng });
        map.setZoom(13);
      } else {
        map.fitBounds(bounds, 48);
      }
    } catch {
      setMapError(true);
    }
  }, [mapReady, visibleItems, onSelectItem]);

  // Cleanup markers on unmount
  useEffect(() => {
    return () => {
      markersRef.current.forEach((marker) => {
        try { marker.setMap(null); } catch { /* ignore */ }
      });
      markersRef.current = [];
    };
  }, []);

  if (!apiKey) {
    return (
      <section className="panel map-panel">
        <div className="section-inline-header tight">
          <h3>地図から探す</h3>
          <span>APIキー未設定</span>
        </div>
        <div className="dummy-map">
          <div className="dummy-map-grid" />
          <div className="dummy-map-overlay">
            <div>
              <strong>地図表示エリア</strong>
              <p>VITE_GOOGLE_MAPS_API_KEY を設定すると、ここに実際のGoogleマップと色分けピンが表示されます。</p>
              <div className="legend-row">
                <span><i style={{ background: pinColors.school }} />スクール</span>
                <span><i style={{ background: pinColors.teacher }} />先生</span>
                <span><i style={{ background: pinColors.event }} />イベント</span>
                <span><i style={{ background: pinColors.club }} />クラブ</span>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (mapError) {
    return (
      <section className="panel map-panel">
        <div className="section-inline-header tight">
          <h3>地図から探す</h3>
          <span>表示エラー</span>
        </div>
        <div className="dummy-map">
          <div className="dummy-map-grid" />
          <div className="dummy-map-overlay">
            <div>
              <strong>地図を表示できませんでした</strong>
              <p>Google Mapsの読み込みに失敗しました。ページを再読み込みしてください。</p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="panel map-panel">
      <div className="section-inline-header tight">
        <h3>地図から探す</h3>
        <span>{visibleItems.length}件を表示中</span>
      </div>
      <div ref={mapRef} className="real-map" />
    </section>
  );
}

function buildMarker(color: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 32 32">
      <path fill="${color}" d="M16 1C10.201 1 5.5 5.701 5.5 11.5c0 8.773 10.5 19.5 10.5 19.5s10.5-10.727 10.5-19.5C26.5 5.701 21.799 1 16 1z"/>
      <circle cx="16" cy="11.5" r="4.2" fill="#fff"/>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function labelOf(type: SearchItem['type']) {
  switch (type) {
    case 'school':
      return 'スクール';
    case 'teacher':
      return '先生';
    case 'event':
      return 'イベント';
    default:
      return 'ヨガクラブ';
  }
}
