const express = require("express");
const passport = require("passport");
const router = express.Router();


// Redirect user to 42 OAuth login
router.get("/auth/42", passport.authenticate("oauth2"));

router.get(
  "/auth/42/callback",
  passport.authenticate("oauth2", { failureRedirect: "/" }),
  (req, res, next) => {
    console.log("Session after auth:", req.sessionID);
    const redirectTo = req.query.redirectTo || "/profile"; // Default to '/profile' if not provided
    req.session.save((err) => {
      if (err) {
        console.error("Session save error:", err);
        return next(err);
      }
      console.log("Session saved, redirecting to: ", redirectTo);
      setTimeout(() => res.redirect(redirectTo), 30); // Small delay
      // res.redirect("/profile");
    });
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.app.locals.monitor.stopAll();
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        res.redirect("/?error=Session destruction error");
      }
    res.redirect("/?error=you’ve managed to escape the clutches of the digital overlords with all the grace of a malfunctioning robot. I hope it feels as liberating as it sounds utterly pointless. What now? Stare into the void? Log back in? The possibilities are as endless as they are depressingly mundane.");
    });
  });
});

module.exports = router;
