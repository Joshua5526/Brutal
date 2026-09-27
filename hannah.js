// ========================================
// HANNAH DASHBOARD — FRONTEND
// ========================================
// 
// IMPORTANT:
// Hannah authentication and authorization happen on the backend.
//
// Expected API:
// GET  /api/auth/me
// GET  /api/hannah/conversations
// GET  /api/hannah/conversations/:id/messages
// POST /api/hannah/conversations/:id/messages
//
// The backend must enforce role === "hannah" on EVERY Hannah endpoint.
// Do not rely on this JavaScript for authorization.

const HANNAH_API = "/api/owner";

const conversationList =
    document.getElementById("conversation-list");

const conversationMessages =
    document.getElementById("conversation-messages");

const conversationName =
    document.getElementById("conversation-name");

const conversationEmail =
    document.getElementById("conversation-email");

const replyForm =
    document.getElementById("reply-form");

const replyInput =
    document.getElementById("reply-input");

const replyButton =
    document.getElementById("reply-button");

const refreshButton =
    document.getElementById("refresh-button");

let selectedConversationId = null;

async function hannahRequest(path, options = {}) {
    const response = await fetch(`${HANNAH_API}${path}`, {
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
        // No JSON body.
    }

    if (!response.ok) {
        throw new Error(data?.message || "Request failed.");
    }

    return data;
}

async function verifyHannahAccess() {
    const response = await fetch("/api/auth/me", {
        credentials: "include"
    });

    if (!response.ok) {
        window.location.href = "login.html";
        return false;
    }

    const data = await response.json();
    const user = data.user;

    if (!user || user.role !== "owner") {
        window.location.href = "login.html";
        return false;
    }

    return true;
}

async function loadConversations() {
    try {
        const data = await hannahRequest("/conversations");
        const conversations = data.conversations || [];

        conversationList.innerHTML = "";

        if (conversations.length === 0) {
            const empty = document.createElement("div");
            empty.style.padding = "20px";
            empty.style.color = "#756f66";
            empty.style.fontSize = "13px";
            empty.textContent = "No messages yet.";
            conversationList.appendChild(empty);
            return;
        }

        conversations.forEach((conversation) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "conversation-item";

            if (conversation.id === selectedConversationId) {
                button.classList.add("active");
            }

            const name = document.createElement("span");
            name.className = "conversation-item__name";

            // For anonymous conversations, the backend must return
            // "ANONYMOUS" and must not return the person's identity.
            name.textContent =
                conversation.anonymous
                    ? "ANONYMOUS"
                    : conversation.name || "User";

            const preview = document.createElement("span");
            preview.className = "conversation-item__preview";
            preview.textContent =
                conversation.latestMessage?.text || "";

            button.append(name, preview);

            button.addEventListener("click", () => {
                selectConversation(conversation.id);
            });

            conversationList.appendChild(button);
        });
    } catch (error) {
        console.error(error);
        alert("Could not load conversations.");
    }
}

async function selectConversation(id) {
    selectedConversationId = id;

    await loadConversations();
    await displaySelectedConversation();

    replyInput.disabled = false;
    replyButton.disabled = false;
    replyInput.focus();
}

async function displaySelectedConversation() {
    if (!selectedConversationId) return;

    try {
        const data = await hannahRequest(
            `/conversations/${encodeURIComponent(selectedConversationId)}/messages`
        );

        const conversation = data.conversation;
        const messages = data.messages || [];

        conversationName.textContent =
            conversation?.anonymous
                ? "ANONYMOUS"
                : conversation?.name || "User";

        // IMPORTANT:
        // An anonymous conversation should NEVER contain an email.
        conversationEmail.textContent =
            conversation?.anonymous
                ? ""
                : (conversation?.email || "");

        conversationMessages.innerHTML = "";

        messages.forEach((message) => {
            const wrapper = document.createElement("div");

            const fromHannah = message.fromHannah ?? message.sender === "owner";
            const createdAt = message.createdAt ?? message.created_at;

            wrapper.className = fromHannah
                ? "owner-message"
                : "user-message";

            const bubble = document.createElement("div");
            bubble.className = "dashboard-message";

            const author = document.createElement("div");
            author.className = "message-author";

            author.textContent = fromHannah
                ? "HANNAH"
                : (conversation?.anonymous
                    ? "ANONYMOUS"
                    : conversation?.name || "USER");

            const text = document.createElement("div");
            text.textContent = message.text || "";

            const time = document.createElement("div");
            time.className = "message-time";

            if (createdAt) {
                time.textContent =
                    new Date(createdAt).toLocaleString();
            }

            bubble.append(author, text, time);
            wrapper.appendChild(bubble);
            conversationMessages.appendChild(wrapper);
        });

        conversationMessages.scrollTop =
            conversationMessages.scrollHeight;
    } catch (error) {
        console.error(error);
        alert("Could not load this conversation.");
    }
}

async function sendHannahReply() {
    const text = replyInput.value.trim();

    if (!text || !selectedConversationId) return;

    try {
        await hannahRequest(
            `/conversations/${encodeURIComponent(selectedConversationId)}/messages`,
            {
                method: "POST",
                body: JSON.stringify({ text })
            }
        );

        replyInput.value = "";
        await displaySelectedConversation();
        await loadConversations();
        replyInput.focus();
    } catch (error) {
        console.error(error);
        alert(error.message || "Could not send the reply.");
    }
}

if (replyForm) {
    replyForm.addEventListener("submit", (event) => {
        event.preventDefault();
        sendHannahReply();
    });
}

if (replyInput) {
    replyInput.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendHannahReply();
        }
    });
}

if (refreshButton) {
    refreshButton.addEventListener("click", async () => {
        await loadConversations();

        if (selectedConversationId) {
            await displaySelectedConversation();
        }
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    const allowed = await verifyHannahAccess();

    if (!allowed) return;

    await loadConversations();
    setupLogout();
});

  function setupLogout() {

    const logoutButton =
        document.querySelector("#logout");

    if (!logoutButton) return;


    logoutButton.addEventListener(
        "click",
        async function (event) {

            event.preventDefault();


            try {

                await fetch(
                    `${API_URL}/logout`,
                    {
                        method: "POST",
                        credentials: "include"
                    }
                );

            } catch (error) {

                console.error(
                    "Logout error:",
                    error
                );
            }


            window.location.href =
                "index.html";

        }
    );
}

