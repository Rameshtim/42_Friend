const express = require("express");
const session = require("express-session");
const { exec } = require("child_process");
// const MemoryStore = require("express-session").MemoryStore;
const passport = require("passport");
const bodyParser = require("body-parser");
require("dotenv").config();
require("./config/passport");
const fetch = require("node-fetch");
const util = require("util");
const sleep = util.promisify(setTimeout);
const fs = require("fs");
const app = express();
// const RedisStore = require("connect-redis")(session);
const redis = require("redis");
const connectRedis = require("connect-redis");
// const RedisStore = connectRedis(session);
const RedisStore = connectRedis.RedisStore; // Correct import for v6+

// Middleware
app.use(express.static("public"));
app.use(express.json()); // Add this to parse JSON body properly
app.set("view engine", "ejs");
app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: true }));


const redisClient = redis.createClient({
    url: 'redis://127.0.0.1:6379' ,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          return new Error('Max reconnection attempts reached');
        }
        return Math.min(retries * 100, 3000);
      }
    }
  });
    redisClient.on("error", (err) => {
    console.error("❌ Redis Error:", err);
  });
  
  redisClient.on("connect", () => {
    console.log("✅ Successfully connected to Redis");
  });


  async function connectToRedis() {
    try {
      await redisClient.connect();
      console.log("✅ Redis connection established");
    } catch (error) {
      console.error("❌ Redis connection error:", error);
    }
  }
  
  connectToRedis();

  const sessionMiddleware = session({
    store: new RedisStore({ client: redisClient }),
    secret: process.env.SESSION_SECRET, 
    name: 'connect.sid',
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
    //   httpOnly: false,
      httpOnly: true,
      sameSite: 'none',
      maxAge: 1000 * 60 * 60 * 24,  // 1 day session expiration
      // domain: '.ondigitalocean.app',  // Add this line
      // path: '/'  // Add this line
    },
  });
  
  
  // const DOMAIN = 'goldfish-app-fibzf.ondigitalocean.app';
  
  const cors = require('cors');

  app.use(cors({
    origin: process.env.NODE_ENV === 'production'
        ? 'https://goldfish-app-fibzf.ondigitalocean.app'
        : 'http://localhost:3000',
    credentials: true,
    exposedHeaders: ['set-cookie'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']  // Add this
}));

// app.use((req, res, next) => {
//   res.set({
//       'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
//       'X-Content-Type-Options': 'nosniff',
//       'X-Frame-Options': 'SAMEORIGIN',
//       'X-XSS-Protection': '1; mode=block'
//   });
//   next();
// });


// app.use((req, res, next) => {
  //   res.header('Access-Control-Allow-Origin', 'https://goldfish-app-fibzf.ondigitalocean.app');
  //   res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
//   next();
// });


// app.use((req, res, next) => {
  //   res.setHeader("CF-Access-Bot-Detection", "false");
  //   next();
  // });
  
  
  // app.use(session(sessionConfig));
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




app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session Data:', req.session);
  // console.log('Is Authenticated:', req.isAuthenticated());
  next();
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  if (err.name === 'UnauthorizedError') {
      return res.redirect('/?error=Session expired. Please login again.');
  }
  next(err);
});

// Add this before your session middleware
app.use((req, res, next) => {
  console.log('Incoming request cookies:', req.headers.cookie);
  next();
});

// Add this after your session middleware
app.use((req, res, next) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  next();
});



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

app.get("/about", (req, res) => {
    if (!req.isAuthenticated()) {
        user = null;
    } else {
        user = req.user;
    }
  res.render("rtimsina", {
    user
  });
});


