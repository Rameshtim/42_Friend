const express = require("express");
const session = require("express-session");
const { exec } = require("child_process");
const passport = require("passport");
const bodyParser = require("body-parser");
require("dotenv").config();
require("./config/passport");
const fetch = require("node-fetch");
const util = require("util");
const sleep = util.promisify(setTimeout);
const fs = require("fs");
const app = express();
const { DateTime } = require("luxon");

const connectRedis = require('connect-redis'); 
const RedisStore = connectRedis.RedisStore;
const Redis = require('ioredis');

app.use(express.static("public"));
app.use(express.json());
app.set("view engine", "ejs");
app.set('trust proxy', 1);
app.use(bodyParser.urlencoded({ extended: true }));
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const redisClient = new Redis({
	host: 'localhost', // "redis" service in docker-compose
	port: 6379,
	retryStrategy: (times) => {
		if (times > 10) return null; // Stop retrying after 10 attempts
		return Math.min(times * 200, 3000);
	},
	commandTimeout: 10000,
		reconnectOnError: (err) => {
				const targetError = 'READONLY';
				if (err.message.slice(0, targetError.length) === targetError) {
					// Only reconnect when the error contains "READONLY"
					return true;
				}
				return false;
			},
		enableOfflineQueue: false
});

const redisStore = new RedisStore({ client: redisClient, prefix: 'sess:', ttl: 14400 });

