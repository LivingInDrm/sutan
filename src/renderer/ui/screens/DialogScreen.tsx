import React from 'react';
import { useUIStore } from '../../stores/uiStore';

export function DialogScreen() {
  const setScreen = useUIStore(s => s.setScreen);

  return (
    <div className="h-full flex">
      {/* Left: Character portrait area */}
      <div className="w-2/5 bg-gray-900/40 flex items-center justify-center">
        <div className="w-48 h-64 bg-gray-800/40 border border-gray-700 rounded-lg
                        flex items-center justify-center text-gray-600">
          Character Portrait
        </div>
      </div>

      {/* Right: Dialog text area */}
      <div className="flex-1 p-8 flex flex-col">
        <div className="flex-1 bg-gray-900/30 rounded-lg p-6 border border-gray-800 mb-4">
          <p className="text-amber-100/80 leading-relaxed">
            The dialogue text will appear here during story events and conversations...
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <button className="p-3 text-left bg-gray-800/40 border border-gray-700 rounded-lg
                             text-amber-200 hover:bg-amber-900/20 hover:border-amber-700/40 transition-all">
            <span className="text-amber-500 mr-2">&#9670;</span> Option A
          </button>
          <button className="p-3 text-left bg-gray-800/40 border border-gray-700 rounded-lg
                             text-amber-200 hover:bg-amber-900/20 hover:border-amber-700/40 transition-all">
            <span className="text-amber-500 mr-2">&#9670;</span> Option B
          </button>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => setScreen('map')}
            className="px-6 py-2 bg-gray-800/40 border border-gray-700 rounded-lg
                       text-gray-300 hover:text-amber-200 transition-all"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
