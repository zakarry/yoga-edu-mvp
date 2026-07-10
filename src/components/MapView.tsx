import { useEffect, useMemo, useRef } from 'react';
import { SearchItem } from '../data';

interface MapViewProps {
  items: SearchItem[];
  selectedType?: SearchItem['type'] | 'all';
  onSelectItem?: (item: SearchItem) => void;
}

declare global {
  interface Window {
    google?: any;
    initYogaMvpMap?: () => void;
    __openMapDetail?: (id: string) => void;
  }
}

const pinColors: Record<SearchItem['type'], string> = {
  school: '#d14b4b',
  teacher: '#2f68d7',
  event: '#3b9b63',
  club: '#d5932f',
};

export function MapView({ items, selectedType = 'all', onSelectItem }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);
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

  useEffect(() => {
    if (!apiKey || !mapRef.current) return;

    const mountMap = () => {
      const google = window.google;
      if (!google || !mapRef.current) return;

      if (!googleMapRef.current) {
        googleMapRef.current = new google.maps.Map(mapRef.current, {
          center: { lat: 35.6762, lng: 139.6503 },
          zoom: 11,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        infoWindowRef.current = new google.maps.InfoWindow();
      }

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      const bounds = new google.maps.LatLngBounds();

      visibleItems.forEach((item) => {
        const marker = new google.maps.Marker({
          map: googleMapRef.current,
          position: { lat: item.lat, lng: item.lng },
          title: item.name,
          icon: {
            url: buildMarker(pinColors[item.type]),
            scaledSize: new google.maps.Size(30, 30),
          },
        });

        marker.addListener('click', () => {
          infoWindowRef.current.setContent(`
            <div style="padding:8px 10px; min-width: 220px; font-family: sans-serif;">
              <div style="font-size:12px;color:#6b7280;margin-bottom:6px;">${labelOf(item.type)}</div>
              <div style="font-size:15px;font-weight:700;margin-bottom:8px;">${item.name}</div>
              <div style="font-size:13px;line-height:1.6;color:#374151;margin-bottom:10px;">${item.description}</div>
              <button onclick="window.__openMapDetail && window.__openMapDetail('${item.id}')" style="background:#102542;color:#fff;border:none;border-radius:999px;padding:8px 12px;font-size:12px;cursor:pointer;">詳細を見るボタン</button>
            </div>
          `);
          infoWindowRef.current.open({ anchor: marker, map: googleMapRef.current });
          if (onSelectItem) onSelectItem(item);
        });
        markersRef.current.push(marker);
        bounds.extend(marker.getPosition());
      });

      if (visibleItems.length > 0) {
        googleMapRef.current.fitBounds(bounds, 48);
      }
    };

    if (window.google?.maps) {
      mountMap();
      return;
    }

    window.initYogaMvpMap = mountMap;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&callback=initYogaMvpMap`;
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      if (window.initYogaMvpMap) delete window.initYogaMvpMap;
    };
  }, [apiKey, visibleItems, onSelectItem]);

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