app.use(
	session({
		store: redisStore,
		secret: process.env.SESSION_SECRET || 'your-secr55%%^^et-key',
		resave: false,
		saveUninitialized: false,
		rolling: true,
		cookie: {
			secure: process.env.NODE_ENV === 'production', // Secure in production
			httpOnly: true,
			sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
			maxAge: 10 * 60 * 1000, // 1 hour in milliseconds if no activity
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

app.use(passport.initialize());
app.use(passport.session());

const authRoutes = require("./routes/auth");
const emailRoutes = require("./routes/email");
app.use(authRoutes);
app.use(emailRoutes);
app.use(express.static('images')); 

const { StatusMonitor } = require('./routes/statusMonitor');
const { EmailService } = require('./routes/emailService');
const { time } = require("console");
const monitor = new StatusMonitor();
const emailService = new EmailService();
app.locals.monitor = monitor;

let totalActiveUser = 0;


// Error handling middleware
app.use((err, req, res, next) => {
	console.error('Server Error:', err);
	if (err.name === 'UnauthorizedError') {
			return res.redirect('/?error=Session expired. Please login again.');
	}
	next(err);
});

app.use(async (req, res, next) => {
	const sessionCount = await redisClient.dbsize(); // Get the number of keys (sessions) in Redis
	if (sessionCount >= 100 ) {
	  return res.status(503).send('Server is at capacity. Please try again later.');
	}
	totalActiveUser = sessionCount;
	next();
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
	if (!req.isAuthenticated()) {
		user = null;
	} else {
			user = req.user;
	}
	res.render("home", {
		totalActiveUser,
		user
	});
});

app.get("/about", (req, res) => {
		if (!req.isAuthenticated()) {
				user = null;
		} else {
				user = req.user;
		}
	res.render("rtimsina", {
		user,
		totalActiveUser
	});
});


app.get("/profile", (req, res) => {
	console.log(`[${new Date().toISOString()}] Profile Route - Session ID:`, req.sessionID);

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
		activeMonitors,
		totalActiveUser 
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
	// console.log("coreCursus", coreCursus);
    const coreLevel = coreCursus.level;
    const { l_level, u_level } = getLevelRange(coreLevel);

    if (!accessToken) {
        return res.redirect("/?error=Access token missing. Please log in again.");
    }

    try {
        let users = [];
        let page = 1;
        const perPage = 100;
        const delay = 1200;
		console.log("request user", req.user);
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
            await sleep(delay);
        }

        // ✅ Get user's timezone offset from request header
        const userOffset = req.headers["x-timezone-offset"] ? parseInt(req.headers["x-timezone-offset"]) : 0;
        const userTimezone = `UTC${userOffset >= 0 ? "-" : "+"}${Math.abs(userOffset) / 60}`; // Convert to readable UTC offset

        console.log("User timezone offset in minutes:", userOffset, "Formatted:", userTimezone);

        // ✅ Get local time using user's offset
        const now = DateTime.now().setZone(userTimezone);
        console.log("Local time on server:", now.toISO());

        // ✅ Calculate 7 days ago based on user timezone
        const sevenDaysAgo = now.minus({ days: 7 });

        const onlineUsers = users.filter(user => user.user.location !== null).map(user => ({
            username: user.user.login,
            displayname: user.user.displayname,
            image: user.user.image.versions.small,
            grade: user.grade,
            level: user.level
        }));

        const recentUsers = users.filter(user => {
            const updatedAt = DateTime.fromISO(user.user.updated_at, { zone: "UTC" }) // Convert UTC to DateTime
                .setZone(userTimezone); // Convert to user's timezone

            return updatedAt >= sevenDaysAgo && !onlineUsers.some(peer => peer.username === user.user.login);
        }).map(user => {
            const updatedAt = DateTime.fromISO(user.user.updated_at, { zone: "UTC" }).setZone(userTimezone);

            const timeDiff = now.diff(updatedAt, ["hours", "days"]).toObject();
            const hoursAgo = Math.floor(timeDiff.hours);
            const daysAgo = Math.floor(timeDiff.days);

            let timeAgo;
            if (hoursAgo < 24) {
                timeAgo = hoursAgo === 0 ? "Recently" : `${hoursAgo} ${hoursAgo === 1 ? "hour" : "hours"} ago`;
            } else {
                timeAgo = `${daysAgo} ${daysAgo === 1 ? "day" : "days"} ago`;
            }

            return {
                username: user.user.login,
                displayname: user.user.displayname,
                image: user.user.image.versions.small,
                nlast_seen: updatedAt.toISO(),
                last_seen: updatedAt.toFormat("dd-MM-yyyy"), // Format as DD-MM-YYYY
                formatted_time: updatedAt.toFormat("HH:mm"), // 24-hour format
                days_ago: timeAgo,
                level: user.level,
                grade: user.grade
            };
        }).sort((a, b) => DateTime.fromISO(b.nlast_seen) - DateTime.fromISO(a.nlast_seen));

        res.render("peers", { 
            user: req.user, 
            peers: onlineUsers,
            recentPeers: recentUsers,
            level: coreLevel,
            totalActiveUser
        });

    } catch (error) {
        console.error("Error fetching users:", error.message);
        return res.redirect("/profile?error=Internal server error.");
    }
});


app.post("/fetch-users-campus", async (req, res) => {
    if (!req.isAuthenticated()) {
        return res.redirect("/?error=User not authenticated.");
    }
    
    const accessToken = req.user.access_token;

    const { l_level, u_level, campus_id, cursus_s } = req.body;

    const effectiveCampusId = campus_id || req.user.campus_id;
    
    let effectiveLowerLevel = parseInt(l_level, 10);
	if (parseInt(cursus_s, 10) === 9) {
		effectiveLowerLevel = 5;
		if (u_level && u_level < 6) {
			u_level = 6;
		}
	}
    const effectiveUpperLevel = u_level ? parseInt(u_level, 10) : effectiveLowerLevel + 1;

    try {
        let users = [];
        let page = 1;
        const perPage = 100;
        const delay = 1200;

        while (true) {
            const response = await fetch(
                `https://api.intra.42.fr/v2/cursus_users?filter%5Bcampus_id%5D=${effectiveCampusId}&filter%5Bcursus_id%5D=${cursus_s}&range%5Blevel%5D=${effectiveLowerLevel},${effectiveUpperLevel}&page=${page}&per_page=${perPage}`,
                {
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            if (!response.ok) {
                throw new Error("Failed to fetch users from 42 API");
            }

            const pageUsers = await response.json();
            if (pageUsers.length === 0) break;

            users = users.concat(pageUsers);
            page++;
			console.log("loading page", page);
            await sleep(delay); // Respect API rate limits
        }

        let filteredUsers = users; // Initialize with all users

		if (parseInt(cursus_s, 10) !== 9) {
			filteredUsers = users
				.filter(user => 
					user.user["staff?"] === false && 
					user.user["alumni?"] === false && 
					user.user["active?"] === true
				);
		}

		const allUsers = filteredUsers.map(user => ({
			username: user.user.login,
			displayname: user.user.displayname,
			image: user.user.image.versions.small,
			grade: user.grade,
			level: user.level,
			location: user.user.location 
		}));

        res.render("campus", { 
            user: req.user,
			loggedUser: req.user.username,
            allUsers: allUsers,
			totalActiveUser
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

	console.log("User Name:", req.user.displayname);

	if (!accessToken) {
			console.error("❌ No access token found in session.");
			return res.render("profile", { 
					user: req.user, 
					searchedUser: null, 
					activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), 
					error: "You need to log in again." 
			});
	}

	try {
			console.log(`Fetching user data for: ${username}`);

			// Fetch user details
			const userResponse = await fetch(`https://api.intra.42.fr/v2/users/${username}`, {
					headers: { Authorization: `Bearer ${accessToken}` },
			});

			if (!userResponse.ok) {
					const errorText = await userResponse.text();
					console.error("Error response from 42 API:", errorText);
					return res.redirect(`/profile?error=**${username}** not found!`);
			}

			const user = await userResponse.json();
			// console.log("*************** \n\n\nUser found:", user);

			const coreCursus = user.cursus_users.find(cursus => cursus.cursus_id === 21);
			const updatedAt = new Date(user.updated_at);
			const now = new Date();
			const daysAgo = Math.floor((now - updatedAt) / (1000 * 60 * 60 * 24));

			// Fetch user's projects
			await delay(2000);
			const projectsResponse = await fetch(`https://api.intra.42.fr/v2/users/${user.id}/projects_users`, {
					headers: { Authorization: `Bearer ${accessToken}` },
			});

			let projectsInfo = "No active project";

			if (projectsResponse.ok) {
					const projects = await projectsResponse.json();

					// Find the project that is "in_progress"
					const activeProjects = projects.filter(proj => 
						proj.status !== "finished" && proj.status !== "waiting_for_correction" && proj.final_mark === null
				);

				const formattedProjects = activeProjects.map(proj => {
					const proj_update_date = new Date(proj.created_at).toLocaleDateString("en-GB");
					return `${proj.project.name} (${proj.status}) Since(${proj_update_date})`;
				});

				if (formattedProjects.length > 0) {
						projectsInfo = formattedProjects.join(", ");
				}
			} else {
					console.error("Error fetching projects data:", await projectsResponse.text());
			}

			res.render("profile", { 
					user: req.user, 
					searchedUser: user, 
					activeMonitors: Array.from(app.locals.monitor.activeMonitors.keys()), 
					last_seen: updatedAt.toLocaleDateString("en-GB"),
					formatted_time: updatedAt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
					days_ago: daysAgo,
					level: coreCursus?.level || "N/A",
					projectsInfo,
					totalActiveUser
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
	app.listen(3000, () => {
		console.log('Server running on port 3000');
	});
}
startServer();
