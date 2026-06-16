import { describe, it, expect } from 'vitest';
import { AgentHelper } from '../Agent';
import { SimulationEngine } from '../SimulationEngine';
import { type AgentTypeConfig, type SimulationConfig } from '../types';

describe('Tests de la Logique de Simulation Spatiale', () => {
  const mockConfigTypeA: AgentTypeConfig = {
    id: 'Type A',
    color: '#ff0000',
    speed: 5,
    averageLifespan: 100,
    lifespanFluctuation: 0.1, // +/- 10%
    fertilityStartAge: 18,
    fertilityEndAge: 80,
    communicationRadius: 50,
    dialect: 'Dialect 1',
    intelligence: 80,
    initialCount: 0,
    hybridTendency: 0.5,
    spawnX: 100,
    spawnY: 100
  };

  const mockConfigTypeB: AgentTypeConfig = {
    id: 'Type B',
    color: '#0000ff',
    speed: 2,
    averageLifespan: 60,
    lifespanFluctuation: 0,
    fertilityStartAge: 10,
    fertilityEndAge: 50,
    communicationRadius: 30,
    dialect: 'Dialect 2',
    intelligence: 20,
    initialCount: 0,
    hybridTendency: 0.5,
    spawnX: 200,
    spawnY: 200
  };

  const baseSimConfig: SimulationConfig = {
    width: 500,
    height: 500,
    agentTypes: [mockConfigTypeA, mockConfigTypeB],
    foodSpots: [],
    waterSpots: [],
    dangerZones: []
  };

  describe('Génétique et Crossover (Hérédité)', () => {
    it('devrait mélanger les caractéristiques des parents à 50/50', () => {
      const parentA = AgentHelper.create('pA', 10, 10, mockConfigTypeA);
      const parentB = AgentHelper.create('pB', 10, 10, mockConfigTypeB);

      // Effectuer 20 naissances et vérifier que les gènes proviennent bien de parentA ou parentB uniquement
      for (let i = 0; i < 20; i++) {
        const child = AgentHelper.crossover(parentA, parentB, `child-${i}`, 10, 10);
        
        expect([parentA.speed, parentB.speed]).toContain(child.speed);
        expect([parentA.intelligence, parentB.intelligence]).toContain(child.intelligence);
        expect([parentA.communicationRadius, parentB.communicationRadius]).toContain(child.communicationRadius);
        expect([parentA.dialect, parentB.dialect]).toContain(child.dialect);
        expect([parentA.color, parentB.color]).toContain(child.color);
        expect([parentA.fertilityStartAge, parentB.fertilityStartAge]).toContain(child.fertilityStartAge);
        expect([parentA.fertilityEndAge, parentB.fertilityEndAge]).toContain(child.fertilityEndAge);
      }
    });

    it('devrait fluctuer la durée de vie réelle selon la formule', () => {
      const parentA = AgentHelper.create('pA', 10, 10, mockConfigTypeA);
      const parentB = AgentHelper.create('pB', 10, 10, mockConfigTypeA); // Même type pour simplifier
      
      const child = AgentHelper.crossover(parentA, parentB, 'c1', 10, 10); // +/- 10%
      const avgParentLifespan = (parentA.maxAge + parentB.maxAge) / 2;
      
      // La durée de vie réelle doit être comprise entre 90% et 110% de la moyenne des parents
      expect(child.maxAge).toBeGreaterThanOrEqual(avgParentLifespan * 0.9);
      expect(child.maxAge).toBeLessThanOrEqual(avgParentLifespan * 1.1);
    });
  });

  describe('Machine à États (FSM) et Priorité des Besoins', () => {
    it('devrait chercher de la nourriture en priorité si très affamé', () => {
      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 25; // Seuil critique faim (< 35)
      agent.thirst = 90;
      agent.fatigue = 10;
      agent.age = 30; // Fertile

      AgentHelper.updateState(agent);
      expect(agent.state).toBe('SEEKING_FOOD');
    });

    it('devrait chercher de l\'eau en priorité si très assoiffé', () => {
      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 90;
      agent.thirst = 20; // Seuil critique soif (< 35)
      agent.fatigue = 10;
      agent.age = 30; // Fertile

      AgentHelper.updateState(agent);
      expect(agent.state).toBe('SEEKING_WATER');
    });

    it('devrait dormir si la fatigue est critique', () => {
      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 90;
      agent.thirst = 90;
      agent.fatigue = 98; // Seuil critique fatigue (>= 95)

      AgentHelper.updateState(agent);
      expect(agent.state).toBe('SLEEPING');
    });

    it('devrait courtiser si en bonne santé et dans la phase fertile', () => {
      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 80;
      agent.thirst = 80;
      agent.fatigue = 10;
      agent.age = 30; // fertile (entre 18 et 80)

      AgentHelper.updateState(agent);
      expect(agent.state).toBe('COURTING');
    });

    it('ne devrait pas être fertile si trop jeune ou trop vieux', () => {
      const youngAgent = AgentHelper.create('ay', 10, 10, mockConfigTypeA);
      youngAgent.age = 5; // Fertile commence à 18
      expect(AgentHelper.isFertile(youngAgent)).toBe(false);

      const oldAgent = AgentHelper.create('ao', 10, 10, mockConfigTypeA);
      oldAgent.age = 85; // Fertile finit à 80
      expect(AgentHelper.isFertile(oldAgent)).toBe(false);
    });
  });

  describe('Toxicité et Malus', () => {
    it('devrait appliquer des malus de vitesse lors de la consommation de nourriture toxique', () => {
      const engine = new SimulationEngine({
        ...baseSimConfig,
        foodSpots: [
          {
            id: 'food-toxic',
            x: 100,
            y: 100,
            quantity: 5,
            maxQuantity: 5,
            replenishRate: 1,
            isToxic: true,
            isLethal: false,
            malusType: 'speed',
            malusDuration: 10,
            isMalusPermanent: false
          }
        ]
      });

      // Créer un agent affamé sur le spot
      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 20;
      agent.state = 'SEEKING_FOOD';
      engine.agents = [agent];

      // Exécuter un pas pour forcer la consommation
      engine.update(1);

      // L'agent doit avoir consommé le fruit toxique
      expect(agent.hunger).toBeGreaterThan(20);
      expect(agent.knownSpots['food-toxic'].status).toBe('toxic');
      
      // Un malus de vitesse doit être présent dans sa liste
      const speedMalus = agent.maluses.find(m => m.type === 'speed');
      expect(speedMalus).toBeDefined();
      expect(speedMalus?.amount).toBe(0.4); // -40%

      // La vitesse maximale calculée doit être diminuée
      const normalSpeed = agent.speed;
      const reducedSpeed = AgentHelper.getMaxSpeed(agent);
      expect(reducedSpeed).toBeLessThan(normalSpeed);
    });

    it('devrait causer la mort de l\'agent en cas de nourriture mortelle', () => {
      const engine = new SimulationEngine({
        ...baseSimConfig,
        foodSpots: [
          {
            id: 'food-deadly',
            x: 100,
            y: 100,
            quantity: 5,
            maxQuantity: 5,
            replenishRate: 1,
            isToxic: false,
            isLethal: true,
            malusType: null,
            malusDuration: 0,
            isMalusPermanent: false
          }
        ]
      });

      const agent = AgentHelper.create('a1', 100, 100, mockConfigTypeA);
      agent.hunger = 20;
      agent.state = 'SEEKING_FOOD';
      engine.agents = [agent];

      engine.update(1);

      expect(agent.isDead).toBe(true);
      expect(agent.deathCause).toBe('poison');
    });
  });

  describe('Apprentissage Social et Déduction Spatiale', () => {
    it('devrait transmettre les connaissances entre agents proches du même dialecte', () => {
      const engine = new SimulationEngine({
        ...baseSimConfig,
        // On configure 1 spot pour qu'il soit dans la liste
        foodSpots: [
          {
            id: 'food-1',
            x: 200,
            y: 200,
            quantity: 5,
            maxQuantity: 5,
            replenishRate: 1,
            isToxic: true,
            isLethal: false,
            malusType: null,
            malusDuration: 0,
            isMalusPermanent: false
          }
        ]
      });

      // Agent A connaît la nourriture comme toxique
      const agentA = AgentHelper.create('aA', 100, 100, mockConfigTypeA);
      agentA.knownSpots['food-1'] = { id: 'food-1', type: 'food', status: 'toxic', x: 200, y: 200 };

      // Agent B ne connaît rien du spot de nourriture (considéré comme safe par défaut ou absent)
      const agentB = AgentHelper.create('aB', 110, 110, mockConfigTypeA); // Même dialecte, très proche (distance ~14px, comm radius = 50px)
      agentB.knownSpots['food-1'] = { id: 'food-1', type: 'food', status: 'safe', x: 200, y: 200 };

      engine.agents = [agentA, agentB];

      // On simule quelques cycles de partage (on force la transmission avec dt élevé)
      for (let i = 0; i < 50; i++) {
        engine.update(1);
        if (agentB.knownSpots['food-1'].status === 'toxic') {
          break;
        }
      }

      // Agent B a dû recevoir l'information de danger
      expect(agentB.knownSpots['food-1'].status).toBe('toxic');
    });

    it('devrait permettre aux témoins intelligents de déduire le danger lors du décès d\'un pair', () => {
      const engine = new SimulationEngine({
        ...baseSimConfig,
        foodSpots: [
          {
            id: 'food-poison',
            x: 100,
            y: 100,
            quantity: 5,
            maxQuantity: 5,
            replenishRate: 1,
            isToxic: false,
            isLethal: true,
            malusType: null,
            malusDuration: 0,
            isMalusPermanent: false
          }
        ]
      });

      // Agent A (très intelligent, 100) est à côté
      const observer = AgentHelper.create('obs', 110, 100, {
        ...mockConfigTypeA,
        intelligence: 100, // Déduction garantie (100% de chance)
        communicationRadius: 50,
        dialect: 'Dialect 1'
      });
      observer.knownSpots['food-poison'] = { id: 'food-poison', type: 'food', status: 'safe', x: 100, y: 100 };

      // Agent B va consommer et mourir
      const victim = AgentHelper.create('victim', 100, 100, {
        ...mockConfigTypeA,
        dialect: 'Dialect 1' // Même dialecte pour l'observation sociale
      });
      victim.hunger = 20;
      victim.state = 'SEEKING_FOOD';

      engine.agents = [observer, victim];

      // Exécuter 1 tick
      engine.update(1);

      // La victime meurt de poison
      expect(victim.isDead).toBe(true);
      expect(victim.deathCause).toBe('poison');

      // L'observateur très intelligent a déduit la cause et enregistré le spot comme mortel
      expect(observer.knownSpots['food-poison'].status).toBe('deadly');
    });
  });
});
