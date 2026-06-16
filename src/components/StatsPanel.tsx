import React from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { TrendingUp, BarChart2, Skull, Heart, Compass } from 'lucide-react';
import { AgentHelper } from '../core/Agent';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export const StatsPanel: React.FC = () => {
  const { history, agents, config } = useSimulationStore();

  const livingAgents = agents.filter(a => !a.isDead);
  const deadAgents = agents.filter(a => a.isDead);

  // 1. Calcul de la distribution des causes de mort dans le pool actuel d'agents
  const deathCauses = agents.reduce((acc, a) => {
    if (a.isDead && a.deathCause) {
      acc[a.deathCause] = (acc[a.deathCause] || 0) + 1;
    }
    return acc;
  }, { old_age: 0, hunger: 0, thirst: 0, poison: 0 } as Record<string, number>);

  // 2. Extraire toutes les couleurs d'agents uniques présentes dans l'historique
  const uniqueColors = Array.from(
    new Set(
      history.flatMap(h => Object.keys(h.typeCounts))
    )
  );

  // Associer un libellé à chaque couleur si possible
  const getColorLabel = (color: string): string => {
    const type = config.agentTypes.find(t => t.color === color);
    if (type) return type.id;
    return `Métis (${color})`; // Crossover hybride
  };

  // 3. Configurer les données du graphique linéaire
  const chartData = {
    labels: history.map(h => `${h.tick}s`),
    datasets: [
      {
        label: 'Population Totale',
        data: history.map(h => h.population),
        borderColor: '#f8fafc', // Blanc slate
        borderWidth: 2,
        pointRadius: 0,
        fill: false,
        tension: 0.2
      },
      ...uniqueColors.map(color => ({
        label: getColorLabel(color),
        data: history.map(h => h.typeCounts[color] || 0),
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        tension: 0.2
      }))
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#94a3b8',
          font: {
            family: 'Outfit'
          }
        }
      },
      tooltip: {
        mode: 'index' as const,
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(51, 65, 85, 0.1)'
        },
        ticks: {
          color: '#64748b'
        }
      },
      y: {
        grid: {
          color: 'rgba(51, 65, 85, 0.1)'
        },
        ticks: {
          color: '#64748b'
        },
        min: 0
      }
    }
  };

  // Moyennes actuelles de la population vivante
  const avgIntelligence = livingAgents.length > 0 
    ? Math.round(livingAgents.reduce((sum, a) => sum + AgentHelper.getIntelligence(a), 0) / livingAgents.length)
    : 0;

  const avgSpeed = livingAgents.length > 0
    ? (livingAgents.reduce((sum, a) => sum + AgentHelper.getMaxSpeed(a), 0) / livingAgents.length).toFixed(2)
    : '0';

  const countHybrids = livingAgents.filter(a => {
    // Un agent est hybride si ses traits ne correspondent pas à un profil de type pur
    const matchedType = config.agentTypes.find(t => t.color === a.color && t.speed === a.speed && t.dialect === a.dialect);
    return !matchedType;
  }).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Statistiques clés (Grid) */}
      <div className="grid-4">
        {/* Total Pop */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <div style={{ background: 'rgba(59, 130, 246, 0.15)', color: 'var(--color-primary)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vivants / Total</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>
              {livingAgents.length} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ {agents.length}</span>
            </div>
          </div>
        </div>

        {/* Moyenne Intelligence */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <BarChart2 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Intelligence Moyenne</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{avgIntelligence} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/ 100</span></div>
          </div>
        </div>

        {/* Hybrides / Métis */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: 'var(--color-purple)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <Heart size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Individus Hybrides</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{countHybrids}</div>
          </div>
        </div>

        {/* Vitesse moyenne */}
        <div className="card" style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '14px', textAlign: 'left' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.15)', color: 'var(--color-warning)', padding: '10px', borderRadius: 'var(--radius-sm)' }}>
            <Compass size={24} />
          </div>
          <div>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Vitesse Moyenne</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700 }}>{avgSpeed} <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>px/s</span></div>
          </div>
        </div>
      </div>

      <div className="grid-3">
        {/* Graphique de Population Temporel */}
        <div className="card" style={{ gridColumn: 'span 2', height: '320px', display: 'flex', flexDirection: 'column' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '12px', textAlign: 'left', fontWeight: 600 }}>
            Évolution Temporelle de la Population
          </h2>
          <div style={{ flex: 1, position: 'relative' }}>
            {history.length > 0 ? (
              <Line data={chartData} options={chartOptions} />
            ) : (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
                Données de simulation en cours de calcul...
              </div>
            )}
          </div>
        </div>

        {/* Tableau de mortalité */}
        <div className="card" style={{ height: '320px', display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '16px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Skull size={18} color="var(--color-danger)" />
            Causes de Mortalité cumulées
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '6px', borderBottom: '1px solid var(--border-color)', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <span>Cause</span>
              <strong>Morts</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Vieillesse (Fin de cycle)</span>
              <strong>{deathCauses.old_age}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Inanition (Faim)</span>
              <strong style={{ color: 'var(--color-danger)' }}>{deathCauses.hunger}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Déshydratation (Soif)</span>
              <strong style={{ color: 'var(--color-primary)' }}>{deathCauses.thirst}</strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
              <span>Intoxication (Poison)</span>
              <strong style={{ color: 'var(--color-warning)' }}>{deathCauses.poison}</strong>
            </div>
            
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.95rem', fontWeight: 600 }}>
              <span>Total décès enregistrés</span>
              <span>{deadAgents.length + (agents.length - livingAgents.length - deadAgents.length)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
