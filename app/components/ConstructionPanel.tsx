import React from 'react';
import { Play } from 'lucide-react';
import DonutChart from './DonutChart';
import { RoadSegment, Stats } from '../hooks/useJTTSData';

interface Props {
  segments: RoadSegment[];
  stats: Stats;
  totalLength: number;
  onSelect?: (name: string) => void;
}

const ConstructionPanel: React.FC<Props> = ({ segments, stats, totalLength, onSelect }) => {
const percentOnGoing = totalLength > 0 ? ((stats.totalPanjang / totalLength) * 100).toFixed(1) : 0;

  return (
    <>
      <div className="section-header sh-blue">Pembangunan Jalan Tol</div>
      <div className="konstruksi-body">
        <div className="ruas-list-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="ruas-list-title">Ruas Konstruksi</div>
          <div className="tab-bar">
            <button className="tab-btn">On Going Konstruksi</button>
          </div>
          <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
            <div id="ruas-list" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, overflowY: 'auto' }}>
            {segments.map((segment, idx) => (
              <div key={idx} className="ruas-item" onClick={() => onSelect?.(segment.name)}>
                <Play className="ruas-arrow" size={10} fill="currentColor" />
                <div>
                  <div className="ruas-name">{segment.name}</div>
                  <div className="ruas-sub">{segment.sub}</div>
                </div>
              </div>
            ))}
            </div>
          </div>
        </div>

        <div className="stats-panel">
          <div className="cards-row" style={{ flex: 1 }}>
            <div className="stat-card">
              <div className="stat-card-label">On Going Konstruksi</div>
              <div className="stat-card-num">{stats.totalRuas}</div>
              <div className="stat-card-sub">Ruas</div>
            </div>
            <div className="stat-card stat-card-blue">
              <div className="stat-card-label">Total Panjang</div>
              <div className="stat-card-num" style={{ fontSize: '24px' }}>{stats.totalPanjang.toFixed(1).replace('.', ',')}</div>
              <div className="stat-card-sub">KM</div>
            </div>
            
            <div className="bar-chart-panel">
              <div className="bar-chart-title">Status Panjang (KM)</div>
              <div className="bar-row">
                <div className="bar-row-label">Panjang Total Konstruksi/Rencana</div>
                <div className="bar-track"><div className="bar-fill bar-fill-dark" style={{ width: '100%' }}></div></div>
                <div className="bar-val">{totalLength.toFixed(1).replace('.', ',')}</div>
              </div>
              <div className="bar-row">
                <div className="bar-row-label">Panjang On going</div>
                <div className="bar-track"><div className="bar-fill" style={{ width: `${percentOnGoing}%` }}></div></div>
                <div className="bar-val">{stats.totalPanjang.toFixed(1).replace('.', ',')}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '4px' }}>
                <span>0</span><span>100</span><span>200</span><span>300</span><span>400</span><span>500</span><span>600+</span>
              </div>
            </div>
          </div>

          <div className="progress-row" style={{ flex: 1 }}>
            <div className="progress-panel">
              <div className="progress-panel-title">Progress Konstruksi</div>
              <DonutChart percentage={Math.round(stats.avgKonstruksi)} colorFill="#3a7bd5" />
            </div>
            <div className="progress-panel">
              <div className="progress-panel-title">Progress Lahan</div>
              <DonutChart percentage={Math.round(stats.avgLahan)} colorFill="#00b8b8" />
            </div>
            <div className="status-panel">
              <div className="status-panel-title">Status Konstruksi</div>
              <div className="status-bar-row">
                <div className="status-bar-label">Progress Mainroad</div>
                <div className="status-bar-track"><div className="status-bar-fill" style={{ width: `${stats.avgFS}%`, background: '#3a7bd5' }}></div></div>
                <div className="status-bar-val">{stats.avgFS.toFixed(0)}%</div>
              </div>
              <div className="status-bar-row">
                <div className="status-bar-label">Progress Struktur</div>
                <div className="status-bar-track"><div className="status-bar-fill" style={{ width: `${stats.avgBD}%`, background: '#00838f' }}></div></div>
                <div className="status-bar-val">{stats.avgBD.toFixed(0)}%</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', color: '#555', marginTop: '6px' }}>
                <span>0</span><span>0,5</span><span>1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ConstructionPanel;
