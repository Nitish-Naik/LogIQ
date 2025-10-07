import { sendLog } from '../logSender.js';

const APP_NAME = 'app3';
const MAX_LOGS = 20;

let count = 0;
const interval = setInterval(() => {
  if (count >= MAX_LOGS) return clearInterval(interval);
  sendLog(APP_NAME, false, true); // malformed = true
  count++;
}, 2000);
