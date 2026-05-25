'use client';

import { useState, useEffect } from 'react';

// API Feature Properties
export interface FeatureProperties {
  nama_ruas: string;
  provinsi: string;
  kategori: string;
  tahap: number;
  panjang_km: number;
  prg_konst: number;
  prg_lahan: number;
  prg_fs: number;
  prg_bd: number;
  "360 Panorama Photo"?: string;
}

export interface GeoFeature {
  type: string;
  id: string;
  geometry: {
    type: string;
    coordinates: number[][];
  };
  properties: FeatureProperties;
}

export interface GeoFeatureCollection {
  type: string;
  features: GeoFeature[];
}

// Mapped UI types
export interface RoadSegment {
  name: string;
  sub: string;
  kategori: string;
  tahap: number;
  panjang_km: number;
}

export interface MapRoute {
  name: string;
  coords: [number, number][]; // [lat, lng]
  color: string;
  weight: number;
  photo360?: string;
  properties: FeatureProperties;
}

export interface Stats {
  totalRuas: number;
  totalPanjang: number;
  avgKonstruksi: number;
  avgLahan: number;
  avgFS: number;
  avgBD: number;
}

export interface MapLocation {
  name: string;
  lat: number;
  lng: number;
  color: string;
}

export interface JTTSData {
  isLoading: boolean;
  error: string | null;
  constructionSegments: RoadSegment[];
  planningSegments: RoadSegment[];
  allSegments: RoadSegment[];
  mapRoutes: MapRoute[];
  mapLocations: MapLocation[];
  constructionStats: Stats;
  planningStats: Stats;
  totalLength: number;
}

export function useJTTSData(): JTTSData {
  const [data, setData] = useState<JTTSData>({
    isLoading: true,
    error: null,
    constructionSegments: [],
    planningSegments: [],
    allSegments: [],
    mapRoutes: [],
    mapLocations: [],
    constructionStats: { totalRuas: 0, totalPanjang: 0, avgKonstruksi: 0, avgLahan: 0, avgFS: 0, avgBD: 0 },
    planningStats: { totalRuas: 0, totalPanjang: 0, avgKonstruksi: 0, avgLahan: 0, avgFS: 0, avgBD: 0 },
    totalLength: 0
  });

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('https://geoserver.mapid.io/layers_new/get_layer?api_key=e4ea050aba33477bbbacda6d15deaa4f&layer_id=69fda61469f94898a49d50e9&project_id=69c9ea71e4fe4912fb09edd5');
        if (!res.ok) throw new Error('Failed to fetch data');
        const json: GeoFeatureCollection = await res.json();

        let totalLength = 0;
        const constructionSegments: RoadSegment[] = [];
        const planningSegments: RoadSegment[] = [];
        const allSegments: RoadSegment[] = [];
        const mapRoutes: MapRoute[] = [];
        const mapLocations: MapLocation[] = [];

        let cPanjang = 0, cKonst = 0, cLahan = 0, cFS = 0, cBD = 0;
        let pPanjang = 0, pKonst = 0, pLahan = 0, pFS = 0, pBD = 0;

        json.features.forEach(f => {
          const props = f.properties || {} as FeatureProperties;
          const nama_ruas = props.nama_ruas || 'Unknown Ruas';
          const provinsi = props.provinsi || 'Unknown Provinsi';
          const panjang_km = typeof props.panjang_km === 'number' ? props.panjang_km : (Number(props.panjang_km) || 0);
          const kategori = props.kategori || '';
          const tahap = Number(props.tahap) || 0;
          const prg_konst = typeof props.prg_konst === 'number' ? props.prg_konst : (Number(props.prg_konst) || 0);
          const prg_lahan = typeof props.prg_lahan === 'number' ? props.prg_lahan : (Number(props.prg_lahan) || 0);
          const prg_fs = typeof props.prg_fs === 'number' ? props.prg_fs : (Number(props.prg_fs) || 0);
          const prg_bd = typeof props.prg_bd === 'number' ? props.prg_bd : (Number(props.prg_bd) || 0);

          const segment: RoadSegment = {
            name: nama_ruas,
            sub: `${provinsi} | ${panjang_km.toFixed(1).replace('.', ',')} KM`,
            kategori: kategori,
            tahap: tahap,
            panjang_km: panjang_km
          };
          
          allSegments.push(segment);
          totalLength += panjang_km;

          // Categorize
          if (kategori === 'On Going Konstruksi') {
            constructionSegments.push(segment);
            cPanjang += panjang_km;
            cKonst += prg_konst;
            cLahan += prg_lahan;
            cFS += prg_fs;
            cBD += prg_bd;
          } else if (kategori === 'Tahap Perencanaan') {
            planningSegments.push(segment);
            pPanjang += panjang_km;
            pKonst += prg_konst;
            pLahan += prg_lahan;
            pFS += prg_fs;
            pBD += prg_bd;
          }

          // Map Route
          let color = '#FFD700'; // default
          if (kategori === 'On Going Konstruksi') color = '#FFD700';
          else if (kategori === 'Tahap Konstruksi Lanjutan') color = '#FFA500';
          else if (kategori === 'Tahap Perencanaan') color = '#FF2020';
          else if (kategori === 'Selesai Beroperasi') color = '#00CC44';

          const coordinates = f.geometry?.coordinates || [];
          const coords: [number, number][] = coordinates.map(c => [c[1], c[0]]); // GeoJSON is [lng, lat] -> Leaflet needs [lat, lng]
          mapRoutes.push({
            name: nama_ruas,
            coords,
            color,
            weight: 3,
            photo360: props["360 Panorama Photo"],
            properties: props
          });

          // Pick the middle coordinate for the label
          const midPoint = coords[Math.floor(coords.length / 2)];
          if (midPoint) {
            mapLocations.push({
              name: nama_ruas.replace('JTTS ', ''), // Shorten name
              lat: midPoint[0],
              lng: midPoint[1],
              color
            });
          }
        });

        // Averages
        const cCount = constructionSegments.length || 1;
        const pCount = planningSegments.length || 1;

        setData({
          isLoading: false,
          error: null,
          constructionSegments,
          planningSegments,
          allSegments,
          mapRoutes,
          mapLocations,
          totalLength,
          constructionStats: {
            totalRuas: constructionSegments.length,
            totalPanjang: cPanjang,
            avgKonstruksi: cKonst / cCount,
            avgLahan: cLahan / cCount,
            avgFS: cFS / cCount,
            avgBD: cBD / cCount
          },
          planningStats: {
            totalRuas: planningSegments.length,
            totalPanjang: pPanjang,
            avgKonstruksi: pKonst / pCount,
            avgLahan: pLahan / pCount,
            avgFS: pFS / pCount,
            avgBD: pBD / pCount
          }
        });

} catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    setData(prev => ({ ...prev, isLoading: false, error: message }));
      }
    }

    fetchData();
  }, []);

  return data;
}
