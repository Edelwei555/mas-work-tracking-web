import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TimeEntry, saveTimeEntry, updateTimeEntry, getCurrentTimeEntry } from '../services/timeTracking';
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
    return { ...timeEntry, id };
  }
);

export const pauseTimer = createAsyncThunk(
  'timer/pause',
  async (timeEntry: TimeEntry) => {
    const now = new Date();
    const pausedTime = timeEntry.pausedTime || 0;
    const additionalPausedTime = now.getTime() - new Date(timeEntry.startTime).getTime();
    const totalPausedTime = pausedTime + additionalPausedTime;

    await updateTimeEntry(timeEntry.id!, {
      ...timeEntry,
      isRunning: false,
      pausedTime: totalPausedTime,
      lastPauseTime: null
    });
    return { ...timeEntry, pausedTime: totalPausedTime, lastPauseTime: null, isRunning: false };
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
    return { ...timeEntry, startTime: now, isRunning: true };
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
    const entry = await getCurrentTimeEntry(userId, teamId);
    // Якщо запис існує але не активний, повертаємо null
    if (entry && !entry.isRunning) {
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
        state.isLoading = false;
        state.currentEntry = action.payload;
      })
      .addCase(stopTimer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to stop timer';
      })
      .addCase(fetchCurrentTimer.fulfilled, (state, action) => {
        const prevEntry = state.currentEntry;
        state.currentEntry = action.payload;
        
        // Якщо немає активного запису, скидаємо стан
        if (!action.payload) {
          state.currentEntry = null;
          state.elapsedTime = 0;
          return;
        }

        // Якщо запис не активний, скидаємо стан
        if (!action.payload.isRunning) {
          state.currentEntry = null;
          state.elapsedTime = 0;
          return;
        }

        // Оновлюємо час тільки якщо це новий запис або змінився стан
        if (!prevEntry || 
            prevEntry.id !== action.payload.id || 
            prevEntry.isRunning !== action.payload.isRunning) {
          const now = new Date();
          const start = new Date(action.payload.startTime);
          const pausedTime = action.payload.pausedTime || 0;
          state.elapsedTime = now.getTime() - start.getTime() + pausedTime;
        }
      });
  },
});

export const { updateElapsedTime, resetTimer } = timerSlice.actions;
export default timerSlice.reducer; 