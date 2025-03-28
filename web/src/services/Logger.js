const winston = require('winston');
const {createLogger, transports, format} = winston;

// Define the logger
export const logger = createLogger({
    level: 'info',
    format: format.combine(
        format.colorize(),
        format.timestamp(),
        format.printf(({timestamp, level, message}) => {
            return `${timestamp} [${level}]: ${message}`;
        })
    ),
    transports: [
        new transports.Console(),
        // Optionally log to file
        new transports.File({filename: 'app.log'})
    ],
});

// Use the logger
logger.info('This is an info message');
logger.error('This is an error message');
