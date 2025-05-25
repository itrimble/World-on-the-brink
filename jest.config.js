/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jest-environment-jsdom', // Use jsdom for testing React components
  roots: ['<rootDir>/src', '<rootDir>'], // Look for tests in src and root (for files like save-game-service.ts)
  moduleNameMapper: {
    // Mock CSS Modules (if you use them)
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock static assets
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/__mocks__/fileMock.js',
    // Alias to match tsconfig.json paths, if any (e.g., "@components/*": ["src/components/*"])
    // Example: "^@components/(.*)$": "<rootDir>/src/components/$1",
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'], // Setup file for global mocks and RTL utilities
  testPathIgnorePatterns: ['/node_modules/', '/dist/', '/build/'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json', // Ensure it uses your project's tsconfig
      },
    ],
  },
  // Collect coverage from TypeScript and JavaScript files in src/
  collectCoverageFrom: [
    'src/**/*.{ts,tsx,js,jsx}',
    '*.{ts,tsx}', // For files in root like save-game-service.ts
    '!**/node_modules/**',
    '!**/vendor/**',
    '!**/*.d.ts', // Exclude type definition files
    '!src/index.tsx', // Often the entry point, might not need coverage
    '!src/main/**', // Exclude main process files if they are not part of unit tests
    '!src/preload.ts', // Exclude preload script
    // Exclude files that are primarily configuration or setup
    '!jest.config.js',
    '!jest.setup.js',
    '!**/__mocks__/**',
    '!**/__tests__/**', // Exclude test files themselves
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['json', 'lcov', 'text', 'clover'],
  verbose: true,
};
```
