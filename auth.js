// ========================================
// BRUTAL AUTHENTICATION
// ========================================

// Use the same origin in production. If the API is hosted separately,
// set window.BRUTAL_API_URL before loading this script.
const API_ORIGIN = (window.BRUTAL_API_URL || "").replace(/\/$/, "");
const API_URL = `${API_ORIGIN}/api/auth`;


// ========================================
// GET CURRENT USER
// ========================================

async function getCurrentUser() {

    try {

        const response = await fetch(`${API_URL}/me`, {
            method: "GET",
            credentials: "include"
        });

        if (!response.ok) {
            return null;
        }

        const data = await response.json();

        return data.user;

    } catch (error) {

        console.error("Could not check login:", error);

        return null;
    }
}


// ========================================
// CHECK LOGIN
// ========================================

async function isLoggedIn() {

    const user = await getCurrentUser();

    return user !== null;
}


// ========================================
// CREATE ACCOUNT
// ========================================

function setupCreateAccount() {

    const form = document.querySelector(".account__form");

    if (!form) return;

    // Only run on create-account page
    const nameInput = document.getElementById("name");

    if (!nameInput) return;

    form.addEventListener("submit", async function (event) {

        event.preventDefault();

        const name =
            document.getElementById("name").value.trim();

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;

        const confirmPassword =
            document.getElementById("confirm-password").value;


        // ========================================
        // BASIC VALIDATION
        // ========================================

        if (!name || !email || !password || !confirmPassword) {

            alert("Please fill out every field.");

            return;
        }


        if (password !== confirmPassword) {

            alert("Your passwords do not match.");

            return;
        }


        if (password.length < 6) {

            alert(
                "Your password must be at least 6 characters."
            );

            return;
        }


        try {

            const response = await fetch(
                `${API_URL}/register`,
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    credentials: "include",

                    body: JSON.stringify({
                        name: name,
                        email: email,
                        password: password
                    })
                }
            );


            const data = await response.json();


            if (!response.ok) {

                alert(
                    data.error ||
                    "Could not create your account."
                );

                return;
            }


            // Registration also creates the login session on the backend.
            // Confirm that the browser received the session cookie before redirecting.
            const sessionResponse = await fetch(`${API_URL}/me`, {
                credentials: "include"
            });

            if (!sessionResponse.ok) {
                throw new Error("Account was created, but the login session could not be established.");
            }

            window.location.href = "logedin.html";


        } catch (error) {

            console.error(
                "Registration error:",
                error
            );

            alert(
                "Could not connect to the server."
            );
        }

    });
}


// ========================================
// LOGIN
// ========================================

function setupLogin() {

    const form =
        document.querySelector(".account__form");

    if (!form) return;


    const emailInput =
        document.getElementById("email");

    const passwordInput =
        document.getElementById("password");


    // Create-account page has these fields too,
    // so make sure this is actually the login page.

    if (
        !emailInput ||
        !passwordInput ||
        document.getElementById("name")
    ) {
        return;
    }


    form.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            const email =
                emailInput.value.trim();

            const password =
                passwordInput.value;


            try {

                const response =
                    await fetch(
                        `${API_URL}/login`,
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            credentials: "include",

                            body: JSON.stringify({
                                email: email,
                                password: password
                            })
                        }
                    );


                const data =
                    await response.json();


                if (!response.ok) {

                    alert(
                        data.error ||
                        "Incorrect email or password."
                    );

                    return;
                }


                // ========================================
                // OWNER LOGIN
                // ========================================

                if (data.user.role === "owner") {

                    window.location.href =
                        "hannah.html";

                    return;
                }


                // ========================================
                // NORMAL USER LOGIN
                // ========================================

                window.location.href =
                    "logedin.html";


            } catch (error) {

                console.error(
                    "Login error:",
                    error
                );

                alert(
                    "Could not connect to the server."
                );
            }

        }
    );
}


// ========================================
// PROTECT USER PROFILE PAGE
// ========================================

async function protectProfilePage() {

    if (
        window.location.pathname.endsWith(
            "logedin.html"
        )
    ) {

        const user =
            await getCurrentUser();


        if (!user) {

            window.location.href =
                "login.html";

            return;
        }


        // Hannah should not use the normal
        // user dashboard.

        if (user.role === "owner") {

            window.location.href =
                "hannah.html";

            return;
        }
    }
}


// ========================================
// DISPLAY USER NAME
// ========================================

async function displayUserName() {

    const nameElement =
        document.querySelector(".account__name");

    if (!nameElement) return;


    const user =
        await getCurrentUser();


    if (user) {

        nameElement.textContent =
            user.name;
    }
}


// ========================================
// LOGOUT
// ========================================

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


// ========================================
// REDIRECT LOGGED-IN USERS
// ========================================

async function redirectIfLoggedIn() {

    const user =
        await getCurrentUser();


    if (!user) return;


    if (user.role === "owner") {

        window.location.href =
            "hannah.html";

    } else {

        window.location.href =
            "logedin.html";
    }
}


// ========================================
// INITIALIZE
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        const path =
            window.location.pathname;


        // ========================================
        // NORMAL HOME PAGE
        // ========================================

        if (
            path.endsWith("index.html") ||
            path === "/" ||
            path.endsWith("/")
        ) {

            await redirectIfLoggedIn();
        }


        // ========================================
        // USER DASHBOARD
        // ========================================

        await protectProfilePage();


        // ========================================
        // ACCOUNT FORMS
        // ========================================

        setupCreateAccount();

        setupLogin();


        // ========================================
        // USER NAME
        // ========================================

        await displayUserName();


        // ========================================
        // LOGOUT
        // ========================================

        setupLogout();

    }
);