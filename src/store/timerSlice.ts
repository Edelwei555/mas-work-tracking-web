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
      lastPauseTime: null,
      endTime: null
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
    const startTime = new Date(entry.startTime);
    const duration = Math.floor((now.getTime() - startTime.getTime() - (entry.pausedTime || 0)) / 1000);
    
    const updatedEntry = {
      ...entry,
      isRunning: false,
      endTime: now,
      lastUpdate: now,
      duration
    };
    
    await updateTimeEntry(entry.id!, updatedEntry);
    return updatedEntry;
  }
);

export const fetchCurrentTimer = createAsyncThunk(
  'timer/fetchCurrent',
  async ({ userId, teamId }: { userId: string; teamId: string }) => {
    const entry = await getCurrentTimeEntry(userId, teamId);
    
    if (!entry) {
      return null;
    }

    // Перевіряємо, чи запис не застарів (більше 24 годин)
    const now = new Date();
    const startTime = new Date(entry.startTime);
    const timeSinceStart = now.getTime() - startTime.getTime();
    
    if (timeSinceStart > 24 * 60 * 60 * 1000) { // 24 години
      // Автоматично зупиняємо застарілий запис
      const updatedEntry = {
        ...entry,
        isRunning: false,
        endTime: now,
        lastUpdate: now
      };
      await updateTimeEntry(entry.id!, updatedEntry);
      return null;
    }

    return entry;
  }
);

const timerSlice = createSlice({
  name: 'timer',
  initialState,
  reducers: {
    updateElapsedTime: (state, action: PayloadAction<number>) => {
      if (state.currentEntry?.isRunning) {
        state.elapsedTime = action.payload;
      }
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
        state.currentEntry = action.payload;
        const now = new Date();
        const start = new Date(action.payload.startTime);
        const pausedTime = action.payload.pausedTime || 0;
        state.elapsedTime = Math.floor((now.getTime() - start.getTime() - pausedTime) / 1000);
      })
      .addCase(resumeTimer.fulfilled, (state, action) => {
        state.currentEntry = action.payload;
        state.elapsedTime = 0;
      })
      .addCase(stopTimer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(stopTimer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEntry = action.payload;
        state.elapsedTime = action.payload.duration || 0;
      })
      .addCase(stopTimer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to stop timer';
      })
      .addCase(fetchCurrentTimer.fulfilled, (state, action) => {
        const entry = action.payload;
        
        if (!entry) {
          state.currentEntry = null;
          state.elapsedTime = 0;
          return;
        }

        state.currentEntry = entry;
        
        if (entry.isRunning) {
          const now = new Date();
          const start = new Date(entry.startTime);
          const pausedTime = entry.pausedTime || 0;
          state.elapsedTime = Math.floor((now.getTime() - start.getTime() - pausedTime) / 1000);
        } else if (entry.duration) {
          state.elapsedTime = entry.duration;
        } else {
          state.elapsedTime = 0;
        }
      });
  }
});

export const { updateElapsedTime, resetTimer } = timerSlice.actions;
export default timerSlice.reducer; 