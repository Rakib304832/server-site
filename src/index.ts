import "dotenv/config";
import { toNodeHandler } from "better-auth/node";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import mongoose from "mongoose";
import { auth } from "./lib/auth.js";
import { trustedOrigins } from "./lib/trustedOrigins.js";
import { errorHandler } from "./middleware/errorHandler.js";
import bookingRoutes from "./routes/booking.routes.js";
import studioRoutes from "./routes/studio.routes.js";

const app = express();
app.use(
  cors({
    origin: trustedOrigins,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.all("/api/auth/*splat", toNodeHandler(auth));

const PORT = Number(process.env.PORT ?? 5000);
let connectionPromise: Promise<void> | undefined;

async function connectToDatabase() {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  if (!process.env.MONGODB_URI) {
    throw new Error("MONGODB_URI is not configured");
  }

  if (!connectionPromise) {
    connectionPromise = mongoose
      .connect(process.env.MONGODB_URI)
      .then(() => undefined)
      .finally(() => {
        connectionPromise = undefined;
      });
  }

  await connectionPromise;
}

app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

app.use(async (_req, _res, next) => {
  try {
    await connectToDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

// Routes
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;

async function start() {
  try {
    await connectToDatabase();
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to DB", error);
    process.exit(1);
  }
}

if (!process.env.VERCEL) {
  void start();
}