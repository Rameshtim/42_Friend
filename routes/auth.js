const express = require("express");
const passport = require("passport");
const router = express.Router();


// Redirect user to 42 OAuth login
router.get("/auth/42", passport.authenticate("oauth2"));

// router.get(
//   "/auth/42/callback",
//   passport.authenticate("oauth2", { failureRedirect: "/" }),
//   (req, res) => {
//     req.session.save(err => {
//       if (err) {
//           console.error("❌ Error saving session:", err);
//           return res.redirect('/?error: Error saving Session');
//       }
//       // res.cookie('session_id', req.sessionID, { httpOnly: true }); // Store session ID in cookie
//       res.redirect('/profile');  // Redirect after saving session
//   });
// });

router.get(
  "/auth/42/callback",
  passport.authenticate("oauth2", { failureRedirect: "/" }),
  (req, res) => {
    console.log("Session after auth:", req.session); // Debug session
    res.redirect("/profile");
  }
);

router.get("/logout", (req, res) => {
  req.logout(() => {
    req.app.locals.monitor.stopAll();
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
      }
    res.redirect("/");
    });
  });
});

module.exports = router;
