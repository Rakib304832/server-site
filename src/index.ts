import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import "./config/db";
import studioRoutes from "./routes/studio.routes";
import bookingRoutes from "./routes/booking.routes";
import errorHandler from "./middleware/errorHandler";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGINS
      ? process.env.CLIENT_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

// Error handler (must be last)
app.use(errorHandler);

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log("MongoDB connected");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to connect to DB", error);
    process.exit(1);
  }
}

start();