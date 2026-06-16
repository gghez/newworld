import { type Agent, type FoodSpot, type WaterSpot, type DangerZone, type SimulationConfig, type AgentMemoryItem } from './types';
import { AgentHelper } from './Agent';

export class SimulationEngine {
  agents: Agent[] = [];
  foodSpots: FoodSpot[] = [];
  waterSpots: WaterSpot[] = [];
  dangerZones: DangerZone[] = [];
  config: SimulationConfig;

  private nextAgentId = 1;
  private deadAgentsTicks: Map<string, number> = new Map(); // Compte les ticks post-mortem pour le nettoyage

  constructor(config: SimulationConfig) {
    this.config = config;
    this.reset();
  }

  // Réinitialise la simulation à son état de départ
  reset(): void {
    this.agents = [];
    this.deadAgentsTicks.clear();
    this.nextAgentId = 1;

    // Copie profonde des ressources pour pouvoir réinitialiser
    this.foodSpots = this.config.foodSpots.map(s => ({ ...s, quantity: s.maxQuantity }));
    this.waterSpots = this.config.waterSpots.map(s => ({ ...s, quantity: s.maxQuantity }));
    this.dangerZones = this.config.dangerZones.map(d => ({ ...d }));

    // Spawner les agents initiaux par type
    for (const typeConfig of this.config.agentTypes) {
      for (let i = 0; i < typeConfig.initialCount; i++) {
        // Positionnement groupé autour du point de spawn initial (dispersion rayon 30px)
        const margin = 20;
        const offsetRadius = 30;
        const rx = (Math.random() - 0.5) * 2 * offsetRadius;
        const ry = (Math.random() - 0.5) * 2 * offsetRadius;
        const x = Math.max(margin, Math.min(this.config.width - margin, typeConfig.spawnX + rx));
        const y = Math.max(margin, Math.min(this.config.height - margin, typeConfig.spawnY + ry));

        const id = `agent-${this.nextAgentId++}`;
        const agent = AgentHelper.create(id, x, y, typeConfig);

        // Au départ, chaque agent connaît les ressources saines proches d'elles (ou de tout le monde)
        // Pour aider la simulation à démarrer, ils connaissent les spots dans leur mémoire initiale
        this.initializeAgentMemory(agent);

        this.agents.push(agent);
      }
    }
  }

  // Remplit la mémoire initiale d'un agent avec les ressources de base
  private initializeAgentMemory(agent: Agent): void {
    // Les agents découvrent automatiquement les points d'eau
    for (const water of this.waterSpots) {
      agent.knownSpots[water.id] = {
        id: water.id,
        type: 'water',
        status: 'safe',
        x: water.x,
        y: water.y
      };
    }

    // Ils découvrent la nourriture, mais ignorent au départ si elle est toxique ou mortelle
    // (Ils pensent par défaut qu'elle est 'safe' avant d'avoir testé ou appris le contraire)
    for (const food of this.foodSpots) {
      agent.knownSpots[food.id] = {
        id: food.id,
        type: 'food',
        status: 'safe', // L'innocence de départ !
        x: food.x,
        y: food.y
      };
    }
  }

  // Exécute un pas de simulation (1 tick = 1 seconde de simulation)
  update(dt: number): void {
    // 1. Régénération des ressources
    this.regenerateResources(dt);

    // 2. Gestion de la boucle de chaque agent (Besoins, FSM, Mort)
    const livingAgents = this.agents.filter(a => !a.isDead);
    const deadAgents = this.agents.filter(a => a.isDead);

    for (const agent of livingAgents) {
      AgentHelper.tick(agent, dt);

      if (agent.isDead) {
        this.handleAgentDeath(agent);
      } else {
        AgentHelper.updateState(agent);
      }
    }

    // Gérer la disparition des cadavres après 5 ticks (secondes)
    for (const dead of deadAgents) {
      const currentTicks = this.deadAgentsTicks.get(dead.id) || 0;
      if (currentTicks >= 5) {
        this.agents = this.agents.filter(a => a.id !== dead.id);
        this.deadAgentsTicks.delete(dead.id);
      } else {
        this.deadAgentsTicks.set(dead.id, currentTicks + dt);
      }
    }

    // Mettre à jour la liste des agents vivants après les morts potentielles du tick
    const activeAgents = this.agents.filter(a => !a.isDead);

    // 3. Interactions physiques et sociales
    this.handleResourceConsumption(activeAgents);
    this.handleSocialLearning(activeAgents, dt);
    this.handleCourtshipAndReproduction(activeAgents, dt);

    // 4. Physique et déplacement
    this.updatePhysics(activeAgents, dt);
  }

