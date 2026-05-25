'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { MapRoute, MapLocation } from '../hooks/useJTTSData';

interface PannellumViewer {
  viewer: (container: string, options: Record<string, unknown>) => unknown;
}

interface Props {
  routes: MapRoute[];
  locations: MapLocation[];
  selectedRouteName?: string | null;
}

const MapPanel: React.FC<Props> = ({ routes, locations, selectedRouteName }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const [active360, setActive360] = useState<MapRoute | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<'dark' | 'satellite'>('dark');
  
const viewerRef = useRef<PannellumViewer | null>(null);
const routesRef = useRef<MapRoute[]>(routes);

useEffect(() => {
  routesRef.current = routes;
}, [routes]);
  
  // Track rendered elements to prevent duplicates during style changes
  const markersRef = useRef<maplibregl.Marker[]>([]);

  const STYLES = {
    dark: 'https://basemap.mapid.io/styles/dark/style.json?key=67aacc7e051d92f468af03c4',
    satellite: 'https://basemap.mapid.io/styles/satellite/style.json?key=67aacc7e051d92f468af03c4'
  };

  // Function to add Route layers (needed because setStyle clears them)
  const renderLayers = useCallback((map: maplibregl.Map) => {
    routesRef.current.forEach((r, i) => {
      const sourceId = `route-${i}`;
      const layerId = `route-line-${i}`;

      if (map.getSource(sourceId)) return;

      const coordinates = r.coords.map(c => [c[1], c[0]]);

      map.addSource(sourceId, {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: r.name, routeIndex: i },
          geometry: {
            type: 'LineString',
            coordinates
          }
        }
      });

      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        paint: {
          'line-color': r.color,
          'line-width': 6,
          'line-opacity': 0.9
        },
        layout: {
          'line-cap': 'round',
          'line-join': 'round'
        }
      });

      // Attach event listeners for interactivity
      map.on('mouseenter', layerId, () => {
        map.getCanvas().style.cursor = 'pointer';
        map.setPaintProperty(layerId, 'line-width', 10);
        map.setPaintProperty(layerId, 'line-opacity', 1);
      });

      map.on('mouseleave', layerId, () => {
        map.getCanvas().style.cursor = '';
        map.setPaintProperty(layerId, 'line-width', 6);
        map.setPaintProperty(layerId, 'line-opacity', 0.9);
      });

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'route-tooltip'
      });

      map.on('mousemove', layerId, (e) => {
        popup
          .setLngLat(e.lngLat)
          .setHTML(`<div style="font-size:11px;font-weight:600;color:#fff;padding:2px 4px;">${r.name}</div>`)
          .addTo(map);
      });

      map.on('mouseleave', layerId, () => {
        popup.remove();
      });

      map.on('click', layerId, (e) => {
        e.originalEvent.stopPropagation();
        setActive360(routesRef.current[i]);
      });
    });
  }, []);

  // Function to add/refresh Markers
  const renderMarkers = useCallback((map: maplibregl.Map, locs: MapLocation[]) => {
    // Clean up existing markers first
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    locs.forEach(loc => {
      // Dot marker
      const dotEl = document.createElement('div');
      dotEl.style.cssText = `
        width: 10px; height: 10px;
        background: ${loc.color};
        border: 1.5px solid #fff;
        border-radius: 50%;
        pointer-events: none;
        user-select: none;
        box-shadow: 0 0 4px rgba(0,0,0,0.5);
      `;

      const dotMarker = new maplibregl.Marker({ element: dotEl })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
      markersRef.current.push(dotMarker);

      // Label marker
      const labelEl = document.createElement('div');
      labelEl.style.cssText = `
        color: #fff; font-size: 9px; font-weight: 700;
        background: rgba(0,0,0,0.65);
        padding: 2px 4px; border-radius: 3px;
        white-space: nowrap;
        user-select: none; pointer-events: none;
        box-shadow: 0 1px 3px rgba(0,0,0,0.4);
        text-shadow: 0 1px 2px rgba(0,0,0,0.8);
      `;
      labelEl.setAttribute('draggable', 'false');
      labelEl.textContent = loc.name.replace('\n', ' ');

      const labelMarker = new maplibregl.Marker({ element: labelEl, anchor: 'top-left', offset: [8, -8] })
        .setLngLat([loc.lng, loc.lat])
        .addTo(map);
      markersRef.current.push(labelMarker);
    });
  }, []);

  // Initialize base map object only once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstance.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: STYLES.dark,
      center: [102.5, 1.5],
      zoom: 4.5,
      attributionControl: false
    });

    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');

    // Crucial: We must listen for 'style.load' so when setStyle triggers, we re-add layers
    map.on('style.load', () => {
      renderLayers(map);
    });

    map.on('load', () => {
      setMapLoaded(true);
      // Initial layer and marker load
      renderLayers(map);
      renderMarkers(map, locations);
    });

    map.on('styleimagemissing', (e) => {
      const id = e.id;
      if (!map.hasImage(id)) {
        const width = 1;
        const height = 1;
        const data = new Uint8Array(width * height * 4);
        map.addImage(id, { width, height, data });
      }
    });

    mapContainerRef.current.addEventListener('dragstart', (e) => e.preventDefault());

    mapInstance.current = map;

    return () => {
      map.remove();
      mapInstance.current = null;
      setMapLoaded(false);
    };
  }, [STYLES.dark, locations, renderLayers, renderMarkers]);

  // Handle external data updates (e.g. dynamic reload of locations/routes)
  useEffect(() => {
    const map = mapInstance.current;
    if (map && mapLoaded) {
      renderMarkers(map, locations);
      // Re-render layers if they weren't already drawn
      renderLayers(map);
    }
  }, [locations, mapLoaded, renderLayers, renderMarkers]);

  // Effect to handle switching style via state
  const toggleBasemap = (styleName: 'dark' | 'satellite') => {
    const map = mapInstance.current;
    if (!map || styleName === currentStyle) return;
    
    setCurrentStyle(styleName);
    map.setStyle(STYLES[styleName]);
    // The 'style.load' event above will auto-inject custom route layers back once ready!
  };

  // Fly to logic
  useEffect(() => {
    const map = mapInstance.current;
    if (!selectedRouteName || !map || !mapLoaded) return;

    const targetRoute = routes.find(r => r.name === selectedRouteName);
    if (targetRoute && targetRoute.coords.length > 0) {
      const coordinates = targetRoute.coords.map(c => [c[1], c[0]] as [number, number]);
      const bounds = coordinates.reduce(
        (b, coord) => b.extend(coord as maplibregl.LngLatLike),
        new maplibregl.LngLatBounds(coordinates[0], coordinates[0])
      );
      map.fitBounds(bounds, { padding: 50, duration: 1500 });
    }
  }, [selectedRouteName, routes, mapLoaded]);

  // Pannellum 360 Logic
  useEffect(() => {
    if (active360?.photo360) {
      const timer = setTimeout(() => {
    if ((window as unknown as Record<string, { pannellum: PannellumViewer }>).pannellum) {
      viewerRef.current = (window as unknown as Record<string, { pannellum: PannellumViewer }>).pannellum.viewer('panorama-360', {
            type: 'equirectangular',
            panorama: active360.photo360,
            autoLoad: true,
            showControls: true
          });
        }
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [active360]);

  return (
    <div id="map-wrapper" style={{ position: 'relative', width: '100%', height: '100%' }}>
      <div id="map-container" ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
      <button className="map-close">✕</button>

      {/* Basemap Switcher UI Component */}
      <div className="basemap-switcher" style={{
        position: 'absolute',
        top: '12px',
        left: '12px',
        zIndex: 1000,
        display: 'flex',
        gap: '4px',
        background: 'rgba(17, 24, 39, 0.8)',
        backdropFilter: 'blur(4px)',
        padding: '3px',
        borderRadius: '6px',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <button 
          onClick={() => toggleBasemap('dark')}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            background: currentStyle === 'dark' ? '#2563eb' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
        >
          Dark
        </button>
        <button 
          onClick={() => toggleBasemap('satellite')}
          style={{
            padding: '4px 8px',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
            background: currentStyle === 'satellite' ? '#2563eb' : 'transparent',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            transition: 'all 0.2s'
          }}
        >
          Satellite
        </button>
      </div>

      {active360 && (
        <div className="modal-overlay" onClick={() => setActive360(null)} style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 2000,
          display: 'flex', flexDirection: 'column', padding: '20px'
        }}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{
            backgroundColor: '#111', borderRadius: '8px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column', height: '100%', border: '1px solid #333'
          }}>
            <div className="modal-header" style={{
              padding: '12px 16px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', borderBottom: '1px solid #222', background: '#0a0a0a'
            }}>
              <div>
                <div style={{ color: '#fff', fontSize: '14px', fontWeight: 'bold' }}>{active360.name}</div>
                <div style={{ color: '#888', fontSize: '11px' }}>{active360.properties.provinsi} | {active360.properties.panjang_km} KM</div>
              </div>
              <button onClick={() => setActive360(null)} style={{
                background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer'
              }}>✕</button>
            </div>
            <div style={{ flex: 1, position: 'relative', background: '#000' }}>
              {active360.photo360 ? (
                <div id="panorama-360" style={{ width: '100%', height: '100%' }}></div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#666' }}>
                  Photo 360 tidak tersedia untuk ruas ini
                </div>
              )}
            </div>
            <div className="modal-footer" style={{
              padding: '12px', background: '#0a0a0a', borderTop: '1px solid #222',
              display: 'flex', gap: '20px'
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>Progress Konstruksi</div>
                <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${active360.properties.prg_konst}%`, height: '100%', background: '#3a7bd5' }}></div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#aaa', fontSize: '10px', marginBottom: '4px' }}>Progress Lahan</div>
                <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${active360.properties.prg_lahan}%`, height: '100%', background: '#00b8b8' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapPanel;
