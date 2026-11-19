import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { FLUSH, PAUSE, PERSIST, persistReducer, persistStore, PURGE, REGISTER, REHYDRATE } from 'redux-persist';
import categoriesReducer from './categoriesSlice';

// Expo also imports this store during server rendering, before window exists.
// Keep storage empty on the server; each browser/native runtime persists normally.
const storage = {
  getItem: (key: string) => Platform.OS === 'web' && typeof window === 'undefined'
    ? Promise.resolve(null) : AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => Platform.OS === 'web' && typeof window === 'undefined'
    ? Promise.resolve() : AsyncStorage.setItem(key, value),
  removeItem: (key: string) => Platform.OS === 'web' && typeof window === 'undefined'
    ? Promise.resolve() : AsyncStorage.removeItem(key),
};

// Persist configuration
const persistConfig = {
  key: 'root',
  version: 1,
  storage,
  whitelist: ['categories'], // Only persist categories
};

// Combine reducers
const rootReducer = combineReducers({
  categories: categoriesReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure store
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

// Types
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