  // Régénère les spots d'eau et de nourriture
  private regenerateResources(dt: number): void {
    for (const food of this.foodSpots) {
      food.quantity = Math.min(food.maxQuantity, food.quantity + food.replenishRate * dt);
    }
    for (const water of this.waterSpots) {
      water.quantity = Math.min(water.maxQuantity, water.quantity + water.replenishRate * dt);
    }
  }

  // Gère la mort d'un agent et la déduction par observation
  private handleAgentDeath(agent: Agent): void {
    this.deadAgentsTicks.set(agent.id, 0);

    // Si la mort est causée par du poison (ou si l'agent était sur un spot de nourriture létal)
    if (agent.deathCause === 'poison') {
      // Trouver les agents proches parlant le même dialecte
      const observers = this.agents.filter(
        a => !a.isDead && a.dialect === agent.dialect && a.id !== agent.id
      );

      // Trouver le spot de nourriture le plus proche (sur lequel l'agent est mort)
      let nearestFood: FoodSpot | null = null;
      let minDist = 30; // Doit être très proche du spot
      for (const food of this.foodSpots) {
        const dist = Math.hypot(food.x - agent.x, food.y - agent.y);
        if (dist < minDist) {
          minDist = dist;
          nearestFood = food;
        }
      }

      if (nearestFood) {
        for (const observer of observers) {
          const distToDeath = Math.hypot(observer.x - agent.x, observer.y - agent.y);
          if (distToDeath <= observer.communicationRadius) {
            // Chance de déduction basée sur l'intelligence
            // Intelligence de 100 = 100% de chance, 50 = 50% de chance, etc.
            const deductionChance = AgentHelper.getIntelligence(observer) / 100;
            if (Math.random() < deductionChance) {
              // L'observateur déduit que le spot est mortel
              observer.knownSpots[nearestFood.id] = {
                id: nearestFood.id,
                type: 'food',
                status: 'deadly',
                x: nearestFood.x,
                y: nearestFood.y
              };
            }
          }
        }
      }
    }
  }

  // Gère la consommation des ressources (Manger & Boire)
  private handleResourceConsumption(activeAgents: Agent[]): void {
    const consumptionRadius = 15;

    for (const agent of activeAgents) {
      if (agent.state === 'SEEKING_FOOD') {
        // Trouver le spot le plus proche dans le rayon de consommation
        let nearest: FoodSpot | null = null;
        let minDist = Infinity;
        for (const food of this.foodSpots) {
          if (food.quantity >= 1) {
            const dist = Math.hypot(food.x - agent.x, food.y - agent.y);
            if (dist < minDist) {
              minDist = dist;
              nearest = food;
            }
          }
        }

        if (nearest && minDist <= consumptionRadius) {
          // Consommer
          nearest.quantity = Math.max(0, nearest.quantity - 1);
          agent.hunger = Math.min(100, agent.hunger + 40);

          // S'assurer que le spot est dans la mémoire
          if (!agent.knownSpots[nearest.id]) {
            agent.knownSpots[nearest.id] = {
              id: nearest.id,
              type: 'food',
              status: 'safe',
              x: nearest.x,
              y: nearest.y
            };
          }

          // Mettre à jour sa mémoire
          if (nearest.isLethal) {
            agent.knownSpots[nearest.id].status = 'deadly';
            agent.isDead = true;
            agent.deathCause = 'poison';
            this.handleAgentDeath(agent);
            continue;
          } else if (nearest.isToxic) {
            agent.knownSpots[nearest.id].status = 'toxic';
            // Appliquer le malus
            if (nearest.malusType) {
              agent.maluses.push({
                type: nearest.malusType,
                amount: nearest.malusType === 'speed' ? 0.4 : 0.3, // -40% vitesse, ou -30% autres
                duration: nearest.malusDuration,
                isPermanent: nearest.isMalusPermanent
              });
            }
            // Dégât immédiat
            agent.hunger = Math.max(5, agent.hunger - 15);
          } else {
            agent.knownSpots[nearest.id].status = 'safe';
          }
        }
      } else if (agent.state === 'SEEKING_WATER') {
        // Trouver le spot d'eau le plus proche
        let nearest: WaterSpot | null = null;
        let minDist = Infinity;
        for (const water of this.waterSpots) {
          if (water.quantity >= 1) {
            const dist = Math.hypot(water.x - agent.x, water.y - agent.y);
            if (dist < minDist) {
              minDist = dist;
              nearest = water;
            }
          }
        }

        if (nearest && minDist <= consumptionRadius) {
          // Consommer
          nearest.quantity = Math.max(0, nearest.quantity - 1);
          agent.thirst = Math.min(100, agent.thirst + 45);

          if (!agent.knownSpots[nearest.id]) {
            agent.knownSpots[nearest.id] = {
              id: nearest.id,
              type: 'water',
              status: 'safe',
              x: nearest.x,
              y: nearest.y
            };
          }
          agent.knownSpots[nearest.id].status = 'safe';
        }
      }
    }
  }

