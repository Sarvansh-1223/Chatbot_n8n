const fs = require("fs");
const path = require("path");

const logDirectory = path.join(__dirname, "logs");
const logFile = path.join(logDirectory, "server.log");

// Create logs directory if it doesn't exist
if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
}

function writeLog(level, message, data = null) {

    const timestamp = new Date().toISOString();

    let logMessage =
        `[${timestamp}] [${level}] ${message}`;

    if (data) {
        logMessage += ` ${JSON.stringify(data)}`;
    }

    logMessage += "\n";

    // Store log in file
    fs.appendFileSync(logFile, logMessage);

    // Also display log in terminal
    console.log(logMessage.trim());
}

module.exports = {

    info(message, data = null) {
        writeLog("INFO", message, data);
    },

    warn(message, data = null) {
        writeLog("WARN", message, data);
    },

    error(message, data = null) {
        writeLog("ERROR", message, data);
    }

};