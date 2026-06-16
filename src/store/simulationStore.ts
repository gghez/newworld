import { create } from 'zustand';
import { type Agent, type FoodSpot, type WaterSpot, type DangerZone, type SimulationConfig } from '../core/types';
import { SimulationEngine } from '../core/SimulationEngine';

export interface SimulationHistoryPoint {
  tick: number;
  population: number;
  typeCounts: Record<string, number>;
}

export interface SimulationState {
  // Config active
  config: SimulationConfig;
  
  // États de simulation réactifs pour l'UI
  isRunning: boolean;
  speedMultiplier: number;
  tickCount: number;
  agents: Agent[];
  foodSpots: FoodSpot[];
  waterSpots: WaterSpot[];
  dangerZones: DangerZone[];
  selectedAgentId: string | null;
  history: SimulationHistoryPoint[];

  // Actions
  updateConfig: (updater: (config: SimulationConfig) => void) => void;
  loadPreset: (preset: SimulationConfig) => void;
  start: () => void;
  pause: () => void;
  step: (dt: number) => void;
  reset: () => void;
  setSpeed: (mult: number) => void;
  setSelectedAgentId: (id: string | null) => void;
}

// Configuration par défaut de départ (Preset Premium)
export const DEFAULT_CONFIG: SimulationConfig = {
  width: 600,
  height: 600,
  agentTypes: [
    {
      id: 'Sapiens (Bleu)',
      color: '#3b82f6',
      speed: 1.8,
      averageLifespan: 120, // 120s
      lifespanFluctuation: 0.15,
      fertilityStartAge: 18,
      fertilityEndAge: 85,
      communicationRadius: 70,
      dialect: 'Dialect Alpha',
      intelligence: 85,
      initialCount: 15,
      hybridTendency: 0.3,
      spawnX: 136,
      spawnY: 156,
      shape: 'circle'
    },
    {
      id: 'Néandertal (Orange)',
      color: '#f97316',
      speed: 2.4,
      averageLifespan: 80, // 80s
      lifespanFluctuation: 0.1,
      fertilityStartAge: 14,
      fertilityEndAge: 60,
      communicationRadius: 45,
      dialect: 'Dialect Bêta',
      intelligence: 35,
      initialCount: 15,
      hybridTendency: 0.2,
      spawnX: 450,
      spawnY: 450,
      shape: 'triangle'
    }
  ],
  foodSpots: [
    {
      id: 'food-bush-1',
      x: 511,
      y: 333,
      quantity: 40,
      maxQuantity: 40,
      replenishRate: 0.8,
      isToxic: false,
      isLethal: false,
      malusType: null,
      malusDuration: 0,
      isMalusPermanent: false
    },
    {
      id: 'food-toxic-berries',
      x: 435,
      y: 157,
      quantity: 30,
      maxQuantity: 30,
      replenishRate: 0.4,
      isToxic: true,
      isLethal: false,
      malusType: 'speed',
      malusDuration: 15, // 15s de ralentissement
      isMalusPermanent: false
    },
    {
      id: 'food-poison-mushroom',
      x: 300,
      y: 400,
      quantity: 20,
      maxQuantity: 20,
      replenishRate: 0.25,
      isToxic: false,
      isLethal: true,
      malusType: null,
      malusDuration: 0,
      isMalusPermanent: false
    }
  ],
  waterSpots: [
    {
      id: 'water-lake-1',
      x: 150,
      y: 450,
      quantity: 60,
      maxQuantity: 60,
      replenishRate: 1.2
    },
    {
      id: 'water-lake-2',
      x: 450,
      y: 450,
      quantity: 60,
      maxQuantity: 60,
      replenishRate: 1.2
    },
    {
      id: 'water-1781650279138-1',
      x: 494,
      y: 289,
      quantity: 50,
      maxQuantity: 50,
      replenishRate: 1.0
    }
  ],
  dangerZones: []
};

// Lecture de la config sauvegardée ou défaut
const getInitialConfig = (): SimulationConfig => {
  try {
    const saved = localStorage.getItem('sim_config');
    if (saved) {
      const parsed = JSON.parse(saved) as SimulationConfig;
      
      // Assainir les types d'agents existants s'ils ont été enregistrés dans une version précédente sans les nouveaux paramètres
      if (parsed.agentTypes && Array.isArray(parsed.agentTypes)) {
        parsed.agentTypes = parsed.agentTypes.map((type, index) => {
          const spawnX = type.spawnX !== undefined ? type.spawnX : (index === 0 ? 150 : 450);
          const spawnY = type.spawnY !== undefined ? type.spawnY : (index === 0 ? 150 : 450);
          const hybridTendency = type.hybridTendency !== undefined ? type.hybridTendency : 0.3;
          const lifespanFluctuation = type.lifespanFluctuation !== undefined ? type.lifespanFluctuation : 0.15;
          const shape = type.shape !== undefined ? type.shape : (index === 0 ? 'circle' : 'triangle');
          
          return {
            ...type,
            spawnX,
            spawnY,
            hybridTendency,
            lifespanFluctuation,
            shape
          };
        });
      }
      
      return parsed;
    }
  } catch (e) {
    console.error('Erreur lors du chargement de la configuration sauvegardée', e);
  }
  return DEFAULT_CONFIG;
};

