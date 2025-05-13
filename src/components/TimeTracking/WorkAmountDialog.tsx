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

interface WorkAmountDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (workAmount: number) => void;
  onPostpone?: () => void;
}

const WorkAmountDialog: React.FC<WorkAmountDialogProps> = ({ open, onClose, onSave, onPostpone }) => {
  const [workAmount, setWorkAmount] = useState<string>('');

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
      <DialogTitle>Введіть обсяг виконаних робіт</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField
            autoFocus
            label="Обсяг робіт"
            type="number"
            value={workAmount}
            onChange={(e) => setWorkAmount(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        {onPostpone && (
          <Button onClick={handlePostpone} color="secondary">
            Порахувати пізніше
          </Button>
        )}
        <Button onClick={handleSave} color="primary">
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkAmountDialog; 