const express = require("express");
const bcrypt = require("bcrypt");
const pool = require("./db");
const { requireOwner } = require("./middleware");

const router = express.Router();

// ========================================
// CREATE ACCOUNT
// ========================================

router.post("/register", async (req, res) => {

    try {

        const { name, email, password } = req.body;

        const normalizedName = String(name || "").trim();
        const normalizedEmail = String(email || "").trim().toLowerCase();

        // Check required fields
        if (!normalizedName || !normalizedEmail || !password) {
            return res.status(400).json({
                error: "Name, email, and password are required."
            });
        }

        // Basic password requirement
        if (password.length < 6) {
            return res.status(400).json({
                error: "Password must be at least 6 characters."
            });
        }

        // Check whether email already exists
        const existingUser = await pool.query(
            "SELECT id FROM users WHERE email = $1",
            [normalizedEmail]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "An account with that email already exists."
            });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(password, 12);

        // Create user
        const result = await pool.query(
            `
            INSERT INTO users
                (name, email, password_hash, role)
            VALUES
                ($1, $2, $3, 'user')
            RETURNING id, name, email, role
            `,
            [
                normalizedName,
                normalizedEmail,
                passwordHash
            ]
        );

        const user = result.rows[0];

        // Creating an account also signs the new user in.
        req.session.userId = user.id;
        req.session.role = user.role;

        return req.session.save((sessionError) => {
            if (sessionError) {
                console.error("Registration session error:", sessionError);
                return res.status(500).json({
                    error: "Account created, but the login session could not be established."
                });
            }

            return res.status(201).json({
            message: "Account created successfully.",
            user: user
            });
        });

    } catch (error) {

        console.error("Registration error:", error);

        return res.status(500).json({
            error: "Something went wrong while creating the account."
        });

    }

});

// ========================================
// LOGIN
// ========================================

router.post("/login", async (req, res) => {

    try {

        const { email, password } = req.body;

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({
                error: "Email and password are required."
            });
        }

        // Find user
        const result = await pool.query(
            `
            SELECT id, name, email, password_hash, role
            FROM users
            WHERE email = $1
            `,
            [email.toLowerCase()]
        );

        // Account doesn't exist
        if (result.rows.length === 0) {
            return res.status(401).json({
                error: "Incorrect email or password."
            });
        }

        const user = result.rows[0];

        // Compare password with stored hash
        const passwordMatches = await bcrypt.compare(
            password,
            user.password_hash
        );

        if (!passwordMatches) {
            return res.status(401).json({
                error: "Incorrect email or password."
            });
        }

        // Don't send password hash to frontend
        req.session.userId = user.id;
        req.session.role = user.role;

        return req.session.save((sessionError) => {
            if (sessionError) {
                console.error("Login session error:", sessionError);
                return res.status(500).json({
                    error: "Login succeeded, but the session could not be established."
                });
            }

            return res.json({
            message: "Login successful.",
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role
                }
            });
        });

    } catch (error) {

        console.error("Login error:", error);

        return res.status(500).json({
            error: "Something went wrong while logging in."
        });

    }

});

// ========================================
// LOGOUT
// ========================================

router.post("/logout", (req, res) => {

    req.session.destroy((error) => {

        if (error) {

            console.error("Logout error:", error);

            return res.status(500).json({
                error: "Could not log out."
            });
        }

        res.clearCookie("connect.sid");

        return res.json({
            message: "Logged out successfully."
        });

    });

});

// ========================================
// GET CURRENT USER
// ========================================

router.get("/me", async (req, res) => {

    try {

        if (!req.session.userId) {
            return res.status(401).json({
                error: "Not logged in."
            });
        }

        const result = await pool.query(
            `
            SELECT id, name, email, role
            FROM users
            WHERE id = $1
            `,
            [req.session.userId]
        );

        if (result.rows.length === 0) {
            req.session.destroy(() => {});

            return res.status(401).json({
                error: "User no longer exists."
            });
        }

        return res.json({
            user: result.rows[0]
        });

    } catch (error) {

        console.error("Session lookup error:", error);

        return res.status(500).json({
            error: "Could not check login."
        });
    }
});

router.get("/owner-test", requireOwner, (req, res) => {

    res.json({
        message: "Owner access confirmed.",
        userId: req.session.userId,
        role: req.session.role
    });

});

module.exports = router;