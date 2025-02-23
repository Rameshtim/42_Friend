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
      callbackURL: "https://goldfish-app-fibzf.ondigitalocean.app/auth/42/callback",
      // callbackURL: "http://localhost:3000/auth/42/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("✅ OAuth2 Callback Triggered!"); // Debugging
        console.log("Access Token:", accessToken);
        console.log("Refresh Token:", refreshToken);

        // Fetch user profile from 42 API
        const response = await fetch("https://api.intra.42.fr/v2/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const user = await response.json();
        console.log("User Profile:", user.displayname);

        // Store the access token inside the user object
        user.access_token = accessToken;
        user.refresh_token = refreshToken;
        // localStorage.setItem("access_token", user.access_token);

        return done(null, user);
      } catch (error) {
        console.error("❌ Error fetching user profile:", error);
        return done(error, null);
      }
    }
  )
);



passport.serializeUser((user, done) => {
  console.log("Serializing user:");
  done(null, user);
});

passport.deserializeUser((user, done) => {
    console.log("Deserializing user:");
  done(null, user);
});



// // Strategy configuration
// const strategyConfig = {
//     authorizationURL: "https://api.intra.42.fr/oauth/authorize",
//     tokenURL: "https://api.intra.42.fr/oauth/token",
//     clientID: process.env.FT_CLIENT_ID,
//     clientSecret: process.env.FT_CLIENT_SECRET,
//     callbackURL: process.env.NODE_ENV === 'production'
//         ? "https://goldfish-app-fibzf.ondigitalocean.app/auth/42/callback"
//         : "http://localhost:3000/auth/42/callback",
//     proxy: true
// };

// passport.use(new OAuth2Strategy(strategyConfig, async (accessToken, refreshToken, profile, done) => {
//     try {
//         const response = await fetch("https://api.intra.42.fr/v2/me", {
//             headers: { Authorization: `Bearer ${accessToken}` },
//         });

//         if (!response.ok) {
//             throw new Error('Failed to fetch user profile');
//         }

//         const user = await response.json();
//         user.access_token = accessToken;
//         user.refresh_token = refreshToken;
        
//         return done(null, user);
//     } catch (error) {
//         console.error("❌ OAuth callback error:", error);
//         return done(error, null);
//     }
// }));