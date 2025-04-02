import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface TimerState {
  isRunning: boolean;
  startTime: number | null;
  elapsed: number;
  workTypeId: string | null;
  locationId: string | null;
}

const initialState: TimerState = {
  isRunning: false,
  startTime: null,
  elapsed: 0,
  workTypeId: null,
  locationId: null
};

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    startTimer: (state, action: PayloadAction<{ workTypeId: string; locationId: string }>) => {
      state.isRunning = true;
      state.startTime = Date.now();
      state.elapsed = 0;
      state.workTypeId = action.payload.workTypeId;
      state.locationId = action.payload.locationId;
    },
    stopTimer: (state) => {
      state.isRunning = false;
      state.startTime = null;
      state.elapsed = 0;
      state.workTypeId = null;
      state.locationId = null;
    },
    updateElapsed: (state) => {
      if (state.isRunning && state.startTime) {
        state.elapsed = Date.now() - state.startTime;
      }
    },
    syncTimerState: (state, action: PayloadAction<TimerState>) => {
      return { ...action.payload };
    }
  }
});

export const { startTimer, stopTimer, updateElapsed, syncTimerState } = timerSlice.actions;
export default timerSlice.reducer; 