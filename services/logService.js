const path = require('path');
const winston = require('winston');

// Function to create a logger with the relative path from project root as the service name
const createLoggerWithFilename = (filename) => {
    const projectRoot = process.cwd();
    const relativePath = path.relative(projectRoot, filename)
        .replace(/\\/g, '.') // Replace Windows backslashes with dots
        .replace(/\//g, '.'); // Replace Unix slashes with dots

    return winston.createLogger({
        level: 'info',
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            winston.format.splat(),
            winston.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} [${level.toUpperCase()}] [${relativePath}]: ${message}`;
            })
        ),
        transports: [
            new winston.transports.Console()
        ]
    });
};

module.exports = createLoggerWithFilename;