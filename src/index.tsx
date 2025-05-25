import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store/store';
import { TimerProvider } from './contexts/TimerContext';
import { AuthProvider } from './contexts/AuthContext';
import './i18n';
import 'react-app-polyfill/ie11';
import 'react-app-polyfill/stable';

document.body.innerHTML = '<div style="color:red;font-size:24px;">React index loaded</div>' + document.body.innerHTML;
console.log('React index loaded');

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter>
          <AuthProvider>
            <TimerProvider>
              <App />
            </TimerProvider>
          </AuthProvider>
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
); 