const express = require("express");
const passport = require("passport");
const router = express.Router();

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
      }
      res.cookie('session_id', req.sessionID, { httpOnly: true }); // Store session ID in cookie
      res.redirect('/profile');  // Redirect after saving session
  });
});

// Logout
router.get("/logout", (req, res) => {
  req.logout(() => {
    res.redirect("/");
  });
});

module.exports = router;
