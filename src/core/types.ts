export type AgentState =
  | 'WANDERING'
  | 'SEEKING_FOOD'
  | 'SEEKING_WATER'
  | 'COURTING'
  | 'SLEEPING'
  | 'FLEEING';

export type DeathCause = 'old_age' | 'hunger' | 'thirst' | 'poison';

export type MalusType = 'speed' | 'intelligence' | 'fertility';

export interface AgentMalus {
  type: MalusType;
  amount: number;      // Pourcentage de réduction (ex: 0.3 = -30%)
  duration: number;    // Nombre de ticks restants
  isPermanent: boolean;
}

export interface AgentMemoryItem {
  id: string;
  type: 'food' | 'water' | 'danger';
  status: 'safe' | 'toxic' | 'deadly';
  x: number;
  y: number;
}

export interface Agent {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;

  // Besoins (0 = mourant, 100 = repu/parfait)
  hunger: number;
  thirst: number;
  fatigue: number;     // (0 = reposé, 100 = épuisé)

  // Cycle de vie
  age: number;         // En ticks ou secondes
  maxAge: number;      // Calculé à la naissance (durée de vie réelle)

  // Caractéristiques individuelles (héritées par crossover 50/50)
  speed: number;              // Vitesse max
  intelligence: number;        // Niveau d'intelligence (0 à 100)
  communicationRadius: number; // En pixels
  dialect: string;            // Identifiant du dialecte
  color: string;              // Couleur visuelle du type
  fertilityStartAge: number;   // Âge min fertile
  fertilityEndAge: number;     // Âge max fertile
  hybridTendency: number;      // Gène individuel (tendance au métissage)
  lifespanFluctuation: number; // Gène individuel (fluctuation durée de vie)
  shape?: 'circle' | 'triangle' | 'square'; // Forme visuelle de l'individu

  // Fertilité dynamique (de 0.0 à 1.0)
  fertilityIndex: number;      // Réduit par les malus de toxicité

  // États internes de la FSM
  state: AgentState;
  knownSpots: Record<string, AgentMemoryItem>;
  courtshipTargetId: string | null;
  courtshipTicks: number;
  sleepTicks: number;

  // Statut
  isDead: boolean;
  deathCause: DeathCause | null;
  maluses: AgentMalus[];
}

export interface AgentTypeConfig {
  id: string;                  // Nom du type (ex: "Type A")
  color: string;               // Couleur hex
  speed: number;               // Vitesse max
  averageLifespan: number;     // En ticks/secondes
  lifespanFluctuation: number; // Pourcentage de fluctuation (ex: 0.1 pour +/- 10%)
  fertilityStartAge: number;   // Âge de début de fertilité
  fertilityEndAge: number;     // Âge de fin de fertilité
  communicationRadius: number; // En pixels
  dialect: string;             // Nom du dialecte (ex: "Dialect 1")
  intelligence: number;         // Niveau (0 à 100)
  initialCount: number;        // Nombre au démarrage
  hybridTendency: number;      // Tendance au métissage (0 à 1)
  spawnX: number;              // Point de pop initial X
  spawnY: number;              // Point de pop initial Y
  shape?: 'circle' | 'triangle' | 'square'; // Forme visuelle de l'individu
}

export interface FoodSpot {
  id: string;
  x: number;
  y: number;
  quantity: number;
  maxQuantity: number;
  replenishRate: number;
  isToxic: boolean;
  isLethal: boolean;
  malusType: MalusType | null;
  malusDuration: number;       // En ticks
  isMalusPermanent: boolean;
}

export interface WaterSpot {
  id: string;
  x: number;
  y: number;
  quantity: number;
  maxQuantity: number;
  replenishRate: number;
}

export interface DangerZone {
  id: string;
  x: number;
  y: number;
  radius: number;
}

export interface SimulationConfig {
  width: number;
  height: number;
  agentTypes: AgentTypeConfig[];
  foodSpots: FoodSpot[];
  waterSpots: WaterSpot[];
  dangerZones: DangerZone[];
}
