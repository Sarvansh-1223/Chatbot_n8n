const express = require("express");
const axios = require("axios");
const cors = require("cors");
const logger = require("./logger");
require("dotenv").config();

const app = express();

const allowedHosts = [
    "chatapp.site",
    "localhost"
];

app.use((req, res, next) => {

    if (!allowedHosts.includes(req.hostname)) {

        logger.warn("[SECURITY] Invalid host", {
            host: req.hostname,
            ip: req.ip
        });

        return res.status(403).json({
            success: false,
            error: "Forbidden"
        });
    }

    next();
});

// CORS
app.use(cors({
    origin: "http://chatapp.site"
}));


app.use(express.json());
app.use(express.static("public"));

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;
const N8N_WEBHOOK_SECRET = process.env.N8N_WEBHOOK_SECRET;


app.post("/api/chat", async (req, res) => {

    try {

        const { message, sessionId } = req.body;

        // Validate both
        if (!message || !sessionId) {
            return res.status(400).json({
                success: false,
                error: "Message and sessionId are required"
            });
        }

        logger.info("[CHAT] User message received", {
            sessionId: sessionId.substring(0, 8),
            message: message.trim()
        });


        // Send request to n8n
        const n8nResponse = await axios.post(
            N8N_WEBHOOK_URL,
            {
                message: message.trim(),
                sessionId: sessionId
            },
            {
                headers: {
                    "X-API-Key": N8N_WEBHOOK_SECRET,
                    "Content-Type":
                        "application/json"
                },

                // Prevent infinite waiting
                timeout: 60000
            }
        );


        logger.info("[CHAT] n8n response received", {
            status: n8nResponse.status
        });

        logger.info("[CHAT] n8n raw response", {
            data: n8nResponse.data
        });


        const data = n8nResponse.data;

        const returnedSessionId = data?.sessionId;
        const botResponse = data?.response;


        if (returnedSessionId !== sessionId) {
            logger.warn("[CHAT] Session ID mismatch", {
                sentSessionId: sessionId.substring(0, 8),
                returnedSessionId: returnedSessionId?.substring(0, 8)
            });

            return res.status(502).json({
                success: false,
                error: "Session ID mismatch."
            });
        }

        // Validate chatbot response
        if (typeof botResponse !== "string" || !botResponse.trim()) {
            logger.warn("[CHAT] Empty response from n8n", {
                sessionId: sessionId.substring(0, 8)
            });

            return res.status(502).json({
                success: false,
                error: "n8n returned an empty response."
            });
        }

        logger.info("[CHAT] Session validated", {
            sessionId: sessionId.substring(0, 8)
        });

        logger.info("[CHAT] Bot response generated", {
            responseLength: botResponse.length
        });

        return res.json({
            success: true,
            response: botResponse.trim()
        });


    } catch (error) {

        logger.error("[CHAT] n8n ERROR", {
            message: error.message,
            code: error.code,
            status: error.response?.status,
            response: error.response?.data
        });

        // Timeout
        if (error.code === "ECONNABORTED") {

            return res.status(504).json({
                success: false,
                error:
                    "n8n took too long to respond. Please try again."
            });
        }


        // n8n returned an HTTP error
        if (error.response) {

            return res.status(502).json({
                success: false,
                error:
                    "n8n returned an error. Check the n8n workflow."
            });
        }


        // n8n is not reachable
        return res.status(500).json({
            success: false,
            error:
                "Unable to communicate with n8n."
        });
    }
});


app.listen(3000, "127.0.0.1", () => {

    logger.info(
        "Server running at http://localhost:3000"
    );

});