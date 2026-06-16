import { type Agent, type AgentTypeConfig, type AgentMemoryItem } from './types';

export class AgentHelper {
  // Crée un agent initial
  static create(id: string, x: number, y: number, config: AgentTypeConfig): Agent {
    const lifespanOffset = (Math.random() * 2 - 1) * config.lifespanFluctuation;
    const maxAge = config.averageLifespan * (1 + lifespanOffset);

    return {
      id,
      x,
      y,
      vx: (Math.random() - 0.5) * config.speed,
      vy: (Math.random() - 0.5) * config.speed,
      radius: 6,

      // Besoins (démarrent au hasard entre 60 et 100)
      hunger: 60 + Math.random() * 40,
      thirst: 60 + Math.random() * 40,
      fatigue: Math.random() * 30,

      age: 0,
      maxAge,

      // Gènes hérités
      speed: config.speed,
      intelligence: config.intelligence,
      communicationRadius: config.communicationRadius,
      dialect: config.dialect,
      color: config.color,
      fertilityStartAge: config.fertilityStartAge,
      fertilityEndAge: config.fertilityEndAge,
      hybridTendency: config.hybridTendency,
      lifespanFluctuation: config.lifespanFluctuation,
      shape: config.shape || 'circle',

      fertilityIndex: 1.0,
      state: 'WANDERING',
      knownSpots: {},
      courtshipTargetId: null,
      courtshipTicks: 0,
      sleepTicks: 0,

      isDead: false,
      deathCause: null,
      maluses: []
    };
  }

  // Crée un enfant via métissage (crossover 50/50 des caractéristiques)
  static crossover(
    parentA: Agent,
    parentB: Agent,
    id: string,
    x: number,
    y: number
  ): Agent {
    const choose = <T>(valA: T, valB: T): T => (Math.random() < 0.5 ? valA : valB);

    const speed = choose(parentA.speed, parentB.speed);
    const intelligence = choose(parentA.intelligence, parentB.intelligence);
    const communicationRadius = choose(parentA.communicationRadius, parentB.communicationRadius);
    const dialect = choose(parentA.dialect, parentB.dialect);
    const color = choose(parentA.color, parentB.color);
    const fertilityStartAge = choose(parentA.fertilityStartAge, parentB.fertilityStartAge);
    const fertilityEndAge = choose(parentA.fertilityEndAge, parentB.fertilityEndAge);
    const hybridTendency = choose(parentA.hybridTendency, parentB.hybridTendency);
    const lifespanFluctuation = choose(parentA.lifespanFluctuation, parentB.lifespanFluctuation);

    // Moyenne des espérances de vie moyennes des parents
    const avgLifespan = (parentA.maxAge + parentB.maxAge) / 2;
    const lifespanOffset = (Math.random() * 2 - 1) * lifespanFluctuation;
    const maxAge = avgLifespan * (1 + lifespanOffset);

    return {
      id,
      x,
      y,
      vx: (Math.random() - 0.5) * speed,
      vy: (Math.random() - 0.5) * speed,
      radius: 4, // Légèrement plus petit à la naissance

      // Besoins au max au départ (nourris par les parents)
      hunger: 90 + Math.random() * 10,
      thirst: 90 + Math.random() * 10,
      fatigue: 10 + Math.random() * 20,

      age: 0,
      maxAge,

      speed,
      intelligence,
      communicationRadius,
      dialect,
      color,
      fertilityStartAge,
      fertilityEndAge,
      hybridTendency,
      lifespanFluctuation,
      shape: choose(parentA.shape || 'circle', parentB.shape || 'circle'),

      fertilityIndex: 1.0,
      state: 'WANDERING',
      knownSpots: {},
      courtshipTargetId: null,
      courtshipTicks: 0,
      sleepTicks: 0,

      isDead: false,
      deathCause: null,
      maluses: []
    };
  }

  // Calcule la vitesse maximale actuelle en appliquant les malus
  static getMaxSpeed(agent: Agent): number {
    let speedReduction = 0;
    for (const m of agent.maluses) {
      if (m.type === 'speed') {
        speedReduction += m.amount;
      }
    }
    return Math.max(0.2 * agent.speed, agent.speed * (1 - speedReduction));
  }

  // Calcule l'intelligence actuelle
  static getIntelligence(agent: Agent): number {
    let intReduction = 0;
    for (const m of agent.maluses) {
      if (m.type === 'intelligence') {
        intReduction += m.amount;
      }
    }
    return Math.max(5, agent.intelligence * (1 - intReduction));
  }

  // Détermine si un agent est fertile à son âge actuel
  static isFertile(agent: Agent): boolean {
    if (agent.isDead) return false;
    if (agent.age < agent.fertilityStartAge || agent.age > agent.fertilityEndAge) {
      return false;
    }
    // Calcul de la fertilité dynamique (considère l'index et les malus)
    let fertilityReduction = 0;
    for (const m of agent.maluses) {
      if (m.type === 'fertility') {
        fertilityReduction += m.amount;
      }
    }
    const currentFertility = agent.fertilityIndex * (1 - fertilityReduction);
    return currentFertility > 0.1; // Seuil minimum
  }

