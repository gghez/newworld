# AGENTS.md - Instructions pour l'Agent IA (Antigravity)

Ce fichier sert de guide de référence pour tout agent de programmation travaillant sur ce projet. Il décrit la stack technique, les commandes, les règles d'architecture et les méthodes de débogage.

---

## 1. Aperçu du Projet

Il s'agit d'un **jeu de simulation spatiale et démographique en 2D** conçu pour observer l'émergence de comportements sociaux (déplacement fluide, métissage génétique, consommation de ressources, transmission de connaissances spatiales et dialectes).

- **Framework principal :** Vite + React (TypeScript)
- **Gestion de l'État :** Zustand (pour un état global réactif et découplé des composants)
- **Visualisation :** HTML5 Canvas (simulation physique 2D) & Chart.js (courbes statistiques)
- **Persistance :** LocalStorage (sauvegarde automatique de la configuration de simulation)
- **Style :** CSS Vanilla moderne (Flexbox, CSS Grid, Variables CSS, Transitions/Animations)

---

## 2. Commandes Communes

- **Installer les dépendances :** `npm install`
- **Lancer le serveur de développement :** `npm run dev` (démarre sur `http://localhost:5173`)
- **Vérifier le code (Linter) :** `npm run lint`
- **Compiler pour la production :** `npm run build`
- **Exécuter les tests unitaires :** `npm run test`

---

## 3. Structure & Architecture du Code

Le code doit être structuré de manière modulaire pour séparer la simulation mathématique et physique pure du rendu React.

```text
/src
  ├── core/                 # Logique physique et comportementale pure (TypeScript)
  │   ├── types.ts          # Interfaces typées pour les entités
  │   ├── Agent.ts          # Comportement d'errance, de besoins, FSM et crossover
  │   └── SimulationEngine.ts # Moteur physique, collisions, reproduction et communication
  ├── store/                # Store Zustand reliant le moteur core à l'UI React
  │   └── simulationStore.ts
  ├── components/           # Composants React (Setup, Canvas Simulation, Stats)
  │   ├── SetupScreen.tsx
  │   ├── SimulationScreen.tsx
  │   └── StatsPanel.tsx
  ├── App.tsx               # Point d'entrée principal de l'UI
  └── main.tsx
```

### Directives Importantes :
1. **Séparation du Métier :** N'écrivez pas de formules physiques de forces (steering behaviors) ou de crossover génétique directement dans les composants React. Utilisez le dossier `core/` et connectez le tout via Zustand.
2. **Types TypeScript :** Utilisez un typage fort pour toutes les entités (agents, nourriture, eau, configuration). Utilisez des imports de types séparés (`import type { ... }`) conformément aux règles `verbatimModuleSyntax`.
3. **Mise à jour de la documentation (Règle Projet) :** Chaque fois qu'une règle ou mécanique du jeu change, mettez immédiatement à jour le document de description **[docs/game_description.md](docs/game_description.md)** pour que la spécification reste synchronisée.
4. **Pas de chemins absolus :** N'insérez jamais de chemins absolus (ex: `C:/Users/...` ou `file:///C:...`) dans les fichiers d'instruction, de documentation ou de code. Utilisez exclusivement des chemins d'accès relatifs.
5. **Git Worktree Sync :** When starting work in a git worktree, ensure it is fully up-to-date with origin/main (fetch origin and rebase your active branch on origin/main before making any edits).

---

## 4. Règles de Design & Styles CSS

1. **CSS Vanilla :** Utilisez du CSS natif et moderne. Pas de framework utilitaire (comme TailwindCSS) sauf demande explicite du projet.
2. **Design System & Variables :** Déclarez toutes les couleurs, espacements et polices dans `:root` (dans `src/index.css`) pour une gestion propre des thèmes (sombre/clair).
3. **Transitions & Micro-animations :** Implémentez des effets de survol (`hover`), des transitions fluides et des indicateurs visuels (ex: Zzz de sommeil, cœurs d'accouplement).
4. **Responsivité :** Utilisez Flexbox et CSS Grid pour que l'interface s'adapte à différentes tailles de fenêtres.

---

## 5. Débogage & Outils de Navigateur (Chrome DevTools / Puppeteer)

L'agent IA dispose de la personnalisation Chrome DevTools et peut exécuter des scripts de test dans le navigateur.

- **Exposition de l'État :** En mode développement, le store Zustand et le moteur physique sont exposés sur l'objet global `window` :
  ```typescript
  if (typeof window !== 'undefined') {
    (window as any).simulationStore = useSimulationStore;
    (window as any).getEngine = () => engineInstance;
  }
  ```
- **Console DevTools :** L'agent peut utiliser la console pour :
  - Inspecter les agents actifs : `window.simulationStore.getState().agents`
  - Consulter les informations physiques précises : `window.getEngine().agents`
  - Déclencher manuellement des pas de simulation : `window.simulationStore.getState().step(0.1)`
- **Vérification Visuelle :** L'agent peut prendre des captures d'écran de l'application en cours d'exécution à `http://localhost:5173` pour valider le design.

---

## 6. Outils d'Aide à la Décision

- **Web Guidance :** Utilisez le script `npx.cmd -y modern-web-guidance@latest` pour rechercher et récupérer des guides sur les meilleures pratiques modernes (gestion du responsive, conteneurs, popovers natifs, animations de scroll).
