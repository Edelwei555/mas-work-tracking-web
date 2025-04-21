import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { saveTimeEntry, updateTimeEntry, getCurrentTimeEntry } from '../services/timeTracking';
import { TimeEntry } from '../types/timeEntry';
import { PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

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
    const now = new Date();
    const entry = {
      ...timeEntry,
      startTime: now,
      endTime: null,
      pausedTime: 0,
      duration: 0,
      lastPauseTime: null,
      isRunning: true
    };
    const id = await saveTimeEntry(entry);
    return { 
      ...entry, 
      id,
      createdAt: now,
      lastUpdate: now
    };
  }
);

export const pauseTimer = createAsyncThunk(
  'timer/pauseTimer',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const { currentEntry } = state.timer;
    if (!currentEntry || !currentEntry.id) {
      throw new Error('No active timer to pause');
    }

    const now = new Date();
    const lastPauseTime = now;

    // Оновлюємо в базі даних
    await updateTimeEntry(currentEntry.id, {
      isRunning: false,
      lastPauseTime,
      lastUpdate: now
    });

    // Повертаємо повний оновлений об'єкт
    return {
      ...currentEntry,
      isRunning: false,
      lastPauseTime,
      lastUpdate: now
    };
  }
);

export const resumeTimer = createAsyncThunk(
  'timer/resumeTimer',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const { currentEntry } = state.timer;
    if (!currentEntry || !currentEntry.id) {
      throw new Error('No paused timer to resume');
    }

    const now = new Date();
    let pausedTime = currentEntry.pausedTime || 0;

    // Додаємо час, який пройшов з моменту останньої паузи
    if (currentEntry.lastPauseTime) {
      const lastPauseTime = new Date(currentEntry.lastPauseTime);
      pausedTime += Math.floor((now.getTime() - lastPauseTime.getTime()) / 1000);
    }

    // Оновлюємо в базі даних
    await updateTimeEntry(currentEntry.id, {
      isRunning: true,
      lastPauseTime: null,
      pausedTime,
      lastUpdate: now
    });

    // Повертаємо повний оновлений об'єкт
    return {
      ...currentEntry,
      isRunning: true,
      lastPauseTime: null,
      pausedTime,
      lastUpdate: now
    };
  }
);

export const stopTimer = createAsyncThunk(
  'timer/stopTimer',
  async (entry: TimeEntry) => {
    const now = new Date();
    const startTime = new Date(entry.startTime);
    let totalPausedTime = entry.pausedTime || 0;
    
    // Якщо таймер був на паузі при зупинці, додаємо останній час паузи
    if (entry.lastPauseTime) {
      const lastPauseTime = new Date(entry.lastPauseTime);
      totalPausedTime += Math.floor((now.getTime() - lastPauseTime.getTime()) / 1000);
    }
    
    const elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
    const duration = Math.max(0, elapsedTime - totalPausedTime);
    
    // Спочатку оновлюємо в базі даних
    const updateData: Partial<TimeEntry> = {
      isRunning: false,
      endTime: now,
      lastUpdate: now,
      pausedTime: totalPausedTime,
      duration
    };
    await updateTimeEntry(entry.id!, updateData);

    // Потім повертаємо повний оновлений об'єкт
    return {
      ...entry,
      isRunning: false,
      endTime: now,
      lastUpdate: now,
      pausedTime: totalPausedTime,
      duration
    };
  }
);

export const fetchCurrentTimer = createAsyncThunk(
  'timer/fetchCurrent',
  async ({ userId, teamId }: { userId: string; teamId: string }) => {
    const entry = await getCurrentTimeEntry(userId, teamId);
    
    if (!entry || entry.endTime) {
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
        state.elapsedTime = Math.max(0, action.payload);
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
        if (action.payload) {
          state.currentEntry = action.payload;
        }
      })
      .addCase(resumeTimer.fulfilled, (state, action) => {
        if (action.payload) {
          state.currentEntry = action.payload;
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
      .addCase(fetchCurrentTimer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCurrentTimer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEntry = action.payload;
        if (action.payload) {
          const now = new Date();
          const startTime = new Date(action.payload.startTime);
          const pausedTime = action.payload.pausedTime || 0;
          const lastPauseTime = action.payload.lastPauseTime ? new Date(action.payload.lastPauseTime) : null;
          
          let elapsedTime = Math.floor((now.getTime() - startTime.getTime()) / 1000);
          
          if (lastPauseTime) {
            elapsedTime = Math.floor((lastPauseTime.getTime() - startTime.getTime()) / 1000);
          }
          
          state.elapsedTime = Math.max(0, elapsedTime - pausedTime);
        } else {
          state.elapsedTime = 0;
        }
      })
      .addCase(fetchCurrentTimer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch current timer';
      });
  }
});

export const { updateElapsedTime, resetTimer } = timerSlice.actions;
export default timerSlice.reducer; 