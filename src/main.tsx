import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 部署新版後，還開著的舊頁面會找不到舊的分頁檔案：連線正常時重新整理一次拿新版
const RELOAD_GUARD_KEY = 'chunkReloadAt';
const RELOAD_GUARD_MS = 10_000;

window.addEventListener('vite:preloadError', (event) => {
  const lastReload = Number(sessionStorage.getItem(RELOAD_GUARD_KEY) || 0);
  if (!navigator.onLine || Date.now() - lastReload < RELOAD_GUARD_MS) return;
  event.preventDefault();
  sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now()));
  window.location.reload();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