app.get("/profile", (req, res) => {
  console.log("📌 Profile Route - Session Data:", req.session);

  if (!req.isAuthenticated()) {
    console.log("user not authenticated", req.user);
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

app.get("/get-notifications", (req, res) => {
    const user = req.query.user;
    res.json(app.locals.monitor.getNotifications(user));
});

function getLevelRange(coreLevel) {
    let l_level, u_level;

    if (coreLevel < 1) {
        l_level = 0.01;
        u_level = l_level + 2;
    } else if (coreLevel < 2.5) {
        l_level = 1.05;
        u_level = l_level + 2;
    } else if (coreLevel < 3.6) {
        l_level = 2.5;
        u_level = l_level + 1.5;
    } else if (coreLevel < 4.3) {
        l_level = 3.6;
        u_level = l_level + 1.5;
    } else if (coreLevel < 5.5) {
        l_level = 4.3;
        u_level = l_level + 2;
    } else if (coreLevel < 9) {
        l_level = 5.5;
        u_level = l_level + 4;
    } else {
        l_level = 10;
        u_level = l_level * 10;
    }

    return { l_level, u_level };
}

// Add this route to fetch users from the 42 API
app.get("/fetch-users", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/?error=User not authenticated.");
    }
    
    const accessToken = req.user.access_token;
    const coreCursus = req.user.cursus_users.find(cursus => cursus.cursus_id === 21);
    const coreLevel = coreCursus.level;
    // const coreLevel = 4.08;
    const { l_level, u_level } = getLevelRange(coreLevel);
    console.log(`This is lower level: ${l_level} and this is upper level: ${u_level}`);
    if (!accessToken) {
        return res.redirect("/?error=Access token missing. Please log in again.");
    }
    
    try {
        let users = [];
        let page = 1;
        const perPage = 100;
        const delay = 1200;
        const campus_id = req.user.campus[0].id;
        
        while (true) {
            const response = await fetch(`https://api.intra.42.fr/v2/cursus_users?filter%5Bcampus_id%5D=${campus_id}&filter%5Bcursus_id%5D=21&range%5Blevel%5D=${l_level},${u_level}&page=${page}&per_page=${perPage}`, {
                headers: { Authorization: `Bearer ${accessToken}` }
            });
            
            if (!response.ok) {
                throw new Error("Failed to fetch users from 42 API");
            }
            
            const pageUsers = await response.json();
            if (pageUsers.length === 0) break;
            
            users = users.concat(pageUsers);
            page++;
            await sleep(delay); // Introduce delay to respect API limits
        }
        
        // const filePath = "/usr/src/app/shared_data/fetched_users.json"; // Save inside shared volume
        // fs.writeFileSync(filePath, JSON.stringify(users, null, 2), "utf-8");
        // console.log(`✅ Users saved at ${filePath}`);

        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const now = new Date();

        
        // Filter users who are currently on campus
        const onlineUsers = users.filter(user => user.user.location !== null).map(user => ({
            username: user.user.login,
            displayname: user.user.displayname,
            image: user.user.image.versions.small,
            grade: user.grade,
            level: user.level
        }));
        
        // Filter users who were active in the last 7 days
        const recentUsers = users.filter(user => {
            const updatedAt = new Date(user.user.updated_at);
            return updatedAt >= sevenDaysAgo && !onlineUsers.some(peer => peer.username === user.user.login);
        }).map(user => {
            const updatedAt = new Date(user.user.updated_at);
            const daysAgo = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)); // Calculate days ago
            return {
                username: user.user.login,
                displayname: user.user.displayname,
                image: user.user.image.versions.small,
                nlast_seen: updatedAt,
                last_seen: updatedAt.toLocaleDateString("en-GB"), // Format as DD-MM-YYYY
                formatted_time: updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), // HH:MM (24-hour format)
                days_ago: daysAgo,
                level: user.level,
                grade: user.grade // Store grade for color coding
            };
        }).sort((a, b) => new Date(b.nlast_seen) - new Date(a.nlast_seen)); // Sort by most recent
        
        res.render("peers", { 
            user: req.user, 
            peers: onlineUsers,
            recentPeers: recentUsers,
            level: coreLevel
        });
    } catch (error) {
        console.error("Error fetching users:", error.message);
        return res.redirect("/profile?error=Internal server error.");
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
  console.log("user Name : ", req.user.displayname);
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
      const coreCursus = user.cursus_users.find(cursus=> cursus.cursus_id === 21);
    //   console.log('This is users cursus level ', coreCursus.level);
    //   console.log("User cursus_user:", user.cursus_users);

      const updatedAt = new Date(user.updated_at);
      const now = new Date();
      const daysAgo = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)); // Calculate days ago

      res.render("profile", { 
          user: req.user, 
          searchedUser: user, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), // Pass monitored users
          last_seen: updatedAt.toLocaleDateString("en-GB"), // Format as DD-MM-YYYY
          formatted_time: updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), // HH:MM (24-hour format)
          days_ago: daysAgo,
          level: coreCursus.level,
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
