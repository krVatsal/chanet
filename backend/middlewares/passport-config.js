import passport from 'passport';
import { Strategy as GitHubStrategy } from 'passport-github';
import User from '../models/user.js'; 
import History from '../models/history.js';

const GITHUB_CLIENT_ID = process.env.CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.CLIENT_SECRET;
const GITHUB_CALLBACK_URL = 'http://localhost:5217/auth/github/callback';

// GitHub Strategy
passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL: GITHUB_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Find or create user
        let user = await User.findOne({ githubId: profile.id });
        if (!user) {
          user = await User.create({
            githubId: profile.id,
            username: profile.username,
            displayName: profile.displayName,
            avatarUrl: profile.photos[0]?.value || '',
            email: profile.emails?.[0]?.value || profile._json.email || '',
          });

          let history = await History.findOne({ author: user._id });
          if (!history) {
            history = new History({ author: user._id, chat: [] });
            await history.save();
          }
        }

        done(null, user);

      } catch (error) {
        done(error, null);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
