import { configureStore, combineReducers } from '@reduxjs/toolkit';
import filesReducer    from './filesSlice';
import trashReducer    from './trashSlice';
import sharesReducer   from './sharesSlice';

const appReducer = combineReducers({
  files:     filesReducer,
  trash:     trashReducer,
  shares:    sharesReducer,
});

// Root reducer intercepts 'store/reset' and wipes all slices back to
// initialState. Called on both login and logout so no user ever sees
// another user's cached data.
function rootReducer(state, action) {
  if (action.type === 'store/reset') {
    return appReducer(undefined, action);
  }
  return appReducer(state, action);
}

export const store = configureStore({ reducer: rootReducer });

/** Dispatch this on login AND logout to clear all cached user data. */
export const resetStore = () => ({ type: 'store/reset' });
