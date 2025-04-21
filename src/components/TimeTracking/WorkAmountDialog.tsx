import React, { useState } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  TextField 
} from '@mui/material';

interface WorkAmountDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (workAmount: number) => void;
}

const WorkAmountDialog: React.FC<WorkAmountDialogProps> = ({ open, onClose, onSave }) => {
  const [workAmount, setWorkAmount] = useState<string>('');

  const handleSave = () => {
    const amount = parseFloat(workAmount);
    if (!isNaN(amount) && amount >= 0) {
      onSave(amount);
      setWorkAmount('');
    }
  };

  return (
    <Dialog open={open} onClose={onClose}>
      <DialogTitle>Введіть обсяг виконаних робіт</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label="Обсяг робіт"
          type="number"
          fullWidth
          value={workAmount}
          onChange={(e) => setWorkAmount(e.target.value)}
          inputProps={{ step: 0.1, min: 0 }}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Скасувати</Button>
        <Button onClick={handleSave} disabled={!workAmount || parseFloat(workAmount) <= 0}>
          Зберегти
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkAmountDialog; 