const express = require("express");
const passport = require("passport");
const router = express.Router();
// const { StatusMonitor } = require('./statusMonitor');
// const monitor = new StatusMonitor;


// Redirect user to 42 OAuth login
router.get("/auth/42", passport.authenticate("oauth2"));

// // Callback route after authentication
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


router.get("/auth/42/callback",
  passport.authenticate("oauth2", { failureRedirect: "/" }),
  (req, res) => {
    req.session.regenerate(err => {
      if (err) {
        console.error("❌ Error regenerating session:", err);
        return res.redirect('/?error=Session regeneration failed');
      }
      req.session.user = req.user;
      req.session.save(err => {
        if (err) {
          console.error("❌ Error saving session:", err);
          return res.redirect('/?error=Error saving session');
        }
        console.log("✅ Successfully authenticated and session saved:", req.session);
        res.redirect('/profile');
      });
    });
  }
);




// Logout
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
