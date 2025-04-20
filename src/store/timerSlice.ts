import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveTimeEntry, updateTimeEntry, getCurrentTimeEntry } from '../services/timeTracking';
import { TimeEntry } from '../types';
import { PayloadAction } from '@reduxjs/toolkit';

interface TimerState {
  currentEntry: TimeEntry | null;
  elapsedTime: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: TimerState = {
  currentEntry: null,
  elapsedTime: 0,
  isLoading: false,
  error: null,
};

export const startTimer = createAsyncThunk(
  'timer/start',
  async (timeEntry: Omit<TimeEntry, 'createdAt' | 'lastUpdate' | 'id'>) => {
    const id = await saveTimeEntry(timeEntry);
    const now = new Date();
    return { 
      ...timeEntry, 
      id,
      createdAt: now,
      lastUpdate: now
    };
  }
);

export const pauseTimer = createAsyncThunk(
  'timer/pause',
  async (timeEntry: TimeEntry) => {
    const now = new Date();
    const pausedTime = timeEntry.pausedTime || 0;
    const additionalPausedTime = now.getTime() - new Date(timeEntry.startTime).getTime();
    const totalPausedTime = pausedTime + additionalPausedTime;

    const updatedEntry = {
      ...timeEntry,
      isRunning: false,
      pausedTime: totalPausedTime,
      lastPauseTime: null
    };

    await updateTimeEntry(timeEntry.id!, updatedEntry);
    return updatedEntry;
  }
);

export const resumeTimer = createAsyncThunk(
  'timer/resume',
  async (timeEntry: TimeEntry) => {
    const now = new Date();
    const updatedEntry = {
      ...timeEntry,
      isRunning: true,
      startTime: now,
      lastPauseTime: null
    };

    await updateTimeEntry(timeEntry.id!, updatedEntry);
    return updatedEntry;
  }
);

export const stopTimer = createAsyncThunk(
  'timer/stopTimer',
  async (entry: TimeEntry) => {
    const now = new Date();
    const updatedEntry = {
      ...entry,
      isRunning: false,
      endTime: now
    };
    
    await updateTimeEntry(entry.id!, updatedEntry);
    return updatedEntry;
  }
);

export const fetchCurrentTimer = createAsyncThunk(
  'timer/fetchCurrent',
  async ({ userId, teamId }: { userId: string; teamId: string }) => {
    return await getCurrentTimeEntry(userId, teamId);
  }
);

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    updateElapsedTime: (state, action: PayloadAction<number>) => {
      state.elapsedTime = action.payload;
    },
    resetTimer: (state) => {
      state.currentEntry = null;
      state.elapsedTime = 0;
      state.isLoading = false;
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(startTimer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(startTimer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEntry = action.payload;
        state.elapsedTime = 0;
      })
      .addCase(startTimer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to start timer';
      })
      .addCase(pauseTimer.fulfilled, (state, action) => {
        if (state.currentEntry) {
          state.currentEntry = {
            ...state.currentEntry,
            ...action.payload,
            isRunning: false,
            pausedTime: action.payload.pausedTime
          };
        }
      })
      .addCase(resumeTimer.fulfilled, (state, action) => {
        if (state.currentEntry) {
          state.currentEntry = {
            ...state.currentEntry,
            ...action.payload,
            isRunning: true
          };
        }
      })
      .addCase(stopTimer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(stopTimer.fulfilled, (state, action) => {
        if (!action.payload) {
          state.currentEntry = null;
          state.elapsedTime = 0;
          return;
        }

        state.currentEntry = action.payload;
        
        if (!action.payload.isRunning) {
          const now = new Date();
          const start = new Date(action.payload.startTime);
          const pausedTime = action.payload.pausedTime || 0;
          state.elapsedTime = Math.max(0, now.getTime() - start.getTime() - pausedTime);
        }
      })
      .addCase(stopTimer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to stop timer';
      })
      .addCase(fetchCurrentTimer.fulfilled, (state, action) => {
        if (!action.payload) {
          state.currentEntry = null;
          state.elapsedTime = 0;
          return;
        }

        const previousEntry = state.currentEntry;
        const newEntry = action.payload;

        if (!previousEntry || 
            previousEntry.id !== newEntry.id || 
            previousEntry.isRunning !== newEntry.isRunning ||
            previousEntry.endTime !== newEntry.endTime) {
          state.currentEntry = newEntry;
          
          if (!newEntry.isRunning || newEntry.endTime) {
            state.elapsedTime = 0;
          } else {
            const now = new Date();
            const start = new Date(newEntry.startTime);
            const pausedTime = newEntry.pausedTime || 0;
            state.elapsedTime = Math.max(0, now.getTime() - start.getTime() - pausedTime);
          }
        }
      });
  }
});

export const { updateElapsedTime, resetTimer } = timerSlice.actions;
export default timerSlice.reducer; 