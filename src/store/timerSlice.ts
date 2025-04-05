import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Timestamp } from 'firebase/firestore';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
  lastSyncTime: number;
}

const initialState: TimerState = {
  isRunning: false,
  startTime: null,
  elapsed: 0,
  workTypeId: null,
  locationId: null,
  lastSyncTime: Date.now(),
};

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    startTimer: (state, action: PayloadAction<{ workTypeId: string; locationId: string }>) => {
      state.isRunning = true;
      state.startTime = Date.now();
      state.workTypeId = action.payload.workTypeId;
      state.locationId = action.payload.locationId;
    },
    stopTimer: (state) => {
      state.isRunning = false;
      state.elapsed = state.startTime ? Date.now() - state.startTime : state.elapsed;
      state.startTime = null;
    },
    updateElapsed: (state) => {
      if (state.isRunning && state.startTime) {
        state.elapsed = Date.now() - state.startTime;
      }
    },
    syncTimerState: (state, action: PayloadAction<TimerState>) => {
      return { ...action.payload, lastSyncTime: Date.now() };
    },
  },
});

export const { startTimer, stopTimer, updateElapsed, syncTimerState } = timerSlice.actions;
export default timerSlice.reducer; 