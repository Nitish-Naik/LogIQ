import { sendLog } from '../logSender.js';

const APP_NAME = 'app1';
const MAX_LOGS = 50;

let count = 0;
const interval = setInterval(() => {
  if (count >= MAX_LOGS) return clearInterval(interval);
  sendLog(APP_NAME);
  count++;
}, 5000);
