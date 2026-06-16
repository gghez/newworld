import { useState } from 'react';
import { SetupScreen } from './components/SetupScreen';
import { SimulationScreen } from './components/SimulationScreen';
import { StatsPanel } from './components/StatsPanel';
import { useSimulationStore } from './store/simulationStore';

function App() {
  const [screen, setScreen] = useState<'setup' | 'simulation'>('setup');
  const { start, reset } = useSimulationStore();

  const handleStartSimulation = () => {
    reset(); // Initialise le moteur physique avec la config active
    start(); // Lance la boucle
    setScreen('simulation');
  };

  const handleBackToSetup = () => {
    useSimulationStore.getState().pause(); // Met en pause la simulation
    setScreen('setup');
  };

  return (
    <div className="App" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {screen === 'setup' ? (
        <SetupScreen onStartSimulation={handleStartSimulation} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '60px' }}>
          <SimulationScreen onBackToSetup={handleBackToSetup} />
          <div className="container" style={{ marginTop: '-20px' }}>
            <StatsPanel />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
