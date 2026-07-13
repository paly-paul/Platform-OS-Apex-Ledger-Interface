import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

type PageId =
  | 'summary'
  | 'debrief'
  | 'uploads'
  | 'account-master'
  | 'performance'
  | 'historical-roi'
  | 'cashflow'
  | 'forecast'
  | 'tax'
  | 'benchmarking'
  | 'corp-actions'
  | 'concentration'
  | 'audit'
  | 'settings';

type Layer = 'group' | 'company' | 'family' | 'individual';

interface UIState {
  sidebarCollapsed: boolean;
  chatOpen: boolean;
  activePage: PageId;
  activeLayer: Layer;
}

const initialState: UIState = {
  sidebarCollapsed: false,
  chatOpen: false,
  activePage: 'summary',
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
    setActivePage(state, action: PayloadAction<PageId>) {
      state.activePage = action.payload;
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
  setActivePage,
  setActiveLayer,
} = uiSlice.actions;

export type { PageId, Layer };
export default uiSlice.reducer;
