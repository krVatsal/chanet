import express from 'express';
import session from 'express-session';
import dbConnect from './database/connect.js';
import User from './models/user.js';
import flash from 'connect-flash';
import passport from './middlewares/passport-config.js';
import MongoStore from 'connect-mongo';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js'; 
import genRoutes from './routes/generate.js';
import cors from 'cors';
import History from './models/history.js';
import http from 'http';
import { initSocketHandler } from './controller/gemini.controller.js';
dotenv.config();

let app = express();
const server = http.createServer(app);
initSocketHandler(server);

dbConnect();

app.use(cors({
    origin: "https://chanet-frontend-974929463300.asia-south2.run.app",
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie'
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.DATABASE,
    ttl: 24 * 60 * 60 // 1 day
  }),
  cookie: {
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000
  }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.set('trust proxy', 1); // Trust the first proxy
// Global variables for flash messages
app.use((req, res, next) => {
  res.locals.success_msg = req.flash('success_msg');
  res.locals.error_msg = req.flash('error_msg');
  res.locals.error = req.flash('error');
  next();
});

// Replace app.listen with server.listen
server.listen('5217', () => {
    console.log("app listening on port 5217");
});

// Routes
app.use('/auth', authRoutes);
app.use('/gen', genRoutes);

// app.use('/check', async (req, res) => {
//      try {
//        const prompt = new History({
//             author: req.user._id,
//             prompt: "line follower",
//        });
//        await prompt.save();
//        console.log("done done ");
//        res.status(200).json({ message: "History saved successfully" });
//      } catch (error) {
//        console.error("Error saving history:", error);
//        res.status(500).json({ message: "Error saving history" });
//      }
// }
// );

export default app;