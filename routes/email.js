
const express = require('express');
const router = express.Router();

router.post("/send-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/home?message=User not authenticated.");
    }

    const { email, sendEmail, username, duration, intervall } = req.body;
    console.log('this is sendEmail', req.body);
    
    if (sendEmail === undefined) {
      return res.redirect("/profile?message=Email notification not enabled.");
    }

    const durations = {
        "30min": 30,
        "1hour": 60,
        "2hours": 120,
        "4hours": 240
    };
    
    const intervalls = {
        "5sec": 5,
        "30sec": 30,
        "1min": 60,
        "5min": 300,
        "10min": 600,
        "30min": 1800
    };

    const selectedIntervall = intervalls[intervall] || 60;

    const selectedDuration = durations[duration] || 60;

    try {
        const success = await req.app.locals.monitor.startMonitoring(
            username,
            req.user.access_token,
            email,
            selectedDuration,
            selectedIntervall
        );

        if (success) {
          req.app.locals.monitor.stopMonitoring(username);
          return res.redirect("/profile?message=Monitoring started successfully for" + username + " for " + selectedDuration + " minutes.");
        } else {
          // req.app.locals.monitor.stopMonitoring(username);
          return res.redirect("/profile?error=Monitoring already active for " + username + " for " + selectedDuration + " minutes.");
        }
        } catch (error) {
          console.error('Error starting monitoring:', error);
          return res.redirect("/profile?error=Failed to start monitoring for " + username + " for " + selectedDuration + " minutes.");
    }
});

module.exports = router;


// const express = require("express");
// const nodemailer = require("nodemailer");
// const fetch = require("node-fetch");

// const router = express.Router();

// router.post("/send-email", async (req, res) => {
//   const { email, sendEmail, username, duration } = req.body;

//   if (!sendEmail) {
//     return res.json({ success: false, message: "Email notification not enabled." });
//   }

//   console.log("Monitoring for:", duration, "minutes");

//   const durations = {
//     "30min": 30,
//     "1hour": 60,
//     "2hours": 120,
//     "4hours": 240,
//   };

//   const selectedDuration = durations[duration] || 60; // Default to 1 hour
//   const checkInterval = 10; // Check every 10 minutes
//   let elapsedTime = 0;

//   const accessToken = req.user.access_token; // Get access token from the logged-in user
//   console.log("-------this is access token from email-----", accessToken);

//   if (!accessToken) {
//     return res.json({ success: false, message: "Authentication required. Please log in again." });
//   }

//   let host;
//   let senderEmail = process.env.EMAIL_USER;
//   if (senderEmail.includes("@gmail.com")) {
//     host = "gmail";
//   } else if (senderEmail.includes("@outlook.com") || senderEmail.includes("@hotmail.com")) {
//     host = "office365";
//   } else if (senderEmail.includes("@yahoo.com")) {
//     host = "yahoo";
//   } else {
//     return res.json({ success: false, message: "Unsupported email provider." });
//   }

//   const transporter = nodemailer.createTransport({
//     service: host,
//     auth: {
//       user: process.env.EMAIL_USER,
//       pass: process.env.EMAIL_PASS,
//     },
//   });

//   async function checkStatusAndSendEmail() {
//     const sessionId = document.cookie.split('; ').find(row => row.startsWith('session_id='))?.split('=')[1];
//     try {
//       const response = await fetch("http://localhost:3000/check-user", {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           "Authorization": `Bearer ${sessionId}`,
//         },
//         body: JSON.stringify({ username }),
//         credentials: "include", // This ensures that the session cookie is sent
//       });

//       if (!response.ok) {
//         console.error("Failed to fetch user status:", await response.text());
//         return;
//       }

//       const data = await response.json();
//       const userLocation = data.user?.location || null;

//       console.log(`Updated user location for ${username}:`, userLocation);

//       if (userLocation) {
//         const mailOptions = {
//           from: process.env.EMAIL_USER,
//           to: email,
//           subject: "42 School Campus Status",
//           text: `Hello, ${username} has arrived on campus! ✅`,
//         };

//         await transporter.sendMail(mailOptions);
//         console.log("✅ Email sent: User arrived on campus");
//         return; // Stop checking
//       }

//       elapsedTime += checkInterval;

//       if (elapsedTime < selectedDuration) {
//         setTimeout(checkStatusAndSendEmail, checkInterval * 60000); // Continue checking
//       } else {
//         console.log("⏳ Time limit reached. Stopping checks.");
//       }
//     } catch (error) {
//       console.error("❌ Error fetching status or sending email:", error);
//     }
//   }

//   checkStatusAndSendEmail(); // Start monitoring

//   res.json({ success: true, message: `Monitoring started for ${selectedDuration} minutes.` });
// });

// module.exports = router;
