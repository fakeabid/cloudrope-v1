import { createSlice } from '@reduxjs/toolkit';

const STORAGE_KEY = 'cr_favorites';

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); }
  catch { return []; }
}

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: { ids: load() },
  reducers: {
    toggleFavorite(state, action) {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((i) => i !== id);
      } else {
        state.ids.push(id);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ids));
    },
    removeFavorite(state, action) {
      state.ids = state.ids.filter((i) => i !== action.payload);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.ids));
    },
    clearFavorites(state) {
      state.ids = [];
      localStorage.removeItem(STORAGE_KEY);
    },
  },
});

export const { toggleFavorite, removeFavorite, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
