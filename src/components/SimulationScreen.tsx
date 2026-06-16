import React, { useEffect, useRef } from 'react';
import { useSimulationStore } from '../store/simulationStore';
import { Play, Pause, RotateCcw, ArrowLeft, Eye, Award, Frown, Compass, ShieldAlert } from 'lucide-react';
import { AgentHelper } from '../core/Agent';

interface SimulationScreenProps {
  onBackToSetup: () => void;
}

export const SimulationScreen: React.FC<SimulationScreenProps> = ({ onBackToSetup }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const {
    config,
    isRunning,
    speedMultiplier,
    tickCount,
    agents,
    foodSpots,
    waterSpots,
    selectedAgentId,
    start,
    pause,
    step,
    reset,
    setSpeed,
    setSelectedAgentId
  } = useSimulationStore();

  // Boucle d'animation principale (requestAnimationFrame)
  useEffect(() => {
    let lastTime = performance.now();
    let frameId: number;

    const frame = (time: number) => {
      // Calcul du temps écoulé réel
      const dt = Math.min(0.05, (time - lastTime) / 1000); // Plafond à 50ms pour la physique
      lastTime = time;

      if (isRunning) {
        step(dt);
      }

      frameId = requestAnimationFrame(frame);
    };

    frameId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(frameId);
  }, [isRunning, step]);

  // Rendu du Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Effacer le canvas
    ctx.fillStyle = '#0f172a'; // Deep background slate
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Dessiner une grille d'arrière-plan (effet radar/simulation premium)
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.2)';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // 1. Dessiner les points d'EAU
    for (const water of waterSpots) {
      const radius = 14 + (water.quantity / water.maxQuantity) * 6;

      // Effet d'eau avec halo bleu doux
      const gradient = ctx.createRadialGradient(water.x, water.y, 2, water.x, water.y, radius);
      gradient.addColorStop(0, '#60a5fa');
      gradient.addColorStop(0.5, '#2563eb');
      gradient.addColorStop(1, 'rgba(37, 99, 235, 0.1)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(water.x, water.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Bordure fine
      ctx.strokeStyle = 'rgba(96, 165, 250, 0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texte de quantité
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(water.quantity)}`, water.x, water.y - radius - 4);
    }

    // 2. Dessiner les points de NOURRITURE
    for (const food of foodSpots) {
      const radius = 10 + (food.quantity / food.maxQuantity) * 6;

      let color = '#10b981'; // Vert sain par défaut
      let border = 'rgba(16, 185, 129, 0.6)';
      if (food.isLethal) {
        color = '#ef4444'; // Rouge poison
        border = 'rgba(239, 68, 68, 0.6)';
      } else if (food.isToxic) {
        color = '#f59e0b'; // Orange toxique
        border = 'rgba(245, 158, 11, 0.6)';
      }

      // Dessin du spot
      const gradient = ctx.createRadialGradient(food.x, food.y, 2, food.x, food.y, radius);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, 'rgba(15, 23, 42, 0.2)');

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(food.x, food.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = border;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Texte de quantité
      ctx.fillStyle = '#94a3b8';
      ctx.font = '9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${Math.round(food.quantity)}`, food.x, food.y - radius - 4);
    }

    // Retrouver l'agent sélectionné pour les lignes de mémoire
    const selectedAgent = agents.find(a => a.id === selectedAgentId);

    // Dessiner les liaisons de mémoire/connaissances pour l'agent sélectionné
    if (selectedAgent && !selectedAgent.isDead) {
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]); // Lignes pointillées

      for (const spotId in selectedAgent.knownSpots) {
        const spot = selectedAgent.knownSpots[spotId];
        let lineColor = 'rgba(148, 163, 184, 0.3)'; // Par défaut gris

        if (spot.type === 'water') {
          lineColor = 'rgba(96, 165, 250, 0.5)'; // Bleu pour l'eau
        } else if (spot.type === 'food') {
          if (spot.status === 'deadly') {
            lineColor = 'rgba(239, 68, 68, 0.6)'; // Rouge pour mortel
          } else if (spot.status === 'toxic') {
            lineColor = 'rgba(245, 158, 11, 0.6)'; // Orange pour toxique
          } else {
            lineColor = 'rgba(16, 185, 129, 0.5)'; // Vert pour sain
          }
        }

        ctx.strokeStyle = lineColor;
        ctx.beginPath();
        ctx.moveTo(selectedAgent.x, selectedAgent.y);
        ctx.lineTo(spot.x, spot.y);
        ctx.stroke();
      }
      ctx.setLineDash([]); // Reset les pointillés
    }

    // 3. Dessiner les AGENTS
    for (const agent of agents) {
      const isSelected = agent.id === selectedAgentId;

      if (agent.isDead) {
        // Dessiner le cadavre (fading/tombe)
        ctx.fillStyle = 'rgba(100, 116, 139, 0.4)';
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
        ctx.fill();

        // Une petite croix
        ctx.strokeStyle = 'rgba(239, 68, 68, 0.5)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(agent.x - 4, agent.y - 4);
        ctx.lineTo(agent.x + 4, agent.y + 4);
        ctx.moveTo(agent.x + 4, agent.y - 4);
        ctx.lineTo(agent.x - 4, agent.y + 4);
        ctx.stroke();
        continue;
      }

      // Agent vivant
      ctx.fillStyle = agent.color;
      
      const speed = Math.hypot(agent.vx, agent.vy);
      const dx = speed > 0.1 ? agent.vx / speed : 1;
      const dy = speed > 0.1 ? agent.vy / speed : 0;
      const shape = agent.shape || 'circle';

      if (shape === 'triangle') {
        ctx.beginPath();
        // Tip
        ctx.moveTo(agent.x + dx * (agent.radius + 2), agent.y + dy * (agent.radius + 2));
        // Back left corner
        ctx.lineTo(agent.x - dx * agent.radius * 0.6 + dy * agent.radius * 0.7, agent.y - dy * agent.radius * 0.6 - dx * agent.radius * 0.7);
        // Back right corner
        ctx.lineTo(agent.x - dx * agent.radius * 0.6 - dy * agent.radius * 0.7, agent.y - dy * agent.radius * 0.6 + dx * agent.radius * 0.7);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Direction nose line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(agent.x, agent.y);
        ctx.lineTo(agent.x + dx * (agent.radius + 2), agent.y + dy * (agent.radius + 2));
        ctx.stroke();
      } else if (shape === 'square') {
        ctx.beginPath();
        // Front
        ctx.moveTo(agent.x + dx * agent.radius, agent.y + dy * agent.radius);
        // Right
        ctx.lineTo(agent.x + dy * agent.radius, agent.y - dx * agent.radius);
        // Back
        ctx.lineTo(agent.x - dx * agent.radius, agent.y - dy * agent.radius);
        // Left
        ctx.lineTo(agent.x - dy * agent.radius, agent.y + dx * agent.radius);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Direction nose line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(agent.x, agent.y);
        ctx.lineTo(agent.x + dx * (agent.radius + 2), agent.y + dy * (agent.radius + 2));
        ctx.stroke();
      } else {
        // Circle (default)
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, agent.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        // Direction nose line
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(agent.x, agent.y);
        ctx.lineTo(agent.x + dx * (agent.radius + 2), agent.y + dy * (agent.radius + 2));
        ctx.stroke();
      }

      // Effet visuel si sélectionné
      if (isSelected) {
        ctx.strokeStyle = '#f59e0b'; // Anneau doré de sélection
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(agent.x, agent.y, agent.radius + 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Indicateurs visuels d'activité (cœur pour s'accoupler, Zzz pour dormir)
      if (agent.state === 'SLEEPING') {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '8px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Zzz', agent.x + agent.radius + 2, agent.y - 2);
      } else if (agent.state === 'COURTING' && agent.courtshipTargetId) {
        // Dessiner le lien de couple
        const partner = agents.find(p => p.id === agent.courtshipTargetId);
        if (partner && !partner.isDead) {
          ctx.strokeStyle = 'rgba(236, 72, 153, 0.2)'; // Rose doux pour l'amour
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(agent.x, agent.y);
          ctx.lineTo(partner.x, partner.y);
          ctx.stroke();
        }
        
        ctx.fillStyle = '#ec4899';
        ctx.font = '8px sans-serif';
        ctx.fillText('♥', agent.x - 2, agent.y - agent.radius - 2);
      }
    }
  }, [agents, foodSpots, waterSpots, selectedAgentId]);

  // Clic sur le Canvas pour sélectionner un agent
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Trouver l'agent cliqué le plus proche
    let clickedAgentId: string | null = null;
    let minDist = 15; // Rayon max de tolérance du clic

    for (const agent of agents) {
      const dist = Math.hypot(agent.x - clickX, agent.y - clickY);
      if (dist < minDist) {
        minDist = dist;
        clickedAgentId = agent.id;
      }
    }

    setSelectedAgentId(clickedAgentId);
  };

  const selectedAgent = agents.find(a => a.id === selectedAgentId);
  const countLiving = agents.filter(a => !a.isDead).length;

  return (
    <div className="container" style={{ display: 'flex', flexDirection: 'column', height: '90vh' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Compass color="var(--color-primary)" />
            Simulation Active
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', textAlign: 'left', marginTop: '4px' }}>
            Individus vivants : <strong style={{ color: 'var(--color-success)' }}>{countLiving}</strong> | Temps écoulé : <strong>{Math.round(tickCount)}s</strong>
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={onBackToSetup}>
            <ArrowLeft size={16} /> Retour Config
          </button>
        </div>
      </header>

      {/* Zone principale divisée : Canvas et Inspecteur */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, minHeight: 0 }}>
        {/* Canvas Carré */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', background: 'rgba(15,23,42,0.2)', padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', justifyContent: 'center', alignItems: 'center' }}>
          <canvas
            ref={canvasRef}
            width={config.width}
            height={config.height}
            onClick={handleCanvasClick}
            style={{
              borderRadius: 'var(--radius-sm)',
              boxShadow: 'inset 0 0 100px rgba(0,0,0,0.5)',
              cursor: 'pointer',
              maxWidth: '100%',
              aspectRatio: '1/1'
            }}
          />

          {/* Contrôles temporels */}
          <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
            <button
              className={`btn ${isRunning ? 'btn-danger' : 'btn-success'}`}
              onClick={isRunning ? pause : start}
              style={{ width: '120px' }}
            >
              {isRunning ? <Pause size={16} /> : <Play size={16} />}
              {isRunning ? 'Pause' : 'Reprendre'}
            </button>

            <button className="btn btn-secondary" onClick={reset}>
              <RotateCcw size={16} />
              Reset
            </button>

            {/* Vitesses */}
            <div style={{ display: 'flex', gap: '4px', background: 'rgba(15,23,42,0.5)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              {[1, 2, 5, 10].map((v) => (
                <button
                  key={v}
                  onClick={() => setSpeed(v)}
                  style={{
                    border: 'none',
                    background: speedMultiplier === v ? 'var(--color-primary)' : 'transparent',
                    color: '#fff',
                    padding: '6px 12px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {v}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Inspecteur de l'Agent Sélectionné */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {selectedAgent ? (
            <div className="card" style={{ flex: 1, overflowY: 'auto', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: selectedAgent.color }} />
                  <h2 style={{ fontSize: '1.2rem' }}>Inspecter : {selectedAgent.id}</h2>
                </div>
                <span className={`badge ${selectedAgent.isDead ? 'badge-danger' : 'badge-success'}`}>
                  {selectedAgent.isDead ? 'Mort' : selectedAgent.state}
                </span>
              </div>

              {/* Besoins / Stats */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Jauge Faim */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Faim (Nourriture)</span>
                    <span style={{ fontWeight: 600 }}>{Math.round(selectedAgent.hunger)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(15,23,42,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedAgent.hunger}%`, height: '100%', background: selectedAgent.hunger < 35 ? 'var(--color-danger)' : 'var(--color-success)', transition: 'width 0.2s' }} />
                  </div>
                </div>

                {/* Jauge Soif */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Soif (Eau)</span>
                    <span style={{ fontWeight: 600 }}>{Math.round(selectedAgent.thirst)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(15,23,42,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedAgent.thirst}%`, height: '100%', background: selectedAgent.thirst < 35 ? 'var(--color-danger)' : 'var(--color-primary)', transition: 'width 0.2s' }} />
                  </div>
                </div>

                {/* Jauge Fatigue */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                    <span>Fatigue (Sommeil)</span>
                    <span style={{ fontWeight: 600 }}>{Math.round(selectedAgent.fatigue)}%</span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(15,23,42,0.5)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ width: `${selectedAgent.fatigue}%`, height: '100%', background: selectedAgent.fatigue > 80 ? 'var(--color-warning)' : 'var(--text-muted)', transition: 'width 0.2s' }} />
                  </div>
                </div>
              </div>

              {/* Traits Héréditaires */}
              <div style={{ background: 'rgba(15,23,42,0.3)', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Award size={15} color="var(--color-primary)" />
                  Gènes & Profil Individuel
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <div>Dialecte : <strong style={{ color: '#fff' }}>{selectedAgent.dialect}</strong></div>
                  <div>Intelligence : <strong style={{ color: '#fff' }}>{Math.round(AgentHelper.getIntelligence(selectedAgent))}</strong></div>
                  <div>Vitesse : <strong style={{ color: '#fff' }}>{AgentHelper.getMaxSpeed(selectedAgent).toFixed(1)} px/s</strong></div>
                  <div>Âge : <strong style={{ color: '#fff' }}>{Math.round(selectedAgent.age)}s / {Math.round(selectedAgent.maxAge)}s</strong></div>
                  <div>Communication : <strong style={{ color: '#fff' }}>{selectedAgent.communicationRadius} px</strong></div>
                  <div>Fertilité : <strong style={{ color: '#fff' }}>{AgentHelper.isFertile(selectedAgent) ? 'Oui' : 'Non'}</strong></div>
                </div>
              </div>

              {/* Carte Mentale (Memory Map) */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Eye size={15} color="var(--color-success)" />
                  Carte Mentale (Connaissances Spatial)
                </h3>
                <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px', paddingRight: '4px' }}>
                  {Object.values(selectedAgent.knownSpots).map((spot) => (
                    <div key={spot.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', background: 'rgba(15,23,42,0.4)', borderRadius: '4px', fontSize: '0.8rem' }}>
                      <span>
                        {spot.type === 'water' ? '💧 Point d\'eau' : '🍏 Spot Nourriture'} ({spot.x}, {spot.y})
                      </span>
                      <strong style={{
                        color: spot.status === 'deadly' ? 'var(--color-danger)' :
                               spot.status === 'toxic' ? 'var(--color-warning)' :
                               'var(--color-success)'
                      }}>
                        {spot.status === 'deadly' ? 'Mortel 💀' :
                         spot.status === 'toxic' ? 'Toxique ⚠️' :
                         'Sain (Sécurisé)'}
                      </strong>
                    </div>
                  ))}
                  {Object.keys(selectedAgent.knownSpots).length === 0 && (
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '10px' }}>
                      Cet agent ne possède aucune connaissance spatiale.
                    </div>
                  )}
                </div>
              </div>

              {/* Malus Actifs */}
              {selectedAgent.maluses.length > 0 && (
                <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 600, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ShieldAlert size={14} /> Malus Appliqués
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {selectedAgent.maluses.map((m, i) => (
                      <div key={i}>
                        Redux {m.type === 'speed' ? 'Vitesse' : m.type === 'intelligence' ? 'Intelligence' : 'Fertilité'} de <strong>-{m.amount * 100}%</strong>
                        {m.isPermanent ? ' (Permanent)' : ` (${Math.round(m.duration)}s restants)`}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cause de la mort */}
              {selectedAgent.isDead && (
                <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <h3 style={{ fontSize: '0.85rem', color: 'var(--color-danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Frown size={14} /> Décès
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Cause de la mort : <strong>{selectedAgent.deathCause === 'hunger' ? 'Faim (Inanition)' :
                                            selectedAgent.deathCause === 'thirst' ? 'Soif' :
                                            selectedAgent.deathCause === 'poison' ? 'Poison (Létal)' :
                                            'Vieillesse'}</strong>
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)' }}>
              <Eye size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h3>Aucun Agent Sélectionné</h3>
              <p style={{ fontSize: '0.85rem', marginTop: '6px', textAlign: 'center', maxWidth: '280px' }}>
                Cliquez sur un agent (cercle coloré) se déplaçant sur le plateau pour l'inspecter et voir ses pensées.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
