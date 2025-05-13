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

const PendingEntries: React.FC = () => {
  const { t } = useTranslation();
  const [pendingEntries, setPendingEntries] = useState<PendingTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWorkAmountDialog, setShowWorkAmountDialog] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<PendingTimeEntry | null>(null);
  const { currentUser } = useAuth();

  useEffect(() => {
    loadPendingEntries();
  }, [currentUser]);

  const loadPendingEntries = async () => {
    if (!currentUser) return;
    try {
      const entries = await getPendingTimeEntries(currentUser.uid);
      setPendingEntries(entries);
    } catch (error) {
      console.error('Error loading pending entries:', error);
      setError('Error loading pending entries');
    } finally {
      setLoading(false);
    }
  };

  const handleWorkAmountClick = (entry: PendingTimeEntry) => {
    setSelectedEntry(entry);
    setShowWorkAmountDialog(true);
  };

  const handleSave = async (workAmount: number) => {
    if (!selectedEntry) return;
    
    try {
      await updatePendingTimeEntry(selectedEntry.id, workAmount);
      await loadPendingEntries();
      setShowWorkAmountDialog(false);
      setSelectedEntry(null);
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
        {t('timeTracking.pendingEntries')}
      </Typography>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>{t('timeTracking.startTime')}</TableCell>
              <TableCell>{t('timeTracking.endTime')}</TableCell>
              <TableCell>{t('timeTracking.duration')}</TableCell>
              <TableCell>{t('timeTracking.workType')}</TableCell>
              <TableCell>{t('timeTracking.location')}</TableCell>
              <TableCell>{t('timeTracking.workAmount')}</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pendingEntries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>{formatDate(entry.startTime)}</TableCell>
                <TableCell>{formatDate(entry.endTime)}</TableCell>
                <TableCell>{entry.duration}</TableCell>
                <TableCell>{entry.workTypeName}</TableCell>
                <TableCell>{entry.locationName}</TableCell>
                <TableCell>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={() => handleWorkAmountClick(entry)}
                  >
                    {t('timeTracking.enterWorkAmount')}
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