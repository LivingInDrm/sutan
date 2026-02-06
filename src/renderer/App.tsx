import React from 'react';
import { useUIStore } from './stores/uiStore';
import { GameLayout } from './ui/layouts/GameLayout';
import { TitleScreen } from './ui/screens/TitleScreen';
import { MapScreen } from './ui/screens/MapScreen';
import { SceneScreen } from './ui/screens/SceneScreen';
import { SettlementScreen } from './ui/screens/SettlementScreen';
import { DialogScreen } from './ui/screens/DialogScreen';
import { ShopScreen } from './ui/screens/ShopScreen';

export function App() {
  const currentScreen = useUIStore(s => s.currentScreen);

  if (currentScreen === 'title') {
    return <TitleScreen />;
  }

  return (
    <GameLayout>
      {currentScreen === 'map' && <MapScreen />}
      {currentScreen === 'scene' && <SceneScreen />}
      {currentScreen === 'settlement' && <SettlementScreen />}
      {currentScreen === 'dialog' && <DialogScreen />}
      {currentScreen === 'shop' && <ShopScreen />}
    </GameLayout>
  );
}
