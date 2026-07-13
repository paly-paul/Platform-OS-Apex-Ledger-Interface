import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type Layer = 'group' | 'company' | 'family' | 'individual';

interface UIState {
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  activeLayer: Layer;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  chatOpen: false,
  activeLayer: 'group',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setSidebarCollapsed(state, action: PayloadAction<boolean>) {
      state.sidebarCollapsed = action.payload;
    },
    toggleChat(state) {
      state.chatOpen = !state.chatOpen;
    },
    openChat(state) {
      state.chatOpen = true;
    },
    closeChat(state) {
      state.chatOpen = false;
    },
    setActiveLayer(state, action: PayloadAction<Layer>) {
      state.activeLayer = action.payload;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarCollapsed,
  toggleChat,
  openChat,
  closeChat,
  setActiveLayer,
} = uiSlice.actions;

export type { Layer };
export default uiSlice.reducer;
