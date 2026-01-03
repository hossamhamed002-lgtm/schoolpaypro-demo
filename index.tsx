
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import RootErrorBoundary from './components/RootErrorBoundary';
import { applyDemoPersistenceGuards } from './src/guards/appMode';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

applyDemoPersistenceGuards();

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <App />
    </RootErrorBoundary>
  </React.StrictMode>
);
