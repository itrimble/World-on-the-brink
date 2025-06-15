```typescript
import React from 'react';

export const LoadingScreen: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
      <div className="mb-8">
        <h1 className="text-5xl font-bold text-blue-300">GeoPolitica</h1>
        <p className="text-xl text-gray-300 mt-2 text-center">A Modern Geopolitical Strategy Game</p>
      </div>
      
      <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className="loading-bar h-full bg-blue-500 rounded-full"></div>
      </div>
      
      <p className="mt-4 text-gray-400">Loading game resources...</p>
      
      <style jsx>{`
        .loading-bar {
          width: 50%;
          animation: loading 2s infinite ease-in-out;
        }
        
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </div>
  );
};
```