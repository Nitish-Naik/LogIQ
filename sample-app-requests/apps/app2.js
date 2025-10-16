import { sendLog } from '../logSender.js';

const APP_NAME = 'app2';
const MAX_LOGS = 30;

let count = 0;
const interval = setInterval(() => {
  if (count >= MAX_LOGS) return clearInterval(interval);
  sendLog(APP_NAME, true); // simulateError = true
  count++;
}, 6000);