  // Met à jour l'agent d'un pas de simulation (1 tick = 1 seconde de simulation)
  static tick(agent: Agent, dt: number): void {
    if (agent.isDead) return;

    // Vieillissement
    agent.age += dt;
    if (agent.age >= agent.maxAge) {
      agent.isDead = true;
      agent.deathCause = 'old_age';
      return;
    }

    // Usure naturelle des besoins
    // S'il dort, les besoins baissent moins vite, s'il court, ils baissent plus vite
    const speedMult = Math.hypot(agent.vx, agent.vy) / agent.speed;
    const isSleeping = agent.state === 'SLEEPING';

    const hungerDecay = isSleeping ? 0.3 : (0.6 + speedMult * 0.4);
    const thirstDecay = isSleeping ? 0.4 : (0.8 + speedMult * 0.6);
    const fatigueRate = isSleeping ? -5.0 : (0.4 + speedMult * 0.6); // Récupération en dormant

    agent.hunger = Math.max(0, agent.hunger - hungerDecay * dt);
    agent.thirst = Math.max(0, agent.thirst - thirstDecay * dt);
    agent.fatigue = Math.max(0, Math.min(100, agent.fatigue + fatigueRate * dt));

    // Mort par inanition ou soif
    if (agent.hunger <= 0) {
      agent.isDead = true;
      agent.deathCause = 'hunger';
      return;
    }
    if (agent.thirst <= 0) {
      agent.isDead = true;
      agent.deathCause = 'thirst';
      return;
    }

    // Gestion de la croissance physique (de bébé à adulte)
    if (agent.radius < 6) {
      agent.radius = Math.min(6, agent.radius + 0.1 * dt);
    }

    // Mise à jour des malus
    for (const m of agent.maluses) {
      if (!m.isPermanent) {
        m.duration = Math.max(0, m.duration - dt);
      }
    }
    agent.maluses = agent.maluses.filter(m => m.isPermanent || m.duration > 0);
  }

  // FSM : Met à jour l'état de l'agent selon ses priorités
  static updateState(agent: Agent): void {
    if (agent.isDead) return;

    // 1. Sommeil (Priorité haute si épuisé)
    if (agent.state === 'SLEEPING') {
      if (agent.fatigue <= 5) {
        agent.state = 'WANDERING'; // Réveillé
      }
      return;
    }

    if (agent.fatigue >= 95) {
      agent.state = 'SLEEPING';
      agent.courtshipTargetId = null;
      return;
    }

    // 2. Survie (Faim et soif urgentes)
    const isHungry = agent.hunger < 35;
    const isThirsty = agent.thirst < 35;

    // Déterminer s'il y a un danger proche à fuir (nourriture mortelle connue dans un rayon de 80px)
    let shouldFlee = false;
    for (const spotId in agent.knownSpots) {
      const spot = agent.knownSpots[spotId];
      if (spot.status === 'deadly' || spot.status === 'toxic') {
        const dist = Math.hypot(spot.x - agent.x, spot.y - agent.y);
        if (dist < 80) {
          shouldFlee = true;
          break;
        }
      }
    }

    if (shouldFlee) {
      agent.state = 'FLEEING';
      agent.courtshipTargetId = null;
      return;
    }

    if (isThirsty) {
      agent.state = 'SEEKING_WATER';
      agent.courtshipTargetId = null;
      return;
    }

    if (isHungry) {
      agent.state = 'SEEKING_FOOD';
      agent.courtshipTargetId = null;
      return;
    }

    // 3. Courtise / Reproduction (Basse priorité)
    if (agent.state === 'COURTING') {
      // Si la courtise est rompue (le partenaire est mort, parti, etc.), on repasse à WANDERING
      if (!agent.courtshipTargetId) {
        agent.state = 'WANDERING';
      }
      return;
    }

    // Si pas de besoin urgent, et fertile
    if (this.isFertile(agent)) {
      // L'agent cherche activement un partenaire
      agent.state = 'COURTING';
      return;
    }

    // Par défaut, errance
    agent.state = 'WANDERING';
    agent.courtshipTargetId = null;
  }

