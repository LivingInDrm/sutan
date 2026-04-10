import React from 'react';
import { useUIStore } from '../../stores/uiStore';
import { useGameStore } from '../../stores/gameStore';

export function ShopScreen() {
  const setScreen = useUIStore(s => s.setScreen);
  const gold = useGameStore(s => s.gold);

  return (
    <div className="h-full flex">
      {/* Left: Shop inventory */}
      <div className="flex-1 p-6 border-r border-gray-800">
        <h2 className="text-xl font-bold text-amber-400 mb-4">Shop</h2>
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-4 bg-gray-900/50 border border-gray-800 rounded-lg text-center
                         hover:border-amber-700/40 transition-all cursor-pointer"
            >
              <div className="w-16 h-20 bg-gray-800/60 rounded mx-auto mb-2 flex items-center justify-center text-gray-600 text-xs">
                Item {i}
              </div>
              <div className="text-sm text-amber-200">Item Name</div>
              <div className="text-xs text-yellow-500 mt-1">10 Gold</div>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Player inventory for selling */}
      <div className="w-72 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-amber-400">Your Items</h3>
          <span className="text-yellow-400 font-mono font-bold">{gold}G</span>
        </div>
        <div className="text-gray-600 text-center py-8 text-sm">
          Drag items here to sell
        </div>
        <button
          onClick={() => setScreen('map')}
          className="w-full mt-4 px-4 py-2 bg-gray-800/40 border border-gray-700 rounded-lg
                     text-gray-300 hover:text-amber-200 transition-all text-sm"
        >
          Leave Shop
        </button>
      </div>
    </div>
  );
}
