import { createLogger, format, transports } from 'winston';

const logger = createLogger({
  level: 'info',
  exitOnError: false,
  format: format.json(),
  transports: [
    new transports.Console(),
    new transports.File({ filename: 'logs/log.log' }),
  ],
});

export default logger;
