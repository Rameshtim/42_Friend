const express = require("express");
const passport = require("passport");
const router = express.Router();
// const { StatusMonitor } = require('./statusMonitor');
// const monitor = new StatusMonitor;


// Redirect user to 42 OAuth login
router.get("/auth/42", passport.authenticate("oauth2"));

// Callback route after authentication
router.get(
  "/auth/42/callback",
  passport.authenticate("oauth2", { failureRedirect: "/" }),
  (req, res) => {
    req.session.save(err => {
      if (err) {
          console.error("❌ Error saving session:", err);
          return res.redirect('/?error: Error saving Session');
      }
      res.cookie('session_id', req.sessionID, { 
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: 'none',
        domain: '.ondigitalocean.app'
       }); // Store session ID in cookie
      res.redirect('/profile');  // Redirect after saving session
  });
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    req.app.locals.monitor.stopAll();
    res.redirect("/");
  });
});

module.exports = router;
