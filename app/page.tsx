'use client';

import React, { useState } from 'react';
import GarageMenu from '@/components/GarageMenu';
import GameCanvas from '@/components/GameCanvas';

export default function Page() {
  const [gameState, setGameState] = useState<'menu' | 'racing'>('menu');
  const [raceConfig, setRaceConfig] = useState<{
    driverName: string;
    carNumber: number;
    playerColor: string;
    topSpeedSetting: number;
    modName?: string;
    bodyStyle?: string;
    customTextureUrl?: string;
    customGlbMesh?: any;
  }>({
    driverName: 'Dale Trailrider',
    carNumber: 3,
    playerColor: '#facc15',
    topSpeedSetting: 78,
  });

  return (
    <main className="w-screen h-screen overflow-hidden bg-slate-950">
      {gameState === 'menu' ? (
        <GarageMenu
          onStartRace={(config) => {
            setRaceConfig(config);
            setGameState('racing');
          }}
        />
      ) : (
        <GameCanvas
          playerColor={raceConfig.playerColor}
          driverName={raceConfig.driverName}
          carNumber={raceConfig.carNumber}
          topSpeedSetting={raceConfig.topSpeedSetting}
          modName={raceConfig.modName}
          customTextureUrl={raceConfig.customTextureUrl}
          customGlbMesh={raceConfig.customGlbMesh}
          onReturnToMenu={() => setGameState('menu')}
        />
      )}
    </main>
  );
}
