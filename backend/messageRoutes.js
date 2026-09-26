const express = require("express");
const pool = require("./db");
const { requireLogin, requireOwner } = require("./middleware");

const router = express.Router();


// ========================================
// CREATE CONVERSATION
// ========================================

router.post("/conversations", requireLogin, async (req, res) => {

    try {

        const { anonymous = false } = req.body;

        if (typeof anonymous !== "boolean") {
        return res.status(400).json({
        error: "anonymous must be true or false."
        });
        }

        const result = await pool.query(
            `
            INSERT INTO conversations
                (user_id, anonymous)
            VALUES
                ($1, $2)
            RETURNING id, anonymous, created_at
            `,
            [
                req.session.userId,
                Boolean(anonymous)
            ]
        );

        res.status(201).json({
            conversation: result.rows[0]
        });

    } catch (error) {

        console.error("Create conversation error:", error);

        res.status(500).json({
            error: "Could not create conversation."
        });

    }

});


// ========================================
// SEND USER MESSAGE
// ========================================

router.post(
    "/conversations/:conversationId/messages",
    requireLogin,
    async (req, res) => {

        try {

            const conversationId =
                Number(req.params.conversationId);

            const { text } = req.body;

            if (!text || !text.trim()) {
                return res.status(400).json({
                    error: "Message cannot be empty."
                });
            }


            // Make sure this conversation
            // actually belongs to the logged-in user.

            const conversationResult = await pool.query(
                `
                SELECT id, user_id, anonymous
                FROM conversations
                WHERE id = $1
                `,
                [conversationId]
            );


            if (conversationResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Conversation not found."
                });
            }


            const conversation =
                conversationResult.rows[0];


            if (
                conversation.user_id !==
                req.session.userId
            ) {
                return res.status(403).json({
                    error: "You do not have access to this conversation."
                });
            }


            // IMPORTANT:
            // We do NOT store the user's name or email
            // in the message.

            const result = await pool.query(
                `
                INSERT INTO messages
                    (conversation_id, sender, text)
                VALUES
                    ($1, 'user', $2)
                RETURNING id, conversation_id, sender, text, created_at
                `,
                [
                    conversationId,
                    text.trim()
                ]
            );


            res.status(201).json({
                message: result.rows[0]
            });

        } catch (error) {

            console.error("Send message error:", error);

            res.status(500).json({
                error: "Could not send message."
            });

        }

    }
);


// ========================================
// GET USER'S CONVERSATIONS
// ========================================

router.get(
    "/conversations",
    requireLogin,
    async (req, res) => {

        try {

            const result = await pool.query(
                `
                SELECT
                    id,
                    anonymous,
                    created_at
                FROM conversations
                WHERE user_id = $1
                ORDER BY created_at DESC
                `,
                [req.session.userId]
            );


            res.json({
                conversations: result.rows
            });

        } catch (error) {

            console.error(
                "Get conversations error:",
                error
            );

            res.status(500).json({
                error: "Could not load conversations."
            });

        }

    }
);


// ========================================
// GET USER'S MESSAGES
// ========================================

router.get(
    "/conversations/:conversationId/messages",
    requireLogin,
    async (req, res) => {

        try {

            const conversationId =
                Number(req.params.conversationId);


            const conversationResult = await pool.query(
                `
                SELECT id, user_id, anonymous
                FROM conversations
                WHERE id = $1
                `,
                [conversationId]
            );


            if (conversationResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Conversation not found."
                });
            }


            const conversation =
                conversationResult.rows[0];


            if (
                conversation.user_id !==
                req.session.userId
            ) {
                return res.status(403).json({
                    error: "You do not have access to this conversation."
                });
            }


            const messagesResult = await pool.query(
                `
                SELECT
                    id,
                    conversation_id,
                    sender,
                    text,
                    created_at
                FROM messages
                WHERE conversation_id = $1
                ORDER BY created_at ASC
                `,
                [conversationId]
            );


            res.json({
                conversation: {
                    id: conversation.id,
                    anonymous: conversation.anonymous
                },
                messages: messagesResult.rows
            });

        } catch (error) {

            console.error(
                "Get user messages error:",
                error
            );

            res.status(500).json({
                error: "Could not load messages."
            });

        }

    }
);


// ========================================
// HANNAH: GET ALL CONVERSATIONS
// ========================================

router.get(
    "/owner/conversations",
    requireOwner,
    async (req, res) => {

        try {

            const result = await pool.query(
                `
                SELECT
                    c.id,
                    c.anonymous,
                    c.created_at,

                    CASE
                        WHEN c.anonymous = true
                        THEN NULL
                        ELSE u.name
                    END AS name,

                    CASE
                        WHEN c.anonymous = true
                        THEN NULL
                        ELSE u.email
                    END AS email

                FROM conversations c

                JOIN users u
                    ON u.id = c.user_id

                ORDER BY c.created_at DESC
                `
            );


            res.json({
                conversations: result.rows
            });

        } catch (error) {

            console.error(
                "Owner conversations error:",
                error
            );

            res.status(500).json({
                error: "Could not load conversations."
            });

        }

    }
);


// ========================================
// HANNAH: GET CONVERSATION MESSAGES
// ========================================

router.get(
    "/owner/conversations/:conversationId/messages",
    requireOwner,
    async (req, res) => {

        try {

            const conversationId =
                Number(req.params.conversationId);


            const conversationResult = await pool.query(
                `
                SELECT
                    c.id,
                    c.anonymous,

                    CASE
                        WHEN c.anonymous = true
                        THEN NULL
                        ELSE u.name
                    END AS name,

                    CASE
                        WHEN c.anonymous = true
                        THEN NULL
                        ELSE u.email
                    END AS email

                FROM conversations c

                JOIN users u
                    ON u.id = c.user_id

                WHERE c.id = $1
                `,
                [conversationId]
            );


            if (conversationResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Conversation not found."
                });
            }


            const conversation =
                conversationResult.rows[0];


            const messagesResult = await pool.query(
                `
                SELECT
                    id,
                    conversation_id,
                    sender,
                    text,
                    created_at
                FROM messages
                WHERE conversation_id = $1
                ORDER BY created_at ASC
                `,
                [conversationId]
            );


            res.json({
                conversation,
                messages: messagesResult.rows
            });

        } catch (error) {

            console.error(
                "Owner messages error:",
                error
            );

            res.status(500).json({
                error: "Could not load messages."
            });

        }

    }
);


// ========================================
// HANNAH: REPLY
// ========================================

router.post(
    "/owner/conversations/:conversationId/messages",
    requireOwner,
    async (req, res) => {

        try {

            const conversationId =
                Number(req.params.conversationId);

            const { text } = req.body;


            if (!text || !text.trim()) {
                return res.status(400).json({
                    error: "Message cannot be empty."
                });
            }


            const conversationResult = await pool.query(
                `
                SELECT id
                FROM conversations
                WHERE id = $1
                `,
                [conversationId]
            );


            if (conversationResult.rows.length === 0) {
                return res.status(404).json({
                    error: "Conversation not found."
                });
            }


            const result = await pool.query(
                `
                INSERT INTO messages
                    (conversation_id, sender, text)
                VALUES
                    ($1, 'owner', $2)
                RETURNING
                    id,
                    conversation_id,
                    sender,
                    text,
                    created_at
                `,
                [
                    conversationId,
                    text.trim()
                ]
            );


            res.status(201).json({
                message: result.rows[0]
            });

        } catch (error) {

            console.error(
                "Owner reply error:",
                error
            );

            res.status(500).json({
                error: "Could not send reply."
            });

        }

    }
);


module.exports = router;