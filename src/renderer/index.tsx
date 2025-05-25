import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import store from './store'; // Import the configured store
import App from './App';
// Main stylesheet is linked in index.html, no need to import here unless using CSS modules for this file.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Failed to find the root element. Please ensure an element with ID 'root' exists in your HTML.");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>
);
```
