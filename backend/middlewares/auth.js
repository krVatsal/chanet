
export const isVerified = (req, res, next) => {
    if (!req.isAuthenticated()) {
       return res.redirect('/');
    } else {
       console.log("User logged in");
       next(); // Proceed to the next middleware or route handler
    }
 };