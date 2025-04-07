import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TimeEntry, saveTimeEntry, updateTimeEntry, getCurrentTimeEntry } from '../services/timeTracking';

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
    return { ...timeEntry, id };
  }
);

export const pauseTimer = createAsyncThunk(
  'timer/pause',
  async (timeEntry: TimeEntry) => {
    await updateTimeEntry(timeEntry.id!, {
      ...timeEntry,
      isRunning: false,
      lastPauseTime: null
    });
    return { ...timeEntry, lastPauseTime: null, isRunning: false };
  }
);

export const resumeTimer = createAsyncThunk(
  'timer/resume',
  async (timeEntry: TimeEntry) => {
    const now = new Date();
    await updateTimeEntry(timeEntry.id!, {
      ...timeEntry,
      isRunning: true,
      startTime: now,
      lastPauseTime: null
    });
    return { ...timeEntry, startTime: now };
  }
);

export const stopTimer = createAsyncThunk(
  'timer/stop',
  async (timeEntry: TimeEntry) => {
    const now = new Date();
    await updateTimeEntry(timeEntry.id!, {
      ...timeEntry,
      isRunning: false,
      endTime: now,
      lastPauseTime: null
    });
    return { ...timeEntry, endTime: now };
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
    updateElapsedTime: (state, action) => {
      state.elapsedTime = action.payload;
    },
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
      })
      .addCase(resumeTimer.fulfilled, (state, action) => {
        state.currentEntry = action.payload;
      })
      .addCase(stopTimer.fulfilled, (state, action) => {
        state.currentEntry = action.payload;
      })
      .addCase(fetchCurrentTimer.fulfilled, (state, action) => {
        state.currentEntry = action.payload;
        if (action.payload) {
          const now = new Date();
          const start = action.payload.startTime;
          const pausedTime = action.payload.pausedTime || 0;
          state.elapsedTime = now.getTime() - start.getTime() + pausedTime;
        }
      });
  },
});

export const { updateElapsedTime } = timerSlice.actions;
export default timerSlice.reducer; 