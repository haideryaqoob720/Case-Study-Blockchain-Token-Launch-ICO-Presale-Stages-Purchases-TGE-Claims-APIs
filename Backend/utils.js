export const log = (message, level = 'INFO', moduleName = 'Module Missing') => {
  const timestamp = new Date().toISOString();
  const emoji = {
    INFO: 'ℹ️',
    SUCCESS: '✅',
    WARNING: '⚠️',
    ERROR: '❌',
    DEBUG: '🔍'
  };
  console.log(`${emoji[level]} [${timestamp}] [${moduleName}] ${message}`);
};
