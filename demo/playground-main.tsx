import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../src/styles/gantt.css';
import { initDemoTheme } from './chartTheme';
import { App } from './App';

initDemoTheme();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
