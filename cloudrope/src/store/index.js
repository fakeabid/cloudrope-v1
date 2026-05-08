import { configureStore } from '@reduxjs/toolkit';
import filesReducer    from './filesSlice';
import trashReducer    from './trashSlice';
import sharesReducer   from './sharesSlice';
import favoritesReducer from './favoritesSlice';

export const store = configureStore({
  reducer: {
    files:     filesReducer,
    trash:     trashReducer,
    shares:    sharesReducer,
    favorites: favoritesReducer,
  },
});
