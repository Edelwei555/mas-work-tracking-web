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
import { saveTimeEntry, updateTimeEntry, savePendingTimeEntry } from '../../services/timeTracking';
import { TimeEntry } from '../../types/timeEntry';
import WorkAmountDialog from './WorkAmountDialog';
import { RootState } from '../../store/store';
import { useAuth } from '../../contexts/AuthContext';
import { getUserTeams } from '../../services/teams';
import { getTeamWorkTypes, WorkType } from '../../services/workTypes';
import { getTeamLocations, Location } from '../../services/locations';
import PendingEntries from './PendingEntries';
import { useTranslation } from 'react-i18next';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';

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
  const { t } = useTranslation();
  const [showCancelDialog, setShowCancelDialog] = useState(false);

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

  const handleStart = () => {
    if (selectedWorkType && selectedLocation && currentUser && teamId) {
      dispatch(startTimer({
        userId: currentUser.uid,
        teamId,
        workTypeId: selectedWorkType,
        locationId: selectedLocation,
        startTime: new Date(),
        endTime: null,
        pausedTime: 0,
        workAmount: 0,
        isRunning: true,
        duration: 0,
        lastPauseTime: null,
        status: 'pending',
      }));
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

  const handlePostpone = async () => {
    try {
      if (currentEntry) {
        if (!(currentEntry.status === 'pending' && currentEntry.id)) {
          await savePendingTimeEntry(currentEntry);
        }
        setShowWorkAmountDialog(false);
        setSelectedWorkType('');
        setSelectedLocation('');
        dispatch(resetTimer());
      }
    } catch (err) {
      console.error('Помилка відкладання запису:', err);
      setError('Помилка відкладання запису');
      setShowError(true);
    }
  };

  const handleCloseError = () => {
    setShowError(false);
    setError(null);
  };

  const isStartDisabled = !teamId || !selectedWorkType || !selectedLocation;

  const handleCancel = async () => {
    try {
      if (currentEntry && currentEntry.id) {
        await deleteDoc(doc(db, 'timeEntries', currentEntry.id));
        setSelectedWorkType('');
        setSelectedLocation('');
        dispatch(resetTimer());
        setShowCancelDialog(false);
      }
    } catch (err) {
      setError('Помилка при скасуванні запису');
      setShowError(true);
    }
  };

  if (loading) {
    return (
      <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
        <CircularProgress />
        <Typography>{t('common.loading')}</Typography>
      </Stack>
    );
  }

  return (
    <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
      <Typography variant="h4">{t('timeTracking.title')}</Typography>

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
      
      {/* Селекти тільки якщо таймер неактивний */}
      {!currentEntry && (
        <Stack spacing={2} sx={{ width: '100%', maxWidth: 400 }}>
          <FormControl fullWidth>
            <InputLabel>{t('workTypes.namePlaceholder')}</InputLabel>
            <Select
              value={selectedWorkType}
              onChange={(e) => setSelectedWorkType(e.target.value)}
              label={t('workTypes.namePlaceholder')}
            >
              {workTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>
                  {type.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>{t('locations.namePlaceholder')}</InputLabel>
            <Select
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              label={t('locations.namePlaceholder')}
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

      {/* Відображення актуального виду роботи та локації під час роботи таймера */}
      {currentEntry && (
        <Stack spacing={1} sx={{ width: '100%', maxWidth: 400, mb: 1 }}>
          <Typography variant="subtitle1" align="center" sx={{ color: '#388e3c', fontWeight: 600, fontSize: 22 }}>
            {t('workTypes.single', 'Вид роботи')}: <span style={{ color: '#222', fontWeight: 500 }}>{workTypes.find(w => w.id === currentEntry.workTypeId)?.name || currentEntry.workTypeId}</span>
          </Typography>
          <Typography variant="subtitle1" align="center" sx={{ color: '#388e3c', fontWeight: 600, fontSize: 22 }}>
            {t('locations.single', 'Локація')}: <span style={{ color: '#222', fontWeight: 500 }}>{locations.find(l => l.id === currentEntry.locationId)?.name || currentEntry.locationId}</span>
          </Typography>
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
            {t('timeTracking.start')}
          </Button>
        )}
        
        {currentEntry && currentEntry.isRunning && (
          <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
            <Button variant="outlined" color="secondary" onClick={() => setShowCancelDialog(true)}>
              {t('timeTracking.cancel', 'Відмінити')}
            </Button>
            <Button variant="contained" color="warning" onClick={handlePause}>
              {t('timeTracking.pause', 'Пауза')}
            </Button>
            <Button variant="contained" color="error" onClick={handleStop}>
              {t('timeTracking.stop', 'Зупинити')}
            </Button>
          </Stack>
        )}
        
        {currentEntry && !currentEntry.isRunning && (
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleResume}
          >
            {t('timeTracking.resume')}
          </Button>
        )}
      </Stack>

      {/* Таблиця відкладених записів під таймером */}
      {!currentEntry && !loading && (
        <PendingEntries onUpdate={() => {}} />
      )}

      <WorkAmountDialog
        open={showWorkAmountDialog}
        onClose={() => setShowWorkAmountDialog(false)}
        onSave={handleSave}
        onPostpone={handlePostpone}
      />

      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>{t('timeTracking.confirmCancelTitle', 'Відмінити запис таймера?')}</DialogTitle>
        <DialogContent>
          {t('timeTracking.confirmCancelText', 'Чи дійсно ви хочете відмінити запис таймера? Увесь відрахований час обнулиться, а запис видалиться?')}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCancel} color="error">{t('common.yes', 'Так')}</Button>
          <Button onClick={() => setShowCancelDialog(false)} color="primary">{t('timeTracking.continue', 'Продовжити запис')}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default TimeTracking; 