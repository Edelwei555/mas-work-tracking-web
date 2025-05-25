import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Typography,
  Stack,
  Box
} from '@mui/material';
import { PendingTimeEntry } from '../../types/timeEntry';
import { getPendingTimeEntries, updatePendingTimeEntry } from '../../services/timeTracking';
import { useAuth } from '../../contexts/AuthContext';
import WorkAmountDialog from './WorkAmountDialog';
import { formatTime, formatDate } from '../../utils/timeUtils';
import { getTeamWorkTypes, WorkType } from '../../services/workTypes';
import { getTeamLocations, Location } from '../../services/locations';

interface PendingEntryWithNames extends PendingTimeEntry {
  workTypeName: string;
  locationName: string;
}

interface PendingEntriesProps {
  onUpdate?: () => void;
}

const PendingEntries: React.FC<PendingEntriesProps> = ({ onUpdate }) => {
  const { t } = useTranslation();
  const [pendingEntries, setPendingEntries] = useState<PendingEntryWithNames[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkAmountDialog, setShowWorkAmountDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PendingEntryWithNames | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadPendingEntries();
  }, [currentUser]);

  const loadPendingEntries = async () => {
    if (!currentUser) return;
    try {
      const entries = await getPendingTimeEntries(currentUser.uid);
      
      // Отримуємо всі унікальні teamId з записів
      const teamIds = entries.reduce<string[]>((acc, entry) => {
        if (!acc.includes(entry.teamId)) {
          acc.push(entry.teamId);
        }
        return acc;
      }, []);
      
      // Отримуємо всі типи робіт та локації для всіх команд
      const workTypesPromises = teamIds.map(teamId => getTeamWorkTypes(teamId));
      const locationsPromises = teamIds.map(teamId => getTeamLocations(teamId));
      
      const [workTypesResults, locationsResults] = await Promise.all([
        Promise.all(workTypesPromises),
        Promise.all(locationsPromises)
      ]);
      
      // Створюємо мапи для швидкого пошуку
      const workTypesMap = new Map<string, WorkType>();
      const locationsMap = new Map<string, Location>();
      
      workTypesResults.forEach(workTypes => {
        workTypes.forEach(workType => {
          if (workType.id) {
            workTypesMap.set(workType.id, workType);
          }
        });
      });
      
      locationsResults.forEach(locations => {
        locations.forEach(location => {
          if (location.id) {
            locationsMap.set(location.id, location);
          }
        });
      });
      
      // Додаємо назви до записів
      const entriesWithNames = entries.map(entry => ({
        ...entry,
        workTypeName: workTypesMap.get(entry.workTypeId)?.name || entry.workTypeId,
        locationName: locationsMap.get(entry.locationId)?.name || entry.locationId
      }));
      
      setPendingEntries(entriesWithNames);
    } catch (error) {
      console.error('Error loading pending entries:', error);
      setError('Error loading pending entries');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkAmountClick = (entry: PendingEntryWithNames) => {
    setSelectedEntry(entry);
    setShowWorkAmountDialog(true);
  };

  const handleSave = async (workAmount: number) => {
    if (!selectedEntry?.id) {
      console.error('No entry selected');
      return;
    }

    try {
      await updatePendingTimeEntry(selectedEntry.id, workAmount);
      await loadPendingEntries();
      setShowWorkAmountDialog(false);
      setSelectedEntry(null);
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error('Error updating pending entry:', error);
      setError('Error updating pending entry');
    }
  };

  if (loading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (pendingEntries.length === 0) {
    return null;
  }

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Відкладені записи
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Початок</TableCell>
              <TableCell>Кінець</TableCell>
              <TableCell>Тривалість</TableCell>
              <TableCell>Вид робіт</TableCell>
              <TableCell>Локація</TableCell>
              <TableCell>Обсяг роботи</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDate(entry.startTime)}</TableCell>
                <TableCell>{entry.endTime ? formatDate(entry.endTime) : '-'}</TableCell>
                <TableCell>{formatTime(entry.duration)}</TableCell>
                <TableCell>{entry.workTypeName}</TableCell>
                <TableCell>{entry.locationName}</TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleWorkAmountClick(entry)}
                  >
                    Ввести обсяг
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <WorkAmountDialog
        open={showWorkAmountDialog}
        onClose={() => {
          setShowWorkAmountDialog(false);
          setSelectedEntry(null);
        }}
        onSave={handleSave}
        onPostpone={() => {
          setShowWorkAmountDialog(false);
          setSelectedEntry(null);
        }}
      />
    </Box>
  );
};

export default PendingEntries; 