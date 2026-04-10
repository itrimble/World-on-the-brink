import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store';
import App from './App';
import { capacitorPlatform } from './services/CapacitorPlatform';
import { capacitorSaveService } from './services/CapacitorSaveService';

// Make store available globally for save services
(window as any).store = store;

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element. Please ensure an element with ID 'root' exists in your HTML.");
}

// Initialize Capacitor platform and services, then render
async function bootstrap() {
  try {
    await capacitorPlatform.initialize();
    await capacitorSaveService.initialize();
  } catch (error) {
    console.warn('Non-blocking: Capacitor initialization issue:', error);
  }

  const root = ReactDOM.createRoot(rootElement!);
  root.render(
    <React.StrictMode>
      <Provider store={store}>
        <App />
      </Provider>
    </React.StrictMode>
  );
}

bootstrap();