// Instance non réactive globale du moteur physique pour éviter le re-rendu de React
let engineInstance: SimulationEngine | null = null;
let lastTickHistoryTime = 0;

export const useSimulationStore = create<SimulationState>((set, get) => ({
  config: JSON.parse(JSON.stringify(getInitialConfig())),
  isRunning: false,
  speedMultiplier: 1,
  tickCount: 0,
  agents: [],
  foodSpots: [],
  waterSpots: [],
  dangerZones: [],
  selectedAgentId: null,
  history: [],

  updateConfig: (updater) => {
    const newConfig = JSON.parse(JSON.stringify(get().config)) as SimulationConfig;
    updater(newConfig);
    localStorage.setItem('sim_config', JSON.stringify(newConfig));
    set({ config: newConfig });
    get().reset(); // Réinitialise avec la nouvelle config
  },

  loadPreset: (preset) => {
    const deepCopiedPreset = JSON.parse(JSON.stringify(preset)) as SimulationConfig;
    localStorage.setItem('sim_config', JSON.stringify(deepCopiedPreset));
    set({ config: deepCopiedPreset });
    get().reset();
  },

  start: () => {
    if (!engineInstance) {
      engineInstance = new SimulationEngine(get().config);
    }
    set({ isRunning: true });
  },

  pause: () => {
    set({ isRunning: false });
  },

  step: (dt) => {
    if (!engineInstance) {
      engineInstance = new SimulationEngine(get().config);
    }

    const speed = get().speedMultiplier;
    const totalSimDt = dt * speed;

    // Sub-stepping physique pour maintenir la stabilité des trajectoires et collisions
    const maxStep = 0.02; // max 20ms par calcul physique
    const steps = Math.ceil(totalSimDt / maxStep);
    const stepDt = totalSimDt / steps;

    for (let i = 0; i < steps; i++) {
      engineInstance.update(stepDt);
    }

    // Mise à jour de l'historique de statistiques toutes les 1 seconde de simulation
    const newTickCount = get().tickCount + totalSimDt;
    const newHistory = [...get().history];

    if (newTickCount - lastTickHistoryTime >= 1.0) {
      lastTickHistoryTime = newTickCount;

      // Calculer les comptes par type
      const typeCounts: Record<string, number> = {};
      for (const agent of engineInstance.agents) {
        if (!agent.isDead) {
          typeCounts[agent.color] = (typeCounts[agent.color] || 0) + 1;
        }
      }

      newHistory.push({
        tick: Math.round(newTickCount),
        population: engineInstance.agents.filter(a => !a.isDead).length,
        typeCounts
      });

      // Limiter à 300 points d'historique pour les performances du graphe
      if (newHistory.length > 300) {
        newHistory.shift();
      }
    }

    // Mettre à jour l'état réactif de React
    set({
      agents: engineInstance.agents.map(a => ({ ...a })), // Copie de surface pour forcer React à réagir
      foodSpots: engineInstance.foodSpots.map(s => ({ ...s })),
      waterSpots: engineInstance.waterSpots.map(s => ({ ...s })),
      tickCount: newTickCount,
      history: newHistory
    });

    // Si tout le monde est mort, on arrête la simulation
    const livingCount = engineInstance.agents.filter(a => !a.isDead).length;
    if (livingCount === 0 && engineInstance.agents.length > 0 && get().isRunning) {
      set({ isRunning: false });
    }
  },

  reset: () => {
    engineInstance = new SimulationEngine(get().config);
    lastTickHistoryTime = 0;
    set({
      isRunning: false,
      tickCount: 0,
      agents: engineInstance.agents.map(a => ({ ...a })),
      foodSpots: engineInstance.foodSpots.map(s => ({ ...s })),
      waterSpots: engineInstance.waterSpots.map(s => ({ ...s })),
      dangerZones: engineInstance.dangerZones.map(d => ({ ...d })),
      selectedAgentId: null,
      history: [
        {
          tick: 0,
          population: engineInstance.agents.filter(a => !a.isDead).length,
          typeCounts: engineInstance.agents.reduce((acc, a) => {
            acc[a.color] = (acc[a.color] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        }
      ]
    });
  },

  setSpeed: (mult) => {
    set({ speedMultiplier: mult });
  },

  setSelectedAgentId: (id) => {
    set({ selectedAgentId: id });
  }
}));

// Exposition globale pour tests rapides et Chrome DevTools (conforme à AGENTS.md)
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).simulationStore = useSimulationStore;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).getEngine = () => engineInstance;
}