  // Gère la transmission sociale de connaissances (Social Learning)
  private handleSocialLearning(activeAgents: Agent[], dt: number): void {
    // Pour chaque couple d'agents à proximité partageant le même dialecte
    for (let i = 0; i < activeAgents.length; i++) {
      const agentA = activeAgents[i];
      for (let j = i + 1; j < activeAgents.length; j++) {
        const agentB = activeAgents[j];

        if (agentA.dialect === agentB.dialect) {
          const dist = Math.hypot(agentA.x - agentB.x, agentA.y - agentB.y);
          const commRange = Math.min(agentA.communicationRadius, agentB.communicationRadius);

          if (dist <= commRange) {
            // Chance de communication par tick basée sur l'intelligence moyenne
            const avgIntelligence = (AgentHelper.getIntelligence(agentA) + AgentHelper.getIntelligence(agentB)) / 2;
            const transferChance = (avgIntelligence / 100) * 0.15 * dt; // Taux de transfert équilibré

            if (Math.random() < transferChance) {
              this.shareKnowledge(agentA, agentB);
            }
          }
        }
      }
    }
  }

  // Partage les connaissances spatiales entre deux agents
  private shareKnowledge(agentA: Agent, agentB: Agent): void {
    // A donne ses infos à B, B donne ses infos à A
    const spotsA = { ...agentA.knownSpots };
    const spotsB = { ...agentB.knownSpots };

    // Fusion des informations
    for (const spotId in spotsA) {
      const itemA = spotsA[spotId];
      const itemB = spotsB[spotId];

      if (!itemB || this.getPriorityOfStatus(itemA.status) > this.getPriorityOfStatus(itemB.status)) {
        // Si B ne connaît pas le spot, ou si A a une information plus critique (ex: 'toxic'/'deadly' vs 'safe')
        agentB.knownSpots[spotId] = { ...itemA };
      }
    }

    for (const spotId in spotsB) {
      const itemB = spotsB[spotId];
      const itemA = spotsA[spotId];

      if (!itemA || this.getPriorityOfStatus(itemB.status) > this.getPriorityOfStatus(itemA.status)) {
        agentA.knownSpots[spotId] = { ...itemB };
      }
    }
  }

  // Donne la sévérité d'un état de ressource pour prioriser lors de l'apprentissage
  private getPriorityOfStatus(status: 'safe' | 'toxic' | 'deadly'): number {
    if (status === 'deadly') return 3;
    if (status === 'toxic') return 2;
    return 1;
  }

