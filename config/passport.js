const passport = require("passport");
const OAuth2Strategy = require("passport-oauth2");
require("dotenv").config();

passport.use(
  new OAuth2Strategy(
    {
      authorizationURL: "https://api.intra.42.fr/oauth/authorize",
      tokenURL: "https://api.intra.42.fr/oauth/token",
      clientID: process.env.FT_CLIENT_ID,
      clientSecret: process.env.FT_CLIENT_SECRET,
      callbackURL: process.env.NODE_ENV === 'production'
      ? 'https://www.42friend-notifier.de/auth/42/callback'
      : 'http://localhost:3000/auth/42/callback',
      // ? 'https://goldfish-app-fibzf.ondigitalocean.app/auth/42/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("✅ OAuth2 Callback Triggered!"); // Debugging
        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);

        const response = await fetch("https://api.intra.42.fr/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const user = await response.json();
        console.log("User Profile:", user.displayname);

        user.access_token = accessToken;
        user.refresh_token = refreshToken;

        return done(null, user);
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        return done(error, null);
      }
    }
  )
);


passport.serializeUser((user, done) => {
  const primaryCampus = user.campus_users.find(campus => campus.is_primary === true);
  const primaryCampusId = primaryCampus ? primaryCampus.campus_id : user.campus[0].id;

  done(null, {
    id: user.id, // ID for unique identification
    displayname: user.displayname,
    username: user.login, // 'login' is the username
    image: user.image,
    access_token: user.access_token,
    refresh_token: user.refresh_token,
    cursus_users: user.cursus_users,
    campus_id: primaryCampusId,
  });
});

passport.deserializeUser((user, done) => {
    // console.log("Deserializing user:");
  done(null, user);
});

