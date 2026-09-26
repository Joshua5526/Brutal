// ========================================
// BRUTAL MESSAGE SYSTEM — FRONTEND
// ========================================
//
// IMPORTANT:
// The browser must NEVER send the user's email/name when the
// anonymous option is enabled.
//
// Expected API:
// GET  /api/auth/me
// GET  /api/conversations/:id/messages
// POST /api/conversations
// POST /api/conversations/:id/messages
// DELETE /api/conversations/:id
//
// The backend determines the authenticated user from the session cookie.
// For anonymous conversations, the backend must keep the identity separate
// from the data exposed to Hannah.

const MESSAGE_API = "/api";

const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const chatMessages = document.getElementById("chat-messages");
const anonymousCheckbox = document.getElementById("anonymous-message");
const newChatButton = document.getElementById("new-chat");

let currentUser = null;
let conversationId = null;

async function messageRequest(path, options = {}) {
    const response = await fetch(`${MESSAGE_API}${path}`, {
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    let data = null;

    try {
        data = await response.json();
    } catch {
        // No JSON response.
    }

    if (!response.ok) {
        throw new Error(data?.message || "Request failed.");
    }

    return data;
}

function escapeText(value) {
    return String(value ?? "");
}

function createMessageElement(message) {
    const container = document.createElement("div");

    const fromHannah = message.fromHannah ?? message.sender === "owner";
    const anonymous = message.anonymous ?? false;

    if (fromHannah) {
        container.className = "message message--brutal";

        const avatar = document.createElement("div");
        avatar.className = "message__avatar";
        avatar.textContent = "H";

        const content = document.createElement("div");
        content.className = "message__content";

        const name = document.createElement("div");
        name.className = "message__name";
        name.textContent = "HANNAH";

        const text = document.createElement("p");
        text.textContent = escapeText(message.text);

        content.append(name, text);
        container.append(avatar, content);

        return container;
    }

    container.className = "message message--user";

    const content = document.createElement("div");
    content.className = "message__content";

    const name = document.createElement("div");
    name.className = "message__name";

    // The server should return "ANONYMOUS" for anonymous messages.
    // Never derive this from an email on the frontend.
    name.textContent = anonymous ? "ANONYMOUS" : "YOU";

    const text = document.createElement("p");
    text.textContent = escapeText(message.text);

    content.append(name, text);
    container.appendChild(content);

    return container;
}

async function loadConversation() {
    if (!conversationId) {
        chatMessages.innerHTML = "";
        return;
    }

    try {
        const data = await messageRequest(
            `/conversations/${encodeURIComponent(conversationId)}/messages`
        );

        chatMessages.innerHTML = "";

        (data.messages || []).forEach((message) => {
            chatMessages.appendChild(createMessageElement(message));
        });

        scrollToBottom();
    } catch (error) {
        console.error(error);
        alert("Could not load your conversation.");
    }
}

async function createConversation() {
    const anonymous = anonymousCheckbox?.checked ?? false;

    // The server gets the authenticated user from the session cookie.
    // We deliberately do NOT send email/name from the browser.
    const data = await messageRequest("/conversations", {
        method: "POST",
        body: JSON.stringify({
            anonymous
        })
    });

    conversationId = data.conversation?.id || null;
    return conversationId;
}

async function sendMessage() {
    const text = messageInput?.value.trim();

    if (!text) return;

    if (!currentUser) {
        alert("You must be logged in to send a message.");
        window.location.href = "login.html";
        return;
    }

    try {
        if (!conversationId) {
            await createConversation();
        }

        if (!conversationId) {
            throw new Error("The conversation could not be created.");
        }

        await messageRequest(
            `/conversations/${encodeURIComponent(conversationId)}/messages`,
            {
                method: "POST",
                body: JSON.stringify({
                    text
                    // No email.
                    // No name.
                    // No anonymous identity.
                    // The server knows the authenticated user.
                })
            }
        );

        messageInput.value = "";
        await loadConversation();
        messageInput.focus();
    } catch (error) {
        console.error(error);
        alert(error.message || "Could not send your message.");
    }
}

async function startNewChat() {
    if (!currentUser) return;

    const confirmed = confirm(
        "Start a new conversation? Your existing conversation will remain available to you."
    );

    if (!confirmed) return;

    try {
        conversationId = await createConversation();
        await loadConversation();
        messageInput?.focus();
    } catch (error) {
        console.error(error);
        alert("Could not start a new conversation.");
    }
}

function scrollToBottom() {
    if (!chatMessages) return;
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

async function initializeMessagePage() {
    if (!chatForm || !messageInput || !chatMessages) return;

    try {
        const data = await messageRequest("/auth/me");
        currentUser = data.user || null;

        if (!currentUser) {
            window.location.href = "login.html";
            return;
        }

// Load the user's conversations.
// The backend only returns conversations belonging
// to the currently logged-in user.

const conversationData =
    await messageRequest("/conversations");

const conversations =
    conversationData.conversations || [];

if (conversations.length > 0) {
    conversationId = conversations[0].id;
    await loadConversation();
}

messageInput.focus();
    } catch (error) {
        console.error(error);
        alert("Could not load your account.");
    }
}

if (chatForm) {
    chatForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendMessage();
    });
}

if (messageInput) {
    messageInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
}

if (newChatButton) {
    newChatButton.addEventListener("click", startNewChat);
}

document.addEventListener("DOMContentLoaded", initializeMessagePage);
