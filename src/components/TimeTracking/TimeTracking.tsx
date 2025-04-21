import React, { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../../hooks';
import { 
  Button, 
  Stack, 
  Typography, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem 
} from '@mui/material';
import { startTimer, stopTimer, pauseTimer, resumeTimer } from '../../store/timerSlice';
import { saveTimeEntry } from '../../services/timeTracking';
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

  useEffect(() => {
    const loadTeam = async () => {
      if (currentUser) {
        const teams = await getUserTeams(currentUser.uid);
        if (teams.length > 0 && teams[0].id) {
          setTeamId(teams[0].id);
        }
      }
    };
    loadTeam();
  }, [currentUser]);

  useEffect(() => {
    const loadData = async () => {
      if (teamId) {
        try {
          const [fetchedWorkTypes, fetchedLocations] = await Promise.all([
            getTeamWorkTypes(teamId),
            getTeamLocations(teamId)
          ]);
          setWorkTypes(fetchedWorkTypes);
          setLocations(fetchedLocations);
        } catch (error) {
          console.error('Помилка завантаження даних:', error);
        }
      }
    };
    loadData();
  }, [teamId]);
  
  const formatTime = (time: number) => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = time % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (!currentUser || !teamId || !selectedWorkType || !selectedLocation) return;
    
    const now = new Date();
    dispatch(startTimer({
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
  };

  const handlePause = () => {
    if (currentEntry) {
      dispatch(pauseTimer(currentEntry));
    }
  };

  const handleResume = () => {
    if (currentEntry) {
      dispatch(resumeTimer(currentEntry));
    }
  };

  const handleStop = async () => {
    if (currentEntry) {
      const stoppedEntry = await dispatch(stopTimer(currentEntry)).unwrap();
      if (stoppedEntry) {
        setShowWorkAmountDialog(true);
      }
    }
  };

  const handleSave = async (workAmount: number) => {
    if (currentEntry) {
      const entry: TimeEntry = {
        ...currentEntry,
        workAmount,
        isRunning: false,
        endTime: new Date()
      };
      await saveTimeEntry(entry);
      setShowWorkAmountDialog(false);
      setSelectedWorkType('');
      setSelectedLocation('');
    }
  };

  const isStartDisabled = !teamId || !selectedWorkType || !selectedLocation;

  return (
    <Stack spacing={2} alignItems="center" sx={{ p: 4 }}>
      <Typography variant="h4">Облік часу</Typography>
      
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
        {currentEntry && currentEntry.isRunning && !currentEntry.endTime && (
          <Button variant="contained" color="warning" onClick={handlePause}>
            Пауза
          </Button>
        )}
        {currentEntry && !currentEntry.isRunning && !currentEntry.endTime && (
          <Button variant="contained" color="primary" onClick={handleResume}>
            Продовжити
          </Button>
        )}
        {currentEntry && !currentEntry.endTime && (
          <Button variant="contained" color="error" onClick={handleStop}>
            Зупинити
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