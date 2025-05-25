// jest.setup.js
import '@testing-library/jest-dom'; // Extends Jest with custom matchers for DOM elements

// Mock window.electronAPI for tests
global.window = global.window || {}; // Ensure window exists
global.window.electronAPI = {
  saveGame: jest.fn(),
  loadGame: jest.fn(),
  listSavedGames: jest.fn(),
  deleteSavedGame: jest.fn(),
  // Add any other electronAPI methods that might be called
};

// Mock audioService
jest.mock('./src/renderer/services/AudioService', () => ({ // Adjust path if necessary
  audioService: {
    playSound: jest.fn(),
    // Mock other methods of audioService if they exist and are used
  },
}));

// Mock for a logger if you want to spy on its methods without actual logging
// Or you can let the actual logger run if its output is not disruptive
// jest.mock('./src/renderer/utils/logger', () => ({
//   createLogger: () => ({
//     debug: jest.fn(),
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn(),
//   }),
//   defaultLogger: { // if defaultLogger is used directly
//     debug: jest.fn(),
//     info: jest.fn(),
//     warn: jest.fn(),
//     error: jest.fn(),
//   }
// }));

// You can add any other global setup here, e.g., a global beforeAll/afterAll
beforeEach(() => {
  // Reset mocks before each test if needed, especially for spyOn or specific mock implementations
  // For jest.fn(), they have their own clear/reset methods if you need finer control per test suite.
  // Example:
  // if (global.window.electronAPI.saveGame.mockClear) { // Check if it's a jest.fn()
  //   global.window.electronAPI.saveGame.mockClear();
  //   global.window.electronAPI.loadGame.mockClear();
  //   global.window.electronAPI.listSavedGames.mockClear();
  //   global.window.electronAPI.deleteSavedGame.mockClear();
  // }
  // const { audioService } = require('./src/renderer/services/AudioService'); // Adjust path
  // if (audioService.playSound.mockClear) {
  //   audioService.playSound.mockClear();
  // }
});
```
