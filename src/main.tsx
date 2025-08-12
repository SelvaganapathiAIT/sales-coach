import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

console.log('Main.tsx: Starting app initialization');
createRoot(document.getElementById("root")!).render(<App />);
