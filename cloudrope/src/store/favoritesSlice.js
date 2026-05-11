import { createSlice } from '@reduxjs/toolkit';

// Favorites are scoped per user ID to prevent cross-user leakage.
const STORAGE_KEY = (userId) => `cr_favorites_${userId}`;

export function loadFavorites(userId) {
  if (!userId) return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(userId)) || '[]'); }
  catch { return []; }
}

function saveFavorites(userId, ids) {
  if (!userId) return;
  localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(ids));
}

function clearFavoritesForUser(userId) {
  if (userId) localStorage.removeItem(STORAGE_KEY(userId));
}

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState: { ids: [], userId: null },
  reducers: {
    initFavorites(state, action) {
      // Call this after login with the logged-in user's ID.
      const userId = action.payload;
      state.userId = userId;
      state.ids    = loadFavorites(userId);
    },
    toggleFavorite(state, action) {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter((i) => i !== id);
      } else {
        state.ids.push(id);
      }
      saveFavorites(state.userId, state.ids);
    },
    removeFavorite(state, action) {
      state.ids = state.ids.filter((i) => i !== action.payload);
      saveFavorites(state.userId, state.ids);
    },
    clearFavorites(state) {
      clearFavoritesForUser(state.userId);
      state.ids    = [];
      state.userId = null;
    },
  },
  extraReducers: (builder) => {
    // When the store is globally reset, wipe favorites state
    // (localStorage entry is kept so it persists for when they log back in).
    builder.addCase('store/reset', () => ({ ids: [], userId: null }));
  },
});

export const { initFavorites, toggleFavorite, removeFavorite, clearFavorites } = favoritesSlice.actions;
export default favoritesSlice.reducer;
