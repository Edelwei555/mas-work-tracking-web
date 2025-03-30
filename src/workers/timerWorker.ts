// Створюємо Web Worker для підрахунку часу
const timerCode = `
  let interval;
  let startTime;

  self.onmessage = function(e) {
    if (e.data.command === 'start') {
      startTime = e.data.startTime || Date.now();
      interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        self.postMessage({ type: 'tick', elapsed });
      }, 1000);
    } else if (e.data.command === 'stop') {
      clearInterval(interval);
    }
  };
`;

const blob = new Blob([timerCode], { type: 'application/javascript' });
export const workerUrl = URL.createObjectURL(blob); 