  // Gère la courtise et la reproduction (Birth & Crossover)
  private handleCourtshipAndReproduction(activeAgents: Agent[], dt: number): void {
    // 1. Nettoyage des cibles invalides
    for (const agent of activeAgents) {
      if (agent.state === 'COURTING' && agent.courtshipTargetId) {
        const target = activeAgents.find(a => a.id === agent.courtshipTargetId);
        if (!target || target.state !== 'COURTING' || target.courtshipTargetId !== agent.id) {
          // Si le partenaire n'est plus disponible/mort
          agent.courtshipTargetId = null;
          agent.courtshipTicks = 0;
        }
      }
    }

    // 2. Recherche de partenaires pour les célibataires
    const singleCourters = activeAgents.filter(
      a => a.state === 'COURTING' && a.courtshipTargetId === null
    );

    for (const agentA of singleCourters) {
      if (agentA.courtshipTargetId !== null) continue; // Déjà accouplé dans cette boucle

      // Chercher le partenaire le plus proche
      let nearestPartner: Agent | null = null;
      let minDist = 100; // Rayon max de recherche d'amour (100px)

      for (const agentB of activeAgents) {
        if (
          agentB.id === agentA.id ||
          agentB.state !== 'COURTING' ||
          agentB.courtshipTargetId !== null
        ) {
          continue;
        }

        // Test de compatibilité
        const isCompatible = agentA.dialect === agentB.dialect
          ? true
          : Math.random() < (agentA.hybridTendency + agentB.hybridTendency) / 2;

        if (isCompatible) {
          const dist = Math.hypot(agentB.x - agentA.x, agentB.y - agentA.y);
          if (dist < minDist) {
            minDist = dist;
            nearestPartner = agentB;
          }
        }
      }

      if (nearestPartner) {
        // Lier les deux partenaires
        agentA.courtshipTargetId = nearestPartner.id;
        nearestPartner.courtshipTargetId = agentA.id;
        agentA.courtshipTicks = 0;
        nearestPartner.courtshipTicks = 0;
      }
    }

    // 3. Avancement de la courtise et naissance
    const pairedAgents = activeAgents.filter(
      a => a.state === 'COURTING' && a.courtshipTargetId !== null
    );

    // Pour éviter le double traitement du couple, on garde une trace des traités
    const processedPairs = new Set<string>();

    for (const agentA of pairedAgents) {
      if (processedPairs.has(agentA.id)) continue;

      const agentB = activeAgents.find(a => a.id === agentA.courtshipTargetId);
      if (!agentB) continue;

      processedPairs.add(agentA.id);
      processedPairs.add(agentB.id);

      const dist = Math.hypot(agentA.x - agentB.x, agentA.y - agentB.y);
      if (dist <= 20) {
        // Ils sont proches, la courtise progresse
        agentA.courtshipTicks += dt;
        agentB.courtshipTicks += dt;

        // Naissance après 4 ticks d'accouplement
        if (agentA.courtshipTicks >= 4) {
          const childX = (agentA.x + agentB.x) / 2;
          const childY = (agentA.y + agentB.y) / 2;
          const childId = `agent-${this.nextAgentId++}`;

          const child = AgentHelper.crossover(
            agentA,
            agentB,
            childId,
            childX,
            childY
          );

          // L'enfant hérite d'une fusion des mémoires des parents
          this.shareKnowledge(agentA, child);
          this.shareKnowledge(agentB, child);

          this.agents.push(child);

          // Conséquences physiques pour les parents (fatigue + faim/soif)
          agentA.fatigue = Math.min(100, agentA.fatigue + 30);
          agentB.fatigue = Math.min(100, agentB.fatigue + 30);
          agentA.hunger = Math.max(10, agentA.hunger - 15);
          agentB.hunger = Math.max(10, agentB.hunger - 15);
          agentA.thirst = Math.max(10, agentA.thirst - 15);
          agentB.thirst = Math.max(10, agentB.thirst - 15);

          // Reset des états
          agentA.courtshipTargetId = null;
          agentB.courtshipTargetId = null;
          agentA.courtshipTicks = 0;
          agentB.courtshipTicks = 0;
          agentA.state = 'WANDERING';
          agentB.state = 'WANDERING';
        }
      } else {
        // S'ils s'éloignent, les ticks de courtise diminuent
        agentA.courtshipTicks = Math.max(0, agentA.courtshipTicks - dt);
        agentB.courtshipTicks = Math.max(0, agentB.courtshipTicks - dt);
      }
    }
  }

  // Met à jour la physique et les mouvements des agents
  private updatePhysics(activeAgents: Agent[], dt: number): void {
    const width = this.config.width;
    const height = this.config.height;

    for (const agent of activeAgents) {
      // Extraire les mémoires connues par l'agent
      const knownFoods: AgentMemoryItem[] = [];
      const knownWaters: AgentMemoryItem[] = [];
      const dangers: AgentMemoryItem[] = [];

      for (const spotId in agent.knownSpots) {
        const spot = agent.knownSpots[spotId];
        if (spot.type === 'food') {
          if (spot.status === 'safe') {
            knownFoods.push(spot);
          } else {
            dangers.push(spot);
          }
        } else if (spot.type === 'water') {
          knownWaters.push(spot);
        } else if (spot.type === 'danger') {
          dangers.push(spot);
        }
      }

      AgentHelper.updatePhysics(
        agent,
        width,
        height,
        knownFoods,
        knownWaters,
        dangers,
        activeAgents,
        dt
      );
    }
  }
}
