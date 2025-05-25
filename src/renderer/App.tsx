import React from 'react';
import MainLayout from './components/layout/MainLayout';
// Import Redux store and Provider if they exist and are needed here
// import { Provider } from 'react-redux';
// import store from './store'; // Adjust path to your store

const App: React.FC = () => {
  return (
    // If using Redux, wrap MainLayout with Provider:
    // <Provider store={store}>
    <MainLayout />
    // </Provider>
  );
};

export default App;
```
