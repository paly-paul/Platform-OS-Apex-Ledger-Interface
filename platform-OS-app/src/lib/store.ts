import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/features/auth/authSlice';
import uiReducer from '@/features/ui/uiSlice';

// Read auth from sessionStorage synchronously so the first render is already
// authenticated — avoids the useEffect race where the auth guard fires before
// the async rehydrate() dispatch can update the store.
function loadAuthPreload() {
  if (typeof window === 'undefined') return undefined;
  try {
    const raw = sessionStorage.getItem('apex_auth');
    if (!raw) return undefined;
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

const preloadedAuth = loadAuthPreload();

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
  },
  preloadedState: preloadedAuth ? { auth: preloadedAuth } : undefined,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
