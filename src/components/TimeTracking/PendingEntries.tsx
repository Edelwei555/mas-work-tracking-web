import React, { useEffect, useState } from 'react';
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
  Stack
} from '@mui/material';
import { PendingTimeEntry } from '../../types/timeEntry';
import { getPendingTimeEntries, updatePendingTimeEntry } from '../../services/timeTracking';
import { useAuth } from '../../contexts/AuthContext';
import WorkAmountDialog from './WorkAmountDialog';
import { formatTime } from '../../utils/timeUtils';

interface PendingEntriesProps {
  onUpdate: () => void;
}

const PendingEntries: React.FC<PendingEntriesProps> = ({ onUpdate }) => {
  const [pendingEntries, setPendingEntries] = useState<PendingTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkAmountDialog, setShowWorkAmountDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PendingTimeEntry | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    loadPendingEntries();
  }, [user]);

  const loadPendingEntries = async () => {
    try {
      if (user) {
        const entries = await getPendingTimeEntries(user.uid);
        setPendingEntries(entries);
      }
    } catch (err) {
      console.error('Помилка завантаження відкладених записів:', err);
      setError('Помилка завантаження відкладених записів');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (workAmount: number) => {
    try {
      if (selectedEntry) {
        await updatePendingTimeEntry(selectedEntry.id, workAmount);
        setShowWorkAmountDialog(false);
        setSelectedEntry(null);
        await loadPendingEntries();
        onUpdate();
      }
    } catch (err) {
      console.error('Помилка збереження запису:', err);
      setError('Помилка збереження запису');
    }
  };

  if (loading) {
    return <Typography>Завантаження...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  if (pendingEntries.length === 0) {
    return null;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h6">Відкладені записи</Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Дата</TableCell>
              <TableCell>Локація</TableCell>
              <TableCell>Вид роботи</TableCell>
              <TableCell>Витрачений час</TableCell>
              <TableCell>Обсяг роботи</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{new Date(entry.startTime).toLocaleDateString()}</TableCell>
                <TableCell>{entry.locationId}</TableCell>
                <TableCell>{entry.workTypeId}</TableCell>
                <TableCell>{formatTime(entry.duration)}</TableCell>
                <TableCell>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      setSelectedEntry(entry);
                      setShowWorkAmountDialog(true);
                    }}
                  >
                    Записати
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
      />
    </Stack>
  );
};

export default PendingEntries; 