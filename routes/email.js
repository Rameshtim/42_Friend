
const express = require('express');
const router = express.Router();
const { EmailService } = require('./emailService');
const emailService = new EmailService();

router.post("/send-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.redirect("/home?error=User not authenticated.");
    }

    const { email, searchedUserEmail, sendEmail, sendSlack, alsoSendEmail, username, reqUsername, duration, intervall } = req.body;
    console.log('this is sendEmail', req.body);
    
    if (sendEmail === undefined) {
      return res.redirect("/profile?error=Email notification not enabled.");
    }

    if (alsoSendEmail) {
      await emailService.sendStatusChangeEmailAlso(reqUsername, searchedUserEmail);

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
            searchedUserEmail,
            selectedDuration,
            selectedIntervall
        );

        if (success) {
          // req.app.locals.monitor.stopMonitoring(username);
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

