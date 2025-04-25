import  winston from "winston";
const { combine, timestamp, errors, json } = winston.format;

export const logger = winston.createLogger({
    level: 'info',
    format: combine(timestamp(), errors({ stack: true }), json()),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports
            .File({ filename: 'combined.log' }),
    ],
    exceptionHandlers: [
        new winston.transports.File({ filename: 'exceptions.log' }),
    ]
});

