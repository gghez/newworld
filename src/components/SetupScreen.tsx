import React, { useState, useRef, useEffect } from 'react';
import { useSimulationStore, DEFAULT_CONFIG } from '../store/simulationStore';
import { type AgentTypeConfig, type FoodSpot, type WaterSpot } from '../core/types';
import { Users, Plus, Trash2, Edit2, Sparkles, Compass, MapPin } from 'lucide-react';

interface SetupScreenProps {
  onStartSimulation: () => void;
}

let spotIdCounter = 0;
const generateSpotId = (prefix: string) => {
  spotIdCounter++;
  return `${prefix}-${Date.now()}-${spotIdCounter}`;
};

export const SetupScreen: React.FC<SetupScreenProps> = ({ onStartSimulation }) => {
  const { config, updateConfig, loadPreset } = useSimulationStore();

  // États locaux pour la gestion de l'ajout
  const [newTypeName, setNewTypeName] = useState('Nouveau Type');
  const [newTypeColor, setNewTypeColor] = useState('#a855f7');
  const [newTypeSpeed, setNewTypeSpeed] = useState(2.0);
  const [newTypeLifespan, setNewTypeLifespan] = useState(100);
  const [newTypeFertilityStart, setNewTypeFertilityStart] = useState(18);
  const [newTypeFertilityEnd, setNewTypeFertilityEnd] = useState(80);
  const [newTypeCommRange, setNewTypeCommRange] = useState(50);
  const [newTypeDialect, setNewTypeDialect] = useState('Dialect Gamma');
  const [newTypeIntelligence, setNewTypeIntelligence] = useState(50);
  const [newTypeInitialCount, setNewTypeInitialCount] = useState(10);
  const [newTypeHybridTendency, setNewTypeHybridTendency] = useState(0.3);
  const [newTypeLifespanFluctuation, setNewTypeLifespanFluctuation] = useState(0.15);
  const [newTypeShape, setNewTypeShape] = useState<'circle' | 'triangle' | 'square'>('circle');
  const [selectedSpawnTypeTarget, setSelectedSpawnTypeTarget] = useState<string>('');
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);

  // États spécifiques pour l'édition dans la modale
  const [editTypeName, setEditTypeName] = useState('');
  const [editTypeColor, setEditTypeColor] = useState('#a855f7');
  const [editTypeSpeed, setEditTypeSpeed] = useState(2.0);
  const [editTypeLifespan, setEditTypeLifespan] = useState(100);
  const [editTypeFertilityStart, setEditTypeFertilityStart] = useState(18);
  const [editTypeFertilityEnd, setEditTypeFertilityEnd] = useState(80);
  const [editTypeCommRange, setEditTypeCommRange] = useState(50);
  const [editTypeDialect, setEditTypeDialect] = useState('Dialect Gamma');
  const [editTypeIntelligence, setEditTypeIntelligence] = useState(50);
  const [editTypeInitialCount, setEditTypeInitialCount] = useState(10);
  const [editTypeHybridTendency, setEditTypeHybridTendency] = useState(0.3);
  const [editTypeLifespanFluctuation, setEditTypeLifespanFluctuation] = useState(0.15);
  const [editTypeShape, setEditTypeShape] = useState<'circle' | 'triangle' | 'square'>('circle');

  const editDialogRef = useRef<HTMLDialogElement>(null);
  const addDialogRef = useRef<HTMLDialogElement>(null);
  const editWaterDialogRef = useRef<HTMLDialogElement>(null);
  const editFoodDialogRef = useRef<HTMLDialogElement>(null);

  // États locaux pour l'édition de points d'eau
  const [editingWaterSpotId, setEditingWaterSpotId] = useState<string | null>(null);
  const [editWaterX, setEditWaterX] = useState(300);
  const [editWaterY, setEditWaterY] = useState(300);
  const [editWaterMaxQty, setEditWaterMaxQty] = useState(50);
  const [editWaterRepRate, setEditWaterRepRate] = useState(1.0);

  // États locaux pour l'édition de spots de nourriture
  const [editingFoodSpotId, setEditingFoodSpotId] = useState<string | null>(null);
  const [editFoodX, setEditFoodX] = useState(300);
  const [editFoodY, setEditFoodY] = useState(300);
  const [editFoodMaxQty, setEditFoodMaxQty] = useState(30);
  const [editFoodRepRate, setEditFoodRepRate] = useState(0.5);
  const [editFoodIsToxic, setEditFoodIsToxic] = useState(false);
  const [editFoodIsLethal, setEditFoodIsLethal] = useState(false);
  const [editFoodMalus, setEditFoodMalus] = useState<'speed' | 'intelligence' | 'fertility' | 'none'>('none');
  const [editFoodIsMalusPermanent, setEditFoodIsMalusPermanent] = useState(false);
  const [editFoodMalusDuration, setEditFoodMalusDuration] = useState(20);

  // Déterminer la cible de spawn active (derived state)
  const currentTarget = config.agentTypes.some(t => t.id === selectedSpawnTypeTarget)
    ? selectedSpawnTypeTarget
    : (config.agentTypes[0]?.id || '');



  // Pour la mini-carte
  const [editorMode, setEditorMode] = useState<'water' | 'food' | 'eraser' | 'spawn' | 'select'>('food');
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Pour le drag & drop en mode select (Éditer)
  const [draggedItem, setDraggedItem] = useState<{ type: 'water' | 'food' | 'spawn'; id: string } | null>(null);
  const [draggedHasMoved, setDraggedHasMoved] = useState(false);
  const justDraggedRef = useRef(false);
  const minimapContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!draggedItem) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (!minimapContainerRef.current) return;
      const rect = minimapContainerRef.current.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const clickY = e.clientY - rect.top;
      
      const x = Math.max(0, Math.min(config.width, Math.round((clickX / rect.width) * config.width)));
      const y = Math.max(0, Math.min(config.height, Math.round((clickY / rect.height) * config.height)));

      // Only update if coordinates actually changed
      let hasChanged = false;
      if (draggedItem.type === 'water') {
        const spot = config.waterSpots.find(s => s.id === draggedItem.id);
        if (spot && (spot.x !== x || spot.y !== y)) hasChanged = true;
      } else if (draggedItem.type === 'food') {
        const spot = config.foodSpots.find(s => s.id === draggedItem.id);
        if (spot && (spot.x !== x || spot.y !== y)) hasChanged = true;
      } else if (draggedItem.type === 'spawn') {
        const type = config.agentTypes.find(t => t.id === draggedItem.id);
        if (type && (type.spawnX !== x || type.spawnY !== y)) hasChanged = true;
      }

      if (hasChanged) {
        setDraggedHasMoved(true);
        updateConfig(conf => {
          if (draggedItem.type === 'water') {
            const spot = conf.waterSpots.find(s => s.id === draggedItem.id);
            if (spot) {
              spot.x = x;
              spot.y = y;
            }
          } else if (draggedItem.type === 'food') {
            const spot = conf.foodSpots.find(s => s.id === draggedItem.id);
            if (spot) {
              spot.x = x;
              spot.y = y;
            }
          } else if (draggedItem.type === 'spawn') {
            const type = conf.agentTypes.find(t => t.id === draggedItem.id);
            if (type) {
              type.spawnX = x;
              type.spawnY = y;
            }
          }
        });
      }
    };

    const handleWindowMouseUp = () => {
      if (draggedHasMoved) {
        justDraggedRef.current = true;
        setTimeout(() => {
          justDraggedRef.current = false;
        }, 50);
      }
      setDraggedItem(null);
      setDraggedHasMoved(false);
    };

    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('mouseup', handleWindowMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('mouseup', handleWindowMouseUp);
    };
  }, [draggedItem, draggedHasMoved, config, updateConfig]);

  const handleAddAgentType = (e: React.FormEvent) => {
    e.preventDefault();
    // Vérifier les doublons de nom
    if (config.agentTypes.some(t => t.id.trim().toLowerCase() === newTypeName.trim().toLowerCase())) {
      alert("Un type d'individu avec ce nom existe déjà !");
      return;
    }

    const newType: AgentTypeConfig = {
      id: newTypeName,
      color: newTypeColor,
      speed: newTypeSpeed,
      averageLifespan: newTypeLifespan,
      lifespanFluctuation: newTypeLifespanFluctuation,
      fertilityStartAge: newTypeFertilityStart,
      fertilityEndAge: newTypeFertilityEnd,
      communicationRadius: newTypeCommRange,
      dialect: newTypeDialect,
      intelligence: newTypeIntelligence,
      initialCount: newTypeInitialCount,
      hybridTendency: newTypeHybridTendency,
      spawnX: 300, // Centre par défaut à la création, à positionner sur la mini-carte ensuite
      spawnY: 300,
      shape: newTypeShape
    };

    updateConfig(conf => {
      conf.agentTypes.push(newType);
    });
    
    addDialogRef.current?.close();
  };

  const openAddDialog = () => {
    const nextIndex = config.agentTypes.length + 1;
    setNewTypeName(`Type ${nextIndex}`);
    const colors = ['#a855f7', '#ec4899', '#f97316', '#22c55e', '#06b6d4', '#eab308'];
    const nextColor = colors[(nextIndex - 1) % colors.length];
    setNewTypeColor(nextColor);
    setNewTypeSpeed(2.0);
    setNewTypeLifespan(100);
    setNewTypeFertilityStart(18);
    setNewTypeFertilityEnd(80);
    setNewTypeCommRange(50);
    setNewTypeDialect(`Dialect ${String.fromCharCode(65 + (nextIndex - 1) % 26)}`);
    setNewTypeIntelligence(50);
    setNewTypeInitialCount(10);
    setNewTypeHybridTendency(0.3);
    setNewTypeLifespanFluctuation(0.15);
    setNewTypeShape('circle');
    addDialogRef.current?.showModal();
  };

  const handleRemoveAgentType = (index: number) => {
    updateConfig(conf => {
      conf.agentTypes.splice(index, 1);
    });
    if (editingTypeId) {
      editDialogRef.current?.close();
      setEditingTypeId(null);
    }
  };

  const startEditingType = (type: AgentTypeConfig) => {
    setEditingTypeId(type.id);
    setEditTypeName(type.id);
    setEditTypeColor(type.color);
    setEditTypeSpeed(type.speed);
    setEditTypeLifespan(type.averageLifespan);
    setEditTypeFertilityStart(type.fertilityStartAge);
    setEditTypeFertilityEnd(type.fertilityEndAge);
    setEditTypeCommRange(type.communicationRadius);
    setEditTypeDialect(type.dialect);
    setEditTypeIntelligence(type.intelligence);
    setEditTypeInitialCount(type.initialCount);
    setEditTypeHybridTendency(type.hybridTendency);
    setEditTypeLifespanFluctuation(type.lifespanFluctuation);
    setEditTypeShape(type.shape || 'circle');
    editDialogRef.current?.showModal();
  };

  const handleSaveAgentType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTypeId) return;

    // Vérifier les doublons de nom si le nom a changé
    if (
      editTypeName.trim().toLowerCase() !== editingTypeId.trim().toLowerCase() &&
      config.agentTypes.some(t => t.id.trim().toLowerCase() === editTypeName.trim().toLowerCase())
    ) {
      alert("Un type d'individu avec ce nom existe déjà !");
      return;
    }

    updateConfig(conf => {
      const typeIndex = conf.agentTypes.findIndex(t => t.id === editingTypeId);
      if (typeIndex !== -1) {
        conf.agentTypes[typeIndex] = {
          ...conf.agentTypes[typeIndex],
          id: editTypeName,
          color: editTypeColor,
          speed: editTypeSpeed,
          averageLifespan: editTypeLifespan,
          lifespanFluctuation: editTypeLifespanFluctuation,
          fertilityStartAge: editTypeFertilityStart,
          fertilityEndAge: editTypeFertilityEnd,
          communicationRadius: editTypeCommRange,
          dialect: editTypeDialect,
          intelligence: editTypeIntelligence,
          initialCount: editTypeInitialCount,
          hybridTendency: editTypeHybridTendency,
          shape: editTypeShape
        };
      }
    });

    if (selectedSpawnTypeTarget === editingTypeId) {
      setSelectedSpawnTypeTarget(editTypeName);
    }
    editDialogRef.current?.close();
    setEditingTypeId(null);
  };



  const handleRemoveFoodSpot = (id: string) => {
    updateConfig(conf => {
      conf.foodSpots = conf.foodSpots.filter(s => s.id !== id);
    });
    if (editingFoodSpotId === id) {
      editFoodDialogRef.current?.close();
      setEditingFoodSpotId(null);
    }
  };



  const handleRemoveWaterSpot = (id: string) => {
    updateConfig(conf => {
      conf.waterSpots = conf.waterSpots.filter(s => s.id !== id);
    });
    if (editingWaterSpotId === id) {
      editWaterDialogRef.current?.close();
      setEditingWaterSpotId(null);
    }
  };

  const startEditingWaterSpot = (spot: WaterSpot) => {
    setEditingWaterSpotId(spot.id);
    setEditWaterX(spot.x);
    setEditWaterY(spot.y);
    setEditWaterMaxQty(spot.maxQuantity);
    setEditWaterRepRate(spot.replenishRate);
    editWaterDialogRef.current?.showModal();
  };

  const handleSaveWaterSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingWaterSpotId) return;

    updateConfig(conf => {
      const idx = conf.waterSpots.findIndex(s => s.id === editingWaterSpotId);
      if (idx !== -1) {
        conf.waterSpots[idx] = {
          ...conf.waterSpots[idx],
          x: editWaterX,
          y: editWaterY,
          maxQuantity: editWaterMaxQty,
          replenishRate: editWaterRepRate,
          quantity: Math.min(conf.waterSpots[idx].quantity, editWaterMaxQty)
        };
      }
    });

    editWaterDialogRef.current?.close();
    setEditingWaterSpotId(null);
  };

  const startEditingFoodSpot = (spot: FoodSpot) => {
    setEditingFoodSpotId(spot.id);
    setEditFoodX(spot.x);
    setEditFoodY(spot.y);
    setEditFoodMaxQty(spot.maxQuantity);
    setEditFoodRepRate(spot.replenishRate);
    setEditFoodIsToxic(spot.isToxic);
    setEditFoodIsLethal(spot.isLethal);
    setEditFoodMalus(spot.malusType || 'none');
    setEditFoodIsMalusPermanent(spot.isMalusPermanent || false);
    setEditFoodMalusDuration(spot.malusDuration || 20);
    editFoodDialogRef.current?.showModal();
  };

  const handleSaveFoodSpot = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFoodSpotId) return;

    updateConfig(conf => {
      const idx = conf.foodSpots.findIndex(s => s.id === editingFoodSpotId);
      if (idx !== -1) {
        conf.foodSpots[idx] = {
          ...conf.foodSpots[idx],
          x: editFoodX,
          y: editFoodY,
          maxQuantity: editFoodMaxQty,
          replenishRate: editFoodRepRate,
          quantity: Math.min(conf.foodSpots[idx].quantity, editFoodMaxQty),
          isToxic: editFoodIsToxic,
          isLethal: editFoodIsLethal,
          malusType: editFoodMalus === 'none' ? null : editFoodMalus,
          isMalusPermanent: editFoodIsToxic && editFoodMalus !== 'none' ? editFoodIsMalusPermanent : false,
          malusDuration: editFoodIsToxic && editFoodMalus !== 'none' ? (editFoodIsMalusPermanent ? 0 : editFoodMalusDuration) : 0
        };
      }
    });

    editFoodDialogRef.current?.close();
    setEditingFoodSpotId(null);
  };

  const handleSelectSpotAt = (x: number, y: number): boolean => {
    const threshold = 30;
    
    let foundWater: WaterSpot | null = null;
    let minWaterDist = Infinity;
    for (const spot of config.waterSpots) {
      const dist = Math.hypot(spot.x - x, spot.y - y);
      if (dist < minWaterDist) {
        minWaterDist = dist;
        foundWater = spot;
      }
    }

    let foundFood: FoodSpot | null = null;
    let minFoodDist = Infinity;
    for (const spot of config.foodSpots) {
      const dist = Math.hypot(spot.x - x, spot.y - y);
      if (dist < minFoodDist) {
        minFoodDist = dist;
        foundFood = spot;
      }
    }

    if (minWaterDist < minFoodDist && minWaterDist <= threshold && foundWater) {
      startEditingWaterSpot(foundWater);
      return true;
    } else if (minFoodDist <= threshold && foundFood) {
      startEditingFoodSpot(foundFood);
      return true;
    }
    return false;
  };

  const handleRemoveSpotAt = (x: number, y: number): boolean => {
    const threshold = 30; // 15px de tolérance sur la mini-carte (30 unités de simulation)
    
    // Trouver l'eau la plus proche
    let foundWaterId: string | null = null;
    let minWaterDist = Infinity;
    for (const spot of config.waterSpots) {
      const dist = Math.hypot(spot.x - x, spot.y - y);
      if (dist < minWaterDist) {
        minWaterDist = dist;
        foundWaterId = spot.id;
      }
    }

    // Trouver la nourriture la plus proche
    let foundFoodId: string | null = null;
    let minFoodDist = Infinity;
    for (const spot of config.foodSpots) {
      const dist = Math.hypot(spot.x - x, spot.y - y);
      if (dist < minFoodDist) {
        minFoodDist = dist;
        foundFoodId = spot.id;
      }
    }

    // Supprimer le plus proche s'il est dans la tolérance
    if (minWaterDist < minFoodDist && minWaterDist <= threshold && foundWaterId) {
      handleRemoveWaterSpot(foundWaterId);
      return true;
    } else if (minFoodDist <= threshold && foundFoodId) {
      handleRemoveFoodSpot(foundFoodId);
      return true;
    }
    return false;
  };

  const handleMinimapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (justDraggedRef.current) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    const x = Math.round((clickX / rect.width) * config.width);
    const y = Math.round((clickY / rect.height) * config.height);

    if (editorMode === 'select') {
      handleSelectSpotAt(x, y);
    } else if (editorMode === 'eraser') {
      handleRemoveSpotAt(x, y);
    } else if (editorMode === 'spawn') {
      if (currentTarget) {
        updateConfig(conf => {
          const targetType = conf.agentTypes.find(t => t.id === currentTarget);
          if (targetType) {
            targetType.spawnX = x;
            targetType.spawnY = y;
          }
        });
      }
    } else if (editorMode === 'food') {
      const spot: FoodSpot = {
        id: generateSpotId('food'),
        x,
        y,
        quantity: 30,
        maxQuantity: 30,
        replenishRate: 0.5,
        isToxic: false,
        isLethal: false,
        malusType: null,
        malusDuration: 0,
        isMalusPermanent: false
      };
      updateConfig(conf => { conf.foodSpots.push(spot); });
    } else {
      const spot: WaterSpot = {
        id: generateSpotId('water'),
        x,
        y,
        quantity: 50,
        maxQuantity: 50,
        replenishRate: 1.0
      };
      updateConfig(conf => { conf.waterSpots.push(spot); });
    }
  };

  return (
    <div className="container" style={{ paddingBottom: '60px' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px' }}>
        <div>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sparkles color="var(--color-primary)" size={32} />
            Configurateur de Simulation
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px', textAlign: 'left' }}>
            Ajustez les paramètres initiaux et les règles de métissage de la population.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="btn btn-secondary" onClick={() => loadPreset(DEFAULT_CONFIG)}>
            Preset Défaut
          </button>
          <button className="btn btn-success" onClick={onStartSimulation} disabled={config.agentTypes.length === 0}>
            Lancer Simulation
          </button>
        </div>
      </header>

      {/* Grid principale de configuration */}
      <div className="grid-2" style={{ alignItems: 'stretch' }}>
        {/* Colonne Gauche : Paramètres globaux & Types d'individus */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Supprimé : Paramètres Globaux (désormais gérés par type d'individu) */}

          {/* Types d'Individus Actuels */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '16px' }}>
              <Users size={20} color="var(--color-purple)" />
              Types d'Individus ({config.agentTypes.length})
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', marginBottom: '16px', paddingRight: '4px' }}>
              {config.agentTypes.map((type, idx) => (
                <div key={type.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'rgba(15,23,42,0.4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
                        {type.shape === 'triangle' ? (
                          <polygon points="12,7 3,3 3,11" fill={type.color} />
                        ) : type.shape === 'square' ? (
                          <polygon points="11,7 7,3 3,7 7,11" fill={type.color} />
                        ) : (
                          <circle cx="7" cy="7" r="5" fill={type.color} />
                        )}
                      </svg>
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{type.id}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'left' }}>
                        Dialecte: {type.dialect} | Int: {type.intelligence} | Vitesse: {type.speed} | Forme: {type.shape === 'triangle' ? 'Triangle' : type.shape === 'square' ? 'Carré' : 'Cercle'}<br />
                        Spawn: ({type.spawnX}, {type.spawnY}) | Métissage: {Math.round(type.hybridTendency * 100)}% | Fluct: +/-{Math.round(type.lifespanFluctuation * 100)}%
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px', background: editingTypeId === type.id ? 'var(--color-purple)' : undefined }}
                      onClick={() => startEditingType(type)}
                      title="Modifier les paramètres"
                    >
                      <Edit2 size={14} color="#fff" />
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '6px 10px' }}
                      onClick={() => handleRemoveAgentType(idx)}
                      title="Supprimer"
                    >
                      <Trash2 size={14} color="var(--color-danger)" />
                    </button>
                  </div>
                </div>
              ))}
              {config.agentTypes.length === 0 && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', padding: '20px 0' }}>
                  Aucun type d'individu configuré. Veuillez en ajouter un ci-dessous.
                </div>
              )}
            </div>

            {/* Bouton d'ouverture du formulaire d'Ajout */}
            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button className="btn btn-primary" style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }} onClick={openAddDialog}>
                <Plus size={16} /> Créer un Type d'Individu
              </button>
            </div>
          </div>
        </div>

        {/* Colonne Droite : Points de ressources (Eau & Nourriture) */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Éditeur Visuel (Mini-Carte) */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '1.25rem', marginBottom: '8px', alignSelf: 'stretch', textAlign: 'left' }}>
              <Compass size={20} color="var(--color-primary)" />
              Éditeur Visuel (Mini-Carte)
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '16px', alignSelf: 'stretch', textAlign: 'left' }}>
              Sélectionnez une ressource, ajustez ses paramètres ci-dessous, puis cliquez sur la mini-carte pour la placer en direct.
            </p>

            {/* Sélecteur de mode */}
            <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', width: '100%', flexWrap: 'wrap' }}>
              <button
                className="btn"
                style={{
                  flex: '1 1 auto',
                  background: editorMode === 'select' ? 'var(--color-warning)' : 'rgba(15,23,42,0.4)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onClick={() => setEditorMode('select')}
              >
                ✏️ Éditer
              </button>
              <button
                className="btn"
                style={{
                  flex: '1 1 auto',
                  background: editorMode === 'food' ? 'var(--color-success)' : 'rgba(15,23,42,0.4)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '8px 10px'
                }}
                onClick={() => setEditorMode('food')}
              >
                🍏 Nourriture
              </button>
              <button
                className="btn"
                style={{
                  flex: '1 1 auto',
                  background: editorMode === 'water' ? 'var(--color-primary)' : 'rgba(15,23,42,0.4)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '8px 10px'
                }}
                onClick={() => setEditorMode('water')}
              >
                💧 Eau
              </button>
              <button
                className="btn"
                style={{
                  flex: '1 1 auto',
                  background: editorMode === 'spawn' ? 'var(--color-purple)' : 'rgba(15,23,42,0.4)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '8px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px'
                }}
                onClick={() => setEditorMode('spawn')}
              >
                <MapPin size={12} /> Pop
              </button>
              <button
                className="btn"
                style={{
                  flex: '1 1 auto',
                  background: editorMode === 'eraser' ? 'var(--color-danger)' : 'rgba(15,23,42,0.4)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8rem',
                  padding: '8px 10px'
                }}
                onClick={() => setEditorMode('eraser')}
              >
                ❌ Gomme
              </button>
            </div>

            {editorMode === 'spawn' && (
              <div style={{ marginTop: '12px', width: '100%', display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-start' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Sélectionnez le type à positionner :
                </label>
                <select
                  value={currentTarget}
                  onChange={(e) => setSelectedSpawnTypeTarget(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px',
                    borderRadius: 'var(--radius-sm)',
                    background: '#1e293b',
                    border: '1px solid var(--border-color)',
                    color: '#fff',
                    outline: 'none',
                    fontSize: '0.85rem'
                  }}
                  disabled={config.agentTypes.length === 0}
                >
                  {config.agentTypes.length === 0 ? (
                    <option value="">Aucun type créé</option>
                  ) : (
                    config.agentTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.id}
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}

            {/* La Mini-Carte Interactive */}
            <div
              ref={minimapContainerRef}
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const x = Math.round((clickX / rect.width) * config.width);
                const y = Math.round((clickY / rect.height) * config.height);
                setHoverCoords({ x, y });
              }}
              onMouseLeave={() => setHoverCoords(null)}
              onContextMenu={(e) => {
                e.preventDefault(); // Bloque le menu contextuel natif de Windows
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const clickY = e.clientY - rect.top;
                const x = Math.round((clickX / rect.width) * config.width);
                const y = Math.round((clickY / rect.height) * config.height);
                handleRemoveSpotAt(x, y); // Supprime au clic droit
              }}
              onClick={handleMinimapClick}
              style={{
                width: '100%',
                aspectRatio: '1 / 1',
                background: '#0f172a',
                border: '2px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                position: 'relative',
                cursor: editorMode === 'select' ? 'default' : editorMode === 'eraser' ? 'pointer' : 'crosshair',
                backgroundImage: 'radial-gradient(rgba(51, 65, 85, 0.15) 1px, transparent 0)',
                backgroundSize: '20px 20px'
              }}
            >
              {/* Rendre les points d'eau existants */}
              {config.waterSpots.map((spot) => {
                const isDragging = draggedItem?.type === 'water' && draggedItem.id === spot.id;
                return (
                  <div
                    key={spot.id}
                    onMouseDown={(e) => {
                      if (editorMode === 'select') {
                        e.stopPropagation();
                        e.preventDefault();
                        setDraggedItem({ type: 'water', id: spot.id });
                        setDraggedHasMoved(false);
                        justDraggedRef.current = false;
                      }
                    }}
                    onClick={(e) => {
                      if (editorMode === 'select') {
                        e.stopPropagation();
                        if (justDraggedRef.current) return;
                        startEditingWaterSpot(spot);
                      }
                    }}
                    style={{
                      position: 'absolute',
                      left: `${(spot.x / config.width) * 100}%`,
                      top: `${(spot.y / config.height) * 100}%`,
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      transform: 'translate(-50%, -50%)',
                      cursor: editorMode === 'select' ? (isDragging ? 'grabbing' : 'grab') : undefined,
                      transition: isDragging ? 'none' : 'transform 0.15s ease',
                      zIndex: isDragging ? 10 : 3,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      userSelect: 'none'
                    }}
                    className={editorMode === 'select' ? 'interactive-spot' : ''}
                    title={`Lac (${spot.x}, ${spot.y})${editorMode === 'select' ? ' - Cliquer pour éditer / Glisser pour déplacer' : ''}`}
                  >
                    💧
                  </div>
                );
              })}

              {/* Rendre les spots de nourriture existants */}
              {config.foodSpots.map((spot) => {
                const pulseClass = spot.isLethal ? 'spot-lethal' : spot.isToxic ? 'spot-toxic' : '';
                const interactiveClass = editorMode === 'select' ? 'interactive-spot' : '';
                const displayClass = `${pulseClass} ${interactiveClass}`.trim();

                 const isDragging = draggedItem?.type === 'food' && draggedItem.id === spot.id;

                 return (
                   <div
                     key={spot.id}
                     onMouseDown={(e) => {
                       if (editorMode === 'select') {
                         e.stopPropagation();
                         e.preventDefault();
                         setDraggedItem({ type: 'food', id: spot.id });
                         setDraggedHasMoved(false);
                         justDraggedRef.current = false;
                       }
                     }}
                     onClick={(e) => {
                       if (editorMode === 'select') {
                         e.stopPropagation();
                         if (justDraggedRef.current) return;
                         startEditingFoodSpot(spot);
                       }
                     }}
                     style={{
                       position: 'absolute',
                       left: `${(spot.x / config.width) * 100}%`,
                       top: `${(spot.y / config.height) * 100}%`,
                       width: '20px',
                       height: '20px',
                       borderRadius: '50%',
                       transform: 'translate(-50%, -50%)',
                       cursor: editorMode === 'select' ? (isDragging ? 'grabbing' : 'grab') : undefined,
                       transition: isDragging ? 'none' : 'transform 0.15s ease',
                       zIndex: isDragging ? 10 : 3,
                       display: 'flex',
                       alignItems: 'center',
                       justifyContent: 'center',
                       fontSize: '16px',
                       userSelect: 'none'
                     }}
                     className={displayClass || undefined}
                     title={`Nourriture (${spot.x}, ${spot.y}) - ${spot.isLethal ? 'Mortel' : spot.isToxic ? `Toxique (Malus: ${spot.malusType})` : 'Sain'}${editorMode === 'select' ? ' - Cliquer pour éditer / Glisser pour déplacer' : ''}`}
                   >
                     🍏
                    {spot.isLethal && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '10px',
                        height: '10px',
                        background: '#ef4444',
                        borderRadius: '50%',
                        border: '1px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6px',
                        lineHeight: 1,
                        color: '#fff',
                        zIndex: 2
                      }}>💀</div>
                    )}
                    {!spot.isLethal && spot.isToxic && (
                      <div style={{
                        position: 'absolute',
                        top: '-6px',
                        right: '-6px',
                        width: '10px',
                        height: '10px',
                        background: '#f59e0b',
                        borderRadius: '50%',
                        border: '1px solid #fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '6px',
                        lineHeight: 1,
                        color: '#fff',
                        zIndex: 2
                      }}>⚠</div>
                    )}
                  </div>
                );
              })}

              {/* Rendre les spawn points des types déjà existants */}
              {config.agentTypes.map((type) => {
                const isSelected = currentTarget === type.id && editorMode === 'spawn';
                const isDragging = draggedItem?.type === 'spawn' && draggedItem.id === type.id;
                const individualOffsets = [
                  { angle: 0, xOffset: 26, yOffset: 0 },
                  { angle: (2 * Math.PI) / 3, xOffset: -13, yOffset: 23 },
                  { angle: (4 * Math.PI) / 3, xOffset: -13, yOffset: -23 }
                ];

                return (
                  <React.Fragment key={`spawn-group-${type.id}`}>
                    <div
                      onMouseDown={(e) => {
                        if (editorMode === 'select') {
                          e.stopPropagation();
                          e.preventDefault();
                          setDraggedItem({ type: 'spawn', id: type.id });
                          setDraggedHasMoved(false);
                          justDraggedRef.current = false;
                        }
                      }}
                      onClick={(e) => {
                        if (editorMode === 'select') {
                          e.stopPropagation();
                        }
                      }}
                      style={{
                        position: 'absolute',
                        left: `${(type.spawnX / config.width) * 100}%`,
                        top: `${(type.spawnY / config.height) * 100}%`,
                        width: isSelected ? '22px' : '18px',
                        height: isSelected ? '22px' : '18px',
                        border: isSelected ? `2px solid ${type.color}` : `2px dashed ${type.color}`,
                        borderRadius: '50%',
                        transform: 'translate(-50%, -50%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isSelected ? `0 0 10px ${type.color}` : `0 0 6px ${type.color}`,
                        background: 'rgba(15, 23, 42, 0.6)',
                        transition: isDragging ? 'none' : 'all 0.2s ease-in-out',
                        zIndex: isDragging ? 10 : 4,
                        cursor: editorMode === 'select' ? (isDragging ? 'grabbing' : 'grab') : undefined
                      }}
                      title={`Spawn ${type.id} (${type.spawnX}, ${type.spawnY})${editorMode === 'select' ? ' - Glisser pour déplacer' : ''}`}
                    >
                      <span style={{ fontSize: isSelected ? '10px' : '8px', color: type.color, fontWeight: 'bold' }}>
                        {isSelected ? '★' : 'S'}
                      </span>
                    </div>

                    {/* Rendre 3 individus de prévisualisation */}
                    {individualOffsets.map((o, idx) => {
                      const indX = type.spawnX + o.xOffset;
                      const indY = type.spawnY + o.yOffset;
                      const angleDeg = (o.angle * 180) / Math.PI;
                      const shape = type.shape || 'circle';

                      return (
                        <div
                          key={`preview-${type.id}-${idx}`}
                          style={{
                            position: 'absolute',
                            left: `${(indX / config.width) * 100}%`,
                            top: `${(indY / config.height) * 100}%`,
                            width: '14px',
                            height: '14px',
                            transform: `translate(-50%, -50%) rotate(${angleDeg}deg)`,
                            pointerEvents: 'none',
                            zIndex: 5,
                            transition: isDragging ? 'none' : undefined
                          }}
                          title={`Individu prévis. - ${type.id} (${shape})`}
                        >
                          <svg width="14" height="14" viewBox="0 0 14 14" style={{ display: 'block' }}>
                            {shape === 'triangle' ? (
                               <>
                                 <polygon points="12,7 3,3 3,11" fill={type.color} stroke="#fff" strokeWidth="0.8" />
                                 <line x1="7" y1="7" x2="12" y2="7" stroke="#0f172a" strokeWidth="1" />
                               </>
                            ) : shape === 'square' ? (
                               <>
                                 <polygon points="11,7 7,3 3,7 7,11" fill={type.color} stroke="#fff" strokeWidth="0.8" />
                                 <line x1="7" y1="7" x2="11" y2="7" stroke="#0f172a" strokeWidth="1.2" />
                               </>
                            ) : (
                               <>
                                 <circle cx="7" cy="7" r="4.5" fill={type.color} stroke="#fff" strokeWidth="0.8" />
                                 <line x1="7" y1="7" x2="11.5" y2="7" stroke="#0f172a" strokeWidth="1.2" />
                               </>
                            )}
                          </svg>
                        </div>
                      );
                    })}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Coordonnées de survol */}
            <div style={{ marginTop: '10px', fontSize: '0.85rem', color: 'var(--text-secondary)', height: '20px' }}>
              {hoverCoords ? (
                <span>Placement : <strong>X: {hoverCoords.x}, Y: {hoverCoords.y}</strong></span>
              ) : (
                <span style={{ color: 'var(--text-muted)' }}>Survolez la carte pour voir les coordonnées</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        dialog::backdrop {
          background: rgba(15, 23, 42, 0.75) !important;
          backdrop-filter: blur(8px) !important;
        }
        .interactive-spot:hover {
          transform: translate(-50%, -50%) scale(1.3) !important;
          z-index: 10;
        }
        @keyframes emoji-pulse {
          0% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, -50%) scale(1.15); }
          100% { transform: translate(-50%, -50%) scale(1); }
        }
        .spot-toxic, .spot-lethal {
          animation: emoji-pulse 1.5s infinite ease-in-out;
        }
      `}</style>

      <dialog
        ref={editDialogRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          padding: '24px',
          width: '500px',
          maxWidth: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <form onSubmit={handleSaveAgentType} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0, textAlign: 'left' }}>
            Modifier le Type d'Individu
          </h3>
          
          <div className="grid-2">
            <div>
              <label>Nom du Type</label>
              <input type="text" value={editTypeName} onChange={(e) => setEditTypeName(e.target.value)} required />
            </div>
            <div>
              <label>Couleur</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="color" value={editTypeColor} onChange={(e) => setEditTypeColor(e.target.value)} style={{ width: '45px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent' }} />
                <input type="text" value={editTypeColor} onChange={(e) => setEditTypeColor(e.target.value)} placeholder="#hex" />
              </div>
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Vitesse Max</label>
              <input type="number" step="0.1" min="0.5" max="8" value={editTypeSpeed} onChange={(e) => setEditTypeSpeed(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Vie moyenne (s)</label>
              <input type="number" min="20" max="500" value={editTypeLifespan} onChange={(e) => setEditTypeLifespan(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Nombre initial</label>
              <input type="number" min="1" max="100" value={editTypeInitialCount} onChange={(e) => setEditTypeInitialCount(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Intelligence (0-100)</label>
              <input type="number" min="0" max="100" value={editTypeIntelligence} onChange={(e) => setEditTypeIntelligence(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Dialecte</label>
              <input type="text" value={editTypeDialect} onChange={(e) => setEditTypeDialect(e.target.value)} />
            </div>
            <div>
              <label>Rayon Comm (px)</label>
              <input type="number" min="10" max="200" value={editTypeCommRange} onChange={(e) => setEditTypeCommRange(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Âge début Fertile</label>
              <input type="number" min="0" value={editTypeFertilityStart} onChange={(e) => setEditTypeFertilityStart(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Âge fin Fertile</label>
              <input type="number" min="0" value={editTypeFertilityEnd} onChange={(e) => setEditTypeFertilityEnd(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Tendance Métissage (0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={editTypeHybridTendency} onChange={(e) => setEditTypeHybridTendency(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Fluct. Durée de Vie (0-0.5)</label>
              <input type="number" step="0.01" min="0" max="0.5" value={editTypeLifespanFluctuation} onChange={(e) => setEditTypeLifespanFluctuation(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Forme Visuelle</label>
              <select value={editTypeShape} onChange={(e) => setEditTypeShape(e.target.value as 'circle' | 'triangle' | 'square')}>
                <option value="circle">Cercle</option>
                <option value="triangle">Triangle</option>
                <option value="square">Carré / Losange</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => { editDialogRef.current?.close(); setEditingTypeId(null); }}>
              Annuler
            </button>
            <button type="submit" className="btn btn-success">
              Enregistrer
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={addDialogRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          padding: '24px',
          width: '500px',
          maxWidth: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <form onSubmit={handleAddAgentType} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0, textAlign: 'left' }}>
            Créer un Type d'Individu
          </h3>
          
          <div className="grid-2">
            <div>
              <label>Nom du Type</label>
              <input type="text" value={newTypeName} onChange={(e) => setNewTypeName(e.target.value)} required />
            </div>
            <div>
              <label>Couleur</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input type="color" value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} style={{ width: '45px', height: '40px', padding: '0', border: 'none', cursor: 'pointer', background: 'transparent' }} />
                <input type="text" value={newTypeColor} onChange={(e) => setNewTypeColor(e.target.value)} placeholder="#hex" />
              </div>
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Vitesse Max</label>
              <input type="number" step="0.1" min="0.5" max="8" value={newTypeSpeed} onChange={(e) => setNewTypeSpeed(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Vie moyenne (s)</label>
              <input type="number" min="20" max="500" value={newTypeLifespan} onChange={(e) => setNewTypeLifespan(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Nombre initial</label>
              <input type="number" min="1" max="100" value={newTypeInitialCount} onChange={(e) => setNewTypeInitialCount(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Intelligence (0-100)</label>
              <input type="number" min="0" max="100" value={newTypeIntelligence} onChange={(e) => setNewTypeIntelligence(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Dialecte</label>
              <input type="text" value={newTypeDialect} onChange={(e) => setNewTypeDialect(e.target.value)} />
            </div>
            <div>
              <label>Rayon Comm (px)</label>
              <input type="number" min="10" max="200" value={newTypeCommRange} onChange={(e) => setNewTypeCommRange(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Âge début Fertile</label>
              <input type="number" min="0" value={newTypeFertilityStart} onChange={(e) => setNewTypeFertilityStart(parseInt(e.target.value) || 0)} />
            </div>
            <div>
              <label>Âge fin Fertile</label>
              <input type="number" min="0" value={newTypeFertilityEnd} onChange={(e) => setNewTypeFertilityEnd(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="grid-3">
            <div>
              <label>Tendance Métissage (0-1)</label>
              <input type="number" step="0.05" min="0" max="1" value={newTypeHybridTendency} onChange={(e) => setNewTypeHybridTendency(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Fluct. Durée de Vie (0-0.5)</label>
              <input type="number" step="0.01" min="0" max="0.5" value={newTypeLifespanFluctuation} onChange={(e) => setNewTypeLifespanFluctuation(parseFloat(e.target.value) || 0)} />
            </div>
            <div>
              <label>Forme Visuelle</label>
              <select value={newTypeShape} onChange={(e) => setNewTypeShape(e.target.value as 'circle' | 'triangle' | 'square')}>
                <option value="circle">Cercle</option>
                <option value="triangle">Triangle</option>
                <option value="square">Carré / Losange</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => addDialogRef.current?.close()}>
              Annuler
            </button>
            <button type="submit" className="btn btn-success">
              Ajouter
            </button>
          </div>
        </form>
      </dialog>

      <dialog
        ref={editWaterDialogRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          padding: '24px',
          width: '450px',
          maxWidth: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <form onSubmit={handleSaveWaterSpot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0, textAlign: 'left' }}>
            Modifier le Point d'Eau
          </h3>

          <div className="grid-2">
            <div>
              <label>Coordonnée X (0-600)</label>
              <input type="number" min="10" max="590" value={editWaterX} onChange={(e) => setEditWaterX(parseInt(e.target.value) || 0)} required />
            </div>
            <div>
              <label>Coordonnée Y (0-600)</label>
              <input type="number" min="10" max="590" value={editWaterY} onChange={(e) => setEditWaterY(parseInt(e.target.value) || 0)} required />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Quantité Max (Capacité)</label>
              <input type="number" min="5" value={editWaterMaxQty} onChange={(e) => setEditWaterMaxQty(parseInt(e.target.value) || 0)} required />
            </div>
            <div>
              <label>Taux Régén/s</label>
              <input type="number" step="0.1" min="0" value={editWaterRepRate} onChange={(e) => setEditWaterRepRate(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ background: 'var(--color-danger)', border: 'none' }}
              onClick={() => {
                if (editingWaterSpotId) {
                  handleRemoveWaterSpot(editingWaterSpotId);
                }
              }}
            >
              Supprimer
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { editWaterDialogRef.current?.close(); setEditingWaterSpotId(null); }}>
                Annuler
              </button>
              <button type="submit" className="btn btn-success">
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </dialog>

      <dialog
        ref={editFoodDialogRef}
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          margin: 0,
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(15, 23, 42, 0.95)',
          color: '#fff',
          padding: '24px',
          width: '500px',
          maxWidth: '90%',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(10px)'
        }}
      >
        <form onSubmit={handleSaveFoodSpot} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', margin: 0, textAlign: 'left' }}>
            Modifier le Spot de Nourriture
          </h3>

          <div className="grid-2">
            <div>
              <label>Coordonnée X (0-600)</label>
              <input type="number" min="10" max="590" value={editFoodX} onChange={(e) => setEditFoodX(parseInt(e.target.value) || 0)} required />
            </div>
            <div>
              <label>Coordonnée Y (0-600)</label>
              <input type="number" min="10" max="590" value={editFoodY} onChange={(e) => setEditFoodY(parseInt(e.target.value) || 0)} required />
            </div>
          </div>

          <div className="grid-2">
            <div>
              <label>Quantité Max (Capacité)</label>
              <input type="number" min="5" value={editFoodMaxQty} onChange={(e) => setEditFoodMaxQty(parseInt(e.target.value) || 0)} required />
            </div>
            <div>
              <label>Taux Régén/s</label>
              <input type="number" step="0.1" min="0" value={editFoodRepRate} onChange={(e) => setEditFoodRepRate(parseFloat(e.target.value) || 0)} required />
            </div>
          </div>

          <div className="grid-3" style={{ alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', paddingTop: '15px' }}>
              <input type="checkbox" id="editFoodIsToxic" checked={editFoodIsToxic} onChange={(e) => {
                setEditFoodIsToxic(e.target.checked);
                if (e.target.checked) setEditFoodIsLethal(false);
              }} />
              <label htmlFor="editFoodIsToxic" style={{ margin: 0, cursor: 'pointer' }}>Toxique</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', paddingTop: '15px' }}>
              <input type="checkbox" id="editFoodIsLethal" checked={editFoodIsLethal} onChange={(e) => {
                setEditFoodIsLethal(e.target.checked);
                if (e.target.checked) setEditFoodIsToxic(false);
              }} />
              <label htmlFor="editFoodIsLethal" style={{ margin: 0, cursor: 'pointer' }}>Mortel</label>
            </div>
            <div>
              <label>Type de Malus</label>
              <select value={editFoodMalus} onChange={(e) => setEditFoodMalus(e.target.value as 'speed' | 'intelligence' | 'fertility' | 'none')} disabled={!editFoodIsToxic}>
                <option value="none">Aucun</option>
                <option value="speed">Vitesse (-40%)</option>
                <option value="intelligence">Intelligence (-30%)</option>
                <option value="fertility">Fertilité (-30%)</option>
              </select>
            </div>
          </div>

          {editFoodIsToxic && editFoodMalus !== 'none' && (
            <div className="grid-2" style={{ alignItems: 'center', marginTop: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%', paddingTop: '15px' }}>
                <input
                  type="checkbox"
                  id="editFoodIsMalusPermanent"
                  checked={editFoodIsMalusPermanent}
                  onChange={(e) => setEditFoodIsMalusPermanent(e.target.checked)}
                />
                <label htmlFor="editFoodIsMalusPermanent" style={{ margin: 0, cursor: 'pointer' }}>Malus Permanent</label>
              </div>
              <div>
                <label>Durée du Malus (secondes)</label>
                <input
                  type="number"
                  min="1"
                  max="300"
                  value={editFoodMalusDuration}
                  onChange={(e) => setEditFoodMalusDuration(parseInt(e.target.value) || 0)}
                  disabled={editFoodIsMalusPermanent}
                  required={!editFoodIsMalusPermanent}
                />
              </div>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ background: 'var(--color-danger)', border: 'none' }}
              onClick={() => {
                if (editingFoodSpotId) {
                  handleRemoveFoodSpot(editingFoodSpotId);
                }
              }}
            >
              Supprimer
            </button>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => { editFoodDialogRef.current?.close(); setEditingFoodSpotId(null); }}>
                Annuler
              </button>
              <button type="submit" className="btn btn-success">
                Enregistrer
              </button>
            </div>
          </div>
        </form>
      </dialog>
    </div>
  );
};
