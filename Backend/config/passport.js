const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/User');
require('dotenv').config();

const clientID = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const callbackURL = process.env.GOOGLE_CALLBACK_URL;

if (!clientID || clientID === 'dummy-client-id') {
  console.warn('⚠️ Google OAuth Client ID is not configured. Google login will not function. Use the mock login option on the dashboard for testing.');
}


passport.use(
  new GoogleStrategy(
    {
      clientID: clientID || 'dummy-client-id.apps.googleusercontent.com',
      clientSecret: clientSecret || 'dummy-client-secret',
      callbackURL: callbackURL || 'http://axionlimit-alb-693430163.ap-south-1.elb.amazonaws.com/auth/google/callback',
      passReqToCallback: true
    },
    async (req, accessToken, refreshToken, profile, done) => {
      try {
        let email = 'no-email@google.com';
        if (profile.emails && profile.emails.length > 0) {
          email = profile.emails[0].value;
        }

        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = new User({
            googleId: profile.id,
            email: email,
            name: profile.displayName,
            avatar: profile.photos && profile.photos.length > 0 ? profile.photos[0].value : ''
          });
          await user.save();
        }

        return done(null, user);
      } catch (err) {
        console.error('Error during Google Strategy authentication:', err);
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

module.exports = passport;

