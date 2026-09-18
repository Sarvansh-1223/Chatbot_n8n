const sessionId =
    (typeof crypto !== "undefined" &&
     typeof crypto.randomUUID === "function")
        ? crypto.randomUUID()
        : Date.now() + "-" + Math.random().toString(36).substring(2);


let isSending = false;


async function sendMessage() {

    // Prevent multiple requests at the same time
    // if (isSending) {
    //     return;
    // }


    const input =
        document.getElementById("messageInput");

    const sendButton =
        document.querySelector("button");


    const message =
        input.value.trim();


    // Don't send empty messages
    if (!message) {
        return;
    }


    isSending = true;

    input.disabled = true;

    if (sendButton) {
        sendButton.disabled = true;
    }


    // Display user message
    addMessage(message, "user");

    input.value = "";


    // Show thinking message
    addMessage("Thinking...", "bot");


    try {

        const response = await fetch(
            "/api/chat",
            {
                method: "POST",

                headers: {
                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({
                    message: message,
                    sessionId: sessionId
                })
            }
        );


        /*
         * Read response safely
         */
        let data;

        try {

            data = await response.json();

        } catch (jsonError) {

            throw new Error(
                "Server returned an invalid response."
            );

        }

        // Remove Thinking...
        removeThinkingMessage();

        /*
         * Check HTTP status
         */
        if (!response.ok) {

            addMessage(
                data.error ||
                "The server returned an error.",
                "bot"
            );

            return;
        }

        /*
         * Check success
         */
        if (
            data.success !== true
        ) {

            addMessage(
                data.error ||
                "Something went wrong.",
                "bot"
            );

            return;
        }


        /*
         * Check actual bot response
         */
        if (
            typeof data.response !== "string" ||
            !data.response.trim()
        ) {
            addMessage(
                "The AI returned an empty response. Please try again.",
                "bot"
            );

            return;
        }


        // Display AI response
        addMessage(
            data.response.trim(),
            "bot"
        );


    } catch (error) {

        removeThinkingMessage();

        addMessage(
            error.message ||
            "Unable to connect to the server.",
            "bot"
        );

    } finally {

        // Always unlock input
        isSending = false;

        input.disabled = false;

        if (sendButton) {
            sendButton.disabled = false;
        }

        input.focus();
    }
}


function addMessage(text, type) {

    const chatMessages =
        document.getElementById("chatMessages");


    const messageDiv =
        document.createElement("div");


    messageDiv.classList.add(
        "message",
        type
    );


    /*
     * Never allow undefined/null
     * to create an empty bubble.
     */
    if ( text === undefined || text === null || String(text).trim() === "" ) {
        text = "No response received.";
    }

    messageDiv.textContent =String(text);

    chatMessages.appendChild( messageDiv );

    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function removeThinkingMessage() {

    const messages =
        document.querySelectorAll(
            ".message.bot"
        );

    messages.forEach(message => {

        if ( message.textContent.trim() === "Thinking..." ) {
            message.remove();
        }

    });
}


/*
 * Enter key
 */
document.getElementById("messageInput").addEventListener(
    "keypress",
    function (event) {

        if ( event.key === "Enter" && !event.shiftKey ) {
            event.preventDefault();
            sendMessage();
        }

    }
);