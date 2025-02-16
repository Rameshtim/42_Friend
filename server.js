const express = require("express");
const session = require("express-session");
const MemoryStore = require("express-session").MemoryStore;
const passport = require("passport");
const bodyParser = require("body-parser");
require("dotenv").config();
require("./config/passport");
const fetch = require("node-fetch");
const app = express();


// Middleware
app.use(express.static("public"));
app.use(express.json()); // Add this to parse JSON body properly
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: true }));



const sessionMiddleware = session({
  store: new MemoryStore(),
  secret: "supersecret",
  resave: false,
  saveUninitialized: false, 
  cookie: {
    secure: false,  
    httpOnly: true,
    sameSite: 'lax',
  },
});

app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/email");
app.use(authRoutes);
app.use(emailRoutes);
app.use(express.static('images')); 

const { StatusMonitor } = require('./routes/statusMonitor');
const { EmailService } = require('./routes/emailService');
const monitor = new StatusMonitor();
const emailService = new EmailService();
app.locals.monitor = monitor;

// Add these event listeners after creating the monitor
monitor.on('statusChange', async (status) => {
    console.log("this monitor event is triggered in server js.");
    await emailService.sendStatusChangeEmail(status.email, status.username, status);
    app.locals.monitor.stopMonitoring(status.username);
});

monitor.on('monitoringExpired', async ({ username, email }) => {
    await emailService.sendStatusChangeEmail(
        email,
        username,
        { isOnline: false, error: 'Monitoring period has expired' }
    );
});

monitor.on('error', (error) => {
    console.error('Monitor error:', error);
});

// Clean up on server shutdown
process.on('SIGINT', () => {
    monitor.stopAll();
    process.exit();
});


// Home Route
app.get("/", (req, res) => {
  res.render("home");
});


app.get("/profile", (req, res) => {
  // console.log("📌 Profile Route - Session Data:", req.session);

  if (!req.isAuthenticated()) {
    return res.redirect("/?error=User not authenticated.");
  }

  // Get monitored users from the StatusMonitor class
  // const activeMonitors = Array.from(app.locals.monitor.activeMonitors.keys()); // Get only usernames
  const activeMonitors = app.locals.monitor?.activeMonitors 
    ? Array.from(app.locals.monitor.activeMonitors.keys()) 
    : [];
  console.log('activeMonitors: ', activeMonitors);

  res.render("profile", { 
    user: req.user, 
    searchedUser: null, 
    activeMonitors 
  });
});


app.post("/stop-monitoring", (req, res) => {
  const { username } = req.body;
  const success = app.locals.monitor.stopMonitoring(username);

  if (success) {
    res.json({ success: true, message: `Stopped monitoring ${username}` });
  } else {
    res.json({ success: false, message: `Failed to stop monitoring ${username}` });
  }
});

app.post("/check-user", async (req, res) => {
  if (!req.isAuthenticated()) {
      console.log("User is not authenticated");
      return res.redirect("/?error=User not authenticated.");
  }

  const { username } = req.body;
  const accessToken = req.user.access_token;

  console.log("Access Token:", accessToken);
  if (!accessToken) {
      console.error("❌ No access token found in session.");
      return res.render("profile", { 
          user: req.user, 
          searchedUser: null, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), // Pass monitored users
          error: "You need to log in again." 
      });
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
          return res.redirect(`/profile?error=**${username}** not found!`);
          // throw new Error("User not found");
      }

      const user = await userResponse.json();
      console.log("User found:", user.location);

      if (req.headers.accept && req.headers.accept.includes("application/json")) {
          return res.json({ user });
      }
      if (req.query.json) {
          return res.json({ user });
      }

      if (typeof user.location === "string") {
          user.status_message = `✅ ${username} is online (Location: ${user.location})`;
      } else {
          user.status_message = `❌ ${username} is not on campus`;
      }

      res.render("profile", { 
          user: req.user, 
          searchedUser: user, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()) // Pass monitored users
      });

  } catch (error) {
      console.error("Error fetching user data:", error.message);
      res.render("profile", { 
          user: req.user, 
          searchedUser: null, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), // Ensure `activeMonitors` is passed
          error: "User not found or an error occurred." 
      });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
