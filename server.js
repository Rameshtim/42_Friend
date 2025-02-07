const express = require("express");
const session = require("express-session");
const passport = require("passport");
const bodyParser = require("body-parser");
require("dotenv").config();
require("./config/passport");
const fetch = require("node-fetch");
const app = express();

// Middleware
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));

app.use(
  session({
    secret: "mysecret",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/email");
app.use(authRoutes);
app.use(emailRoutes);

// Home Route
app.get("/", (req, res) => {
  res.render("home");
});

// Profile Route
app.get("/profile", (req, res) => {
  if (!req.isAuthenticated()) {
    return res.redirect("/");
  }
  res.render("profile", { user: req.user, searchedUser: null }); // Ensure searchedUser is always defined
});

app.post("/check-user", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/");
    }

    const { username } = req.body;
    const accessToken = req.user.access_token;

    console.log("Access Token:", accessToken);
    if (!accessToken) {
        console.error("❌ No access token found in session.");
        return res.render("profile", { user: req.user, searchedUser: null, error: "You need to log in again." });
    }

    try {
        console.log(`Fetching user data for: ${username}`);

        // Fetch user details from 42 API
        const userResponse = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userResponse.ok) {
            const errorText = await userResponse.text();
            console.error("Error response from 42 API:", errorText);
            throw new Error("User not found");
        }

        const user = await userResponse.json();
        console.log("User found:", user.location);
        console.log("type of response:", typeof user.location);


        if (typeof user.location === "string") {
            user.status_message = `✅ ${username} is online (Location: ${user.location})`;
        } else {
            user.status_message = `❌ ${username} is not in campus`;
        }

        res.render("profile", { user: req.user, searchedUser: user });
    } catch (error) {
        console.error("Error fetching user data:", error.message);
        res.render("profile", { user: req.user, searchedUser: null, error: "User not found or an error occurred." });
    }
});

// app.post("/check-user", async (req, res) => {
//   if (!req.isAuthenticated()) {
//       return res.status(401).json({ error: "Unauthorized. Please log in." });
//   }

//   const { username } = req.body;
//   const accessToken = req.user.access_token;

//   if (!accessToken) {
//       return res.status(401).json({ error: "Session expired. Please log in again." });
//   }

//   try {
//       const userResponse = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
//           headers: { Authorization: `Bearer ${accessToken}` },
//       });

//       if (!userResponse.ok) {
//           return res.status(404).json({ error: "User not found" });
//       }

//       const user = await userResponse.json();
//       const location = user.location;
//       const status_message = location ? `✅ ${username} is online (Location: ${location})` : `❌ ${username} is not on campus`;
//       const online = !!location; // Boolean: true if online, false otherwise

//       res.json({ status_message, online }); // Send online status as boolean
//   } catch (error) {
//       console.error("Error fetching user data:", error); // Log the error for debugging
//       res.status(500).json({ error: "An error occurred while fetching user data." });
//   }
// });


// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
