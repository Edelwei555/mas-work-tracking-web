import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField, 
  Stack
} from '@mui/material';
import { useTranslation } from 'react-i18next';

interface WorkAmountDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (workAmount: number) => void;
  onPostpone?: () => void;
}

const WorkAmountDialog: React.FC<WorkAmountDialogProps> = ({ open, onClose, onSave, onPostpone }) => {
  const [workAmount, setWorkAmount] = useState<string>('');
  const { t } = useTranslation();

  const handleSave = () => {
    const amount = parseFloat(workAmount);
    if (!isNaN(amount) && amount > 0) {
      onSave(amount);
      setWorkAmount('');
    }
  };

  const handlePostpone = () => {
    if (onPostpone) {
      onPostpone();
      setWorkAmount('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>{t('timeTracking.enterWorkAmountTitle', 'Enter the amount of work done')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            autoFocus
            label={t('timeTracking.workAmount', 'Work amount')}
            type="number"
            value={workAmount}
            onChange={(e) => setWorkAmount(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('common.cancel', 'Cancel')}</Button>
        {onPostpone && (
          <Button onClick={handlePostpone} color="secondary">
            {t('timeTracking.postpone', 'Count later')}
          </Button>
        )}
        <Button onClick={handleSave} color="primary">
          {t('common.save', 'Save')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkAmountDialog; 