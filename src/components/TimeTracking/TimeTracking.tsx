import React, { useState, useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { 
  Button, 
  Stack, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  CircularProgress,
  Alert,
  Snackbar 
} from '@mui/material';
import { startTimer, stopTimer, pauseTimer, resumeTimer, resetTimer, updateElapsedTime } from '../../store/timerSlice';
import { saveTimeEntry, updateTimeEntry } from '../../services/timeTracking';
import { TimeEntry } from '../../types/timeEntry';
import WorkAmountDialog from './WorkAmountDialog';
import { RootState } from '../../store/store';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/teams';
import { getTeamWorkTypes, WorkType } from '../../services/workTypes';
import { getTeamLocations, Location } from '../../services/locations';

const TimeTracking: React.FC = () => {
  const dispatch = useAppDispatch();
  const { currentUser } = useAuth();
  const { currentEntry, elapsedTime } = useAppSelector((state: RootState) => state.timer);
  const [showWorkAmountDialog, setShowWorkAmountDialog] = useState(false);
  const [teamId, setTeamId] = useState<string>('');
  const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [selectedWorkType, setSelectedWorkType] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    let mounted = true;
    let intervalId: NodeJS.Timeout | null = null;

    const updateTimer = () => {
      try {
        if (currentEntry?.isRunning) {
          const now = new Date();
          const start = new Date(currentEntry.startTime);
          const pausedTime = currentEntry.pausedTime || 0;
          let elapsedTime = Math.floor((now.getTime() - start.getTime()) / 1000);
          
          // Віднімаємо час паузи
          elapsedTime = Math.max(0, elapsedTime - pausedTime);
          
          if (mounted) {
            dispatch(updateElapsedTime(elapsedTime));
          }
        }
      } catch (err) {
        console.error('Помилка оновлення таймера:', err);
        setError('Помилка оновлення таймера');
        setShowError(true);
        if (intervalId) {
          clearInterval(intervalId);
        }
      }
    };

    if (currentEntry?.isRunning && mounted) {
      updateTimer(); // Оновлюємо одразу
      intervalId = setInterval(updateTimer, 1000);
    }

    return () => {
      mounted = false;
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [currentEntry, dispatch]);

  useEffect(() => {
    let mounted = true;

    const loadTeam = async () => {
      try {
        setLoading(true);
        if (currentUser && mounted) {
          const teams = await getUserTeams(currentUser.uid);
          if (teams.length > 0 && teams[0].id && mounted) {
            setTeamId(teams[0].id);
          }
        }
      } catch (err) {
        console.error('Помилка завантаження команди:', err);
        if (mounted) {
          setError('Помилка завантаження даних команди');
          setShowError(true);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadTeam();

    return () => {
      mounted = false;
    };
  }, [currentUser]);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      if (teamId && mounted) {
        try {
          setLoading(true);
          const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
            getTeamWorkTypes(teamId),
            getTeamLocations(teamId)
          ]);
          if (mounted) {
            setWorkTypes(fetchedWorkTypes);
            setLocations(fetchedLocations);
          }
        } catch (err) {
          console.error('Помилка завантаження даних:', err);
          if (mounted) {
            setError('Помилка завантаження даних');
            setShowError(true);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [teamId]);

  const formatTime = useCallback((time: number) => {
    if (!time && time !== 0) return '00:00:00';
    
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }, []);

  const handleStart = async () => {
    try {
      if (!currentUser || !teamId || !selectedWorkType || !selectedLocation) return;
      
      const now = new Date();
      await dispatch(startTimer({
        startTime: now,
        endTime: null,
        isRunning: true,
        workAmount: 0,
        pausedTime: 0,
        duration: 0,
        lastPauseTime: null,
        userId: currentUser.uid,
        teamId: teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation
      }));
    } catch (err) {
      console.error('Помилка запуску таймера:', err);
      setError('Помилка запуску таймера');
      setShowError(true);
    }
  };

  const handlePause = async () => {
    try {
      if (currentEntry) {
        await dispatch(pauseTimer());
      }
    } catch (err) {
      console.error('Помилка паузи таймера:', err);
      setError('Помилка паузи таймера');
      setShowError(true);
    }
  };

  const handleResume = async () => {
    try {
      if (currentEntry) {
        await dispatch(resumeTimer());
      }
    } catch (err) {
      console.error('Помилка відновлення таймера:', err);
      setError('Помилка відновлення таймера');
      setShowError(true);
    }
  };

  const handleStop = async () => {
    try {
      if (currentEntry) {
        const stoppedEntry = await dispatch(stopTimer(currentEntry)).unwrap();
        if (stoppedEntry) {
          setShowWorkAmountDialog(true);
        }
      }
    } catch (err) {
      console.error('Помилка зупинки таймера:', err);
      setError('Помилка зупинки таймера');
      setShowError(true);
    }
  };

  const handleSave = async (workAmount: number) => {
    try {
      if (currentEntry && currentEntry.id) {
        await updateTimeEntry(currentEntry.id, { workAmount });
        setShowWorkAmountDialog(false);
        setSelectedWorkType('');
        setSelectedLocation('');
        dispatch(resetTimer());
      }
    } catch (err) {
      console.error('Помилка збереження запису:', err);
      setError('Помилка збереження запису');
      setShowError(true);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
    setError(null);
  };

  const isStartDisabled = !teamId || !selectedWorkType || !selectedLocation;

  if (loading) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
        <CircularProgress />
        <Typography>Завантаження...</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
      <Typography variant="h4">Облік часу</Typography>

      <Snackbar 
        open={showError} 
        autoHideDuration={6000} 
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseError} severity="error" sx={{ width: '100%' }}>
          {error}
        </Alert>
      </Snackbar>
      
      {!currentEntry && (
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
          <FormControl fullWidth>
            <InputLabel>Вид робіт</InputLabel>
            <Select
              value={selectedWorkType}
              onChange={(e) => setSelectedWorkType(e.target.value)}
              label="Вид робіт"
            >
              {workTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Локація</InputLabel>
            <Select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              label="Локація"
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      <Typography variant="h2">{formatTime(elapsedTime)}</Typography>
      
      <Stack direction="row" spacing={2}>
        {!currentEntry && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleStart}
            disabled={isStartDisabled}
          >
            Почати
          </Button>
        )}
        
        {currentEntry && currentEntry.isRunning && (
          <Button 
            variant="contained" 
            color="warning" 
            onClick={handlePause}
          >
            Пауза
          </Button>
        )}
        
        {currentEntry && !currentEntry.isRunning && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleResume}
          >
            Продовжити
          </Button>
        )}
        
        {currentEntry && (
          <Button 
            variant="contained" 
            color="error" 
            onClick={handleStop}
          >
            Стоп
          </Button>
        )}
      </Stack>

      <WorkAmountDialog
        open={showWorkAmountDialog}
        onClose={() => setShowWorkAmountDialog(false)}
        onSave={handleSave}
      />
    </Stack>
  );
};

export default TimeTracking; 