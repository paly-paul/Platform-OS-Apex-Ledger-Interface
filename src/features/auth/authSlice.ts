import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
}

const SESSION_KEY = 'apex_auth';

function loadFromSession(): AuthState {
  if (typeof window === 'undefined') return { isAuthenticated: false, username: null };
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { isAuthenticated: false, username: null };
    return JSON.parse(raw) as AuthState;
  } catch {
    return { isAuthenticated: false, username: null };
  }
}

function persistToSession(state: AuthState) {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(state));
}

function clearSession() {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(SESSION_KEY);
}

const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action: PayloadAction<{ username: string }>) {
      state.isAuthenticated = true;
      state.username = action.payload.username;
      persistToSession({ isAuthenticated: true, username: action.payload.username });
    },
    logout(state) {
      state.isAuthenticated = false;
      state.username = null;
      clearSession();
    },
    rehydrate(state) {
      const saved = loadFromSession();
      state.isAuthenticated = saved.isAuthenticated;
      state.username = saved.username;
    },
  },
});

export const { loginSuccess, logout, rehydrate } = authSlice.actions;
export default authSlice.reducer;
