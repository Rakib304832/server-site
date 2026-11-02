// Loads .env values into process.env before anything else reads them.
import "dotenv/config";

// Express handles HTTP requests and routes them.
import express from "express";

// cors lets the client on port 3000 call this server on port 5000 from the browser.
import cors from "cors";

// cookie-parser puts cookie values on req.cookies, so verifyJwt can read the JWT.
import cookieParser from "cookie-parser";

const app = express();

// Use PORT from .env, fall back to 5000 when it is missing.
const PORT = Number(process.env.PORT) || 5000;

// The exact client URL. A wildcard "*" would block cookies when credentials are on.
const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// CORS runs first so every response, including preflight OPTIONS, gets the allow headers.
app.use(
  cors({
    origin: CLIENT_URL,
    // Lets the browser send and receive the JWT cookie across the two ports.
    credentials: true,
  })
);

// Parses JSON bodies so req.body is an object for the studio and booking forms.
app.use(express.json());

// Parses cookies. Must come before any route that reads the JWT.
app.use(cookieParser());

// Quick check that the server is alive, visit http://localhost:5000/api/health.
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Start listening only after setup is done.
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});