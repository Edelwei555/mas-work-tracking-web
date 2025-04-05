import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import timerReducer from './timerSlice';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['timer'] // зберігаємо тільки стан таймера
};

const persistedReducer = persistReducer(persistConfig, timerReducer);

export const store = configureStore({
  reducer: {
    timer: persistedReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false // для роботи з Timestamp
    })
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 