  // Physique : Met à jour la vitesse et la position (Steering Behaviors)
  static updatePhysics(
    agent: Agent,
    width: number,
    height: number,
    knownFoods: AgentMemoryItem[],
    knownWaters: AgentMemoryItem[],
    dangers: AgentMemoryItem[],
    otherAgents: Agent[],
    dt: number
  ): void {
    if (agent.isDead) {
      agent.vx = 0;
      agent.vy = 0;
      return;
    }

    if (agent.state === 'SLEEPING') {
      // Ralentissement complet pour dormir
      agent.vx = agent.vx * 0.8;
      agent.vy = agent.vy * 0.8;
      agent.x += agent.vx * dt;
      agent.y += agent.vy * dt;
      return;
    }

    const maxSpeed = this.getMaxSpeed(agent);
    let desiredVx = agent.vx;
    let desiredVy = agent.vy;

    // 1. Comportement d'Errance de base (Wander)
    const wanderForceX = (Math.random() - 0.5) * 1.5;
    const wanderForceY = (Math.random() - 0.5) * 1.5;
    desiredVx += wanderForceX;
    desiredVy += wanderForceY;

    // 2. Comportements orientés besoins
    if (agent.state === 'SEEKING_FOOD' && knownFoods.length > 0) {
      // Trouver la nourriture saine connue la plus proche
      let nearest: AgentMemoryItem | null = null;
      let minDist = Infinity;
      for (const spot of knownFoods) {
        if (spot.status === 'safe') {
          const dist = Math.hypot(spot.x - agent.x, spot.y - agent.y);
          if (dist < minDist) {
            minDist = dist;
            nearest = spot;
          }
        }
      }

      if (nearest) {
        const dx = nearest.x - agent.x;
        const dy = nearest.y - agent.y;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpeed;
        desiredVy = (dy / dist) * maxSpeed;
      }
    } else if (agent.state === 'SEEKING_WATER' && knownWaters.length > 0) {
      // Trouver l'eau connue la plus proche
      let nearest: AgentMemoryItem | null = null;
      let minDist = Infinity;
      for (const spot of knownWaters) {
        const dist = Math.hypot(spot.x - agent.x, spot.y - agent.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = spot;
        }
      }

      if (nearest) {
        const dx = nearest.x - agent.x;
        const dy = nearest.y - agent.y;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpeed;
        desiredVy = (dy / dist) * maxSpeed;
      }
    } else if (agent.state === 'FLEEING' && dangers.length > 0) {
      // Fuir le danger connu le plus proche
      let nearest: AgentMemoryItem | null = null;
      let minDist = Infinity;
      for (const d of dangers) {
        const dist = Math.hypot(d.x - agent.x, d.y - agent.y);
        if (dist < minDist) {
          minDist = dist;
          nearest = d;
        }
      }

      if (nearest) {
        const dx = agent.x - nearest.x; // Vecteur de fuite (opposé)
        const dy = agent.y - nearest.y;
        const dist = Math.hypot(dx, dy) || 1;
        desiredVx = (dx / dist) * maxSpeed;
        desiredVy = (dy / dist) * maxSpeed;
      }
    } else if (agent.state === 'COURTING' && agent.courtshipTargetId) {
      // Aller vers le partenaire
      const partner = otherAgents.find(a => a.id === agent.courtshipTargetId);
      if (partner) {
        const dx = partner.x - agent.x;
        const dy = partner.y - agent.y;
        const dist = Math.hypot(dx, dy);

        if (dist > 10) {
          // Si trop loin, on s'approche normalement
          desiredVx = (dx / dist) * maxSpeed;
          desiredVy = (dy / dist) * maxSpeed;
        } else {
          // Si on est déjà collé pour s'accoupler, on bouge très lentement
          desiredVx = (dx / (dist || 1)) * maxSpeed * 0.15;
          desiredVy = (dy / (dist || 1)) * maxSpeed * 0.15;
        }
      }
    }

    // Blending : applique les changements de direction en douceur
    // Plus l'intelligence est élevée, plus les virages/réactions peuvent être rapides
    const reactionFactor = 0.04 + (this.getIntelligence(agent) / 100) * 0.06;
    agent.vx = agent.vx * (1 - reactionFactor) + desiredVx * reactionFactor;
    agent.vy = agent.vy * (1 - reactionFactor) + desiredVy * reactionFactor;

    // Limiter la vitesse à maxSpeed
    const currentSpeed = Math.hypot(agent.vx, agent.vy);
    if (currentSpeed > maxSpeed && currentSpeed > 0) {
      agent.vx = (agent.vx / currentSpeed) * maxSpeed;
      agent.vy = (agent.vy / currentSpeed) * maxSpeed;
    }

    // Mise à jour de la position
    agent.x += agent.vx * dt;
    agent.y += agent.vy * dt;

    // Évitement des bords (forces de répulsion douces)
    const margin = 20;
    if (agent.x < margin) {
      agent.vx += 0.5 * maxSpeed * dt;
    } else if (agent.x > width - margin) {
      agent.vx -= 0.5 * maxSpeed * dt;
    }

    if (agent.y < margin) {
      agent.vy += 0.5 * maxSpeed * dt;
    } else if (agent.y > height - margin) {
      agent.vy -= 0.5 * maxSpeed * dt;
    }

    // Contrainte stricte pour ne pas sortir du canvas
    agent.x = Math.max(agent.radius, Math.min(width - agent.radius, agent.x));
    agent.y = Math.max(agent.radius, Math.min(height - agent.radius, agent.y));
  }
}
