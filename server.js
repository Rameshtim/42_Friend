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

app.use(express.static("public"));
app.use(express.json());
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
  // redisClient.on("error", (err) => {
  //   console.error("❌ Redis Error:", err);
  // });
  
  // redisClient.on("connect", () => {
  //   console.log("✅ Successfully connected to Redis");
  // });


 
  
  // connectToRedis();

// Add this before your session middleware

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - Cookies:`, req.headers.cookie || 'None');
  next();
});

app.use(
  session({
    store: new RedisStore({ 
      client: redisClient,
      logErrors: (err) => console.error(`[${new Date().toISOString()}] Redis Store Error:`, err),
      ttl: 14400,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 4 * 60 * 60 * 1000,
    },
    genid: (req) => {
      const newId = require('crypto').randomBytes(16).toString('hex');
      console.log(`[${new Date().toISOString()}] New Session ID Generated:`, newId);
      return newId;
    }
  })
);

redisClient.on("error", (err) => console.error(`[${new Date().toISOString()}] Redis Client Error:`, err));
redisClient.on("connect", () => console.log(`[${new Date().toISOString()}] Redis Connected`));
redisClient.on("reconnecting", () => console.log(`[${new Date().toISOString()}] Redis Reconnecting`));


async function connectToRedis() {
  try {
    await redisClient.connect();
    console.log("✅ Redis connection established");
  } catch (error) {
    console.error("❌ Redis connection error:", error);
  }
}
// // Session middleware
// app.use(
//   session({
//     store: new RedisStore({ client: redisClient }),
//     secret: process.env.SESSION_SECRET || 'your-secret-key',
//     resave: false,
//     saveUninitialized: false,
//     cookie: {
//       secure: process.env.NODE_ENV === 'production', // true in production (HTTPS), false locally
//       httpOnly: true,
//       sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Required for cross-origin requests
//       maxAge: 4 * 60 * 60 * 1000, // 4 hours, matches your logs
//     },
//   })
// );

  // const sessionMiddleware = session({
  //   store: new RedisStore({ client: redisClient }),
  //   secret: process.env.SESSION_SECRET, 
  //   name: 'connect.sid',
  //   resave: false,
  //   saveUninitialized: false,
  //   proxy: true,
  //   cookie: {
  //     secure: true,
  //   //   httpOnly: false,
  //     httpOnly: true,
  //     sameSite: 'none',
  //     maxAge: 1000 * 60 * 60 * 4,  // 1 day session expiration
  //     // domain: '.ondigitalocean.app',  // Add this line
  //     // domain: 'goldfish-app-fibzf.ondigitalocean.app', // Force domain match
  //     partitioned: true // Add support for CHIPS (Cookie Having Independent Partitioned State)
  //     // path: '/'  // Add this line
  //   },
  // });
  
  
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
//     res.header('Access-Control-Allow-Origin', 'https://goldfish-app-fibzf.ondigitalocean.app');
//     res.header('Access-Control-Allow-Credentials', 'true');
//   res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
//   res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
//   next();
// });


// app.use((req, res, next) => {
  //   res.setHeader("CF-Access-Bot-Detection", "false");
  //   next();
  // });
  
  
  // app.use(session(sessionConfig));
// app.use(sessionMiddleware);
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

process.on('SIGINT', () => {
    monitor.stopAll();
    process.exit();
});


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
  // console.log("📌 Profile Route - Session Data:", req.session);
  console.log(`[${new Date().toISOString()}] Profile Route - Session ID:`, req.sessionID);
  console.log(`[${new Date().toISOString()}] Profile Route - Session Data:`, req.session);

  if (!req.isAuthenticated()) {
    console.log("user not authenticated", req.user);
    return res.redirect("/?error=User not authenticated.");
  }

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
    console.log(`[${new Date().toISOString()}] /get-notifications - Session ID:`, req.sessionID);
    console.log(`[${new Date().toISOString()}] /get-notifications - User:`, req.user?.username);
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
        const campus_id = req.user.campus_id;
        
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

        
        const onlineUsers = users.filter(user => user.user.location !== null).map(user => ({
            username: user.user.login,
            displayname: user.user.displayname,
            image: user.user.image.versions.small,
            grade: user.grade,
            level: user.level
        }));
        
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
                grade: user.grade 
            };
        }).sort((a, b) => new Date(b.nlast_seen) - new Date(a.nlast_seen)); 
        
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

      const userResponse = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!userResponse.ok) {
          const errorText = await userResponse.text();
          console.error("Error response from 42 API:", errorText);
          return res.redirect(`/profile?error=**${username}** not found!`);
      }

      const user = await userResponse.json();
      console.log("User found:", user.location);
      const coreCursus = user.cursus_users.find(cursus=> cursus.cursus_id === 21);

      const updatedAt = new Date(user.updated_at);
      const now = new Date();
      const daysAgo = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24)); 

      res.render("profile", { 
          user: req.user, 
          searchedUser: user, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), 
          last_seen: updatedAt.toLocaleDateString("en-GB"),
          formatted_time: updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
          days_ago: daysAgo,
          level: coreCursus.level,
      });

  } catch (error) {
      console.error("Error fetching user data:", error.message);
      res.render("profile", { 
          user: req.user, 
          searchedUser: null, 
          activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()),
          error: "User not found or an error occurred." 
      });
  }
});


async function startServer() {
  await connectToRedis();
  app.listen(3000, () => {
    console.log('Server running on port 3000');
  });
}
startServer();
