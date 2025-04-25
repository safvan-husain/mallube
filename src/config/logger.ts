import  winston from "winston";
const { combine, timestamp, errors, json, colorize, printf } = winston.format;

const consoleFormat = printf(({ level, message, timestamp, stack }) => {
    const log = stack ? `${stack}` : message;
    return `${timestamp} ${level}: ${log}`;
});

export const logger = winston.createLogger({
    level: 'debug',
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports
            .File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: combine(
                colorize(),
                timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
                errors({ stack: true }),
                consoleFormat
            ),
        }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' }),
    ]
});

