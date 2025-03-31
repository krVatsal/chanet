import express from 'express';
import passport from '../middlewares/passport-config.js'; // Path to your configured passport file

const router = express.Router();

// Route to initiate GitHub authentication
router.get('/github', passport.authenticate('github'));

// Route to handle the GitHub callback
router.get(
  '/github/callback',
  passport.authenticate('github', {
    failureRedirect: 'https://chanet-frontend-974929463300.asia-south2.run.app', // Redirect here if authentication fails
    successRedirect: 'https://chanet-frontend-974929463300.asia-south2.run.app',      // Redirect here if authentication succeeds
  })
);

// Route to log out the user
router.get('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).send(err.message); // Handle logout errors
    }

  });
  console.log("logged out")
  // res.redirect('https://chanet-frontend-974929463300.asia-south2.run.app/'); // Redirect to the home page or login page after logout
  return res.status(200).json({ message: 'Logged out' });
});

router.get('/status', (req, res) => {
  if (req.isAuthenticated()) {
      return res.status(200).json({ loggedIn: true, user: req.user });
      
  }
  res.status(401).json({ loggedIn: false });
});

export default router;
