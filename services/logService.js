const path = require('path');
const winston = require('winston');

// Function to create a logger with the relative path from project root as the service name
const createLoggerWithFilename = (filename) => {
    const projectRoot = process.cwd(); // Get project root directory
    const relativePath = path.relative(projectRoot, filename)
        .replace(/\\/g, '.') // Replace Windows backslashes with dots
        .replace(/\//g, '.'); // Replace Unix slashes with dots

    return winston.createLogger({
        level: 'info', // Set desired log level
        format: winston.format.combine(
            winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Add timestamp
            winston.format.splat(), // Enables %s and other format specifiers
            winston.format.printf(({ level, message, timestamp }) => {
                return `${timestamp} [${level.toUpperCase()}] [${relativePath}]: ${message}`;
            })
        ),
        transports: [
            new winston.transports.Console() // Log to console
        ]
    });
};

module.exports = createLoggerWithFilename;
