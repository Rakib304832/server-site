import "dotenv/config";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import { errorHandler } from "./middleware/errorHandler";
import bookingRoutes from "./routes/booking.routes";
import studioRoutes from "./routes/studio.routes";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

// CORS configuration with credentials for HTTP-only cookies
app.use(
  cors({
    origin: process.env.CLIENT_ORIGINS
      ? process.env.CLIENT_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean)
      : ["http://localhost:3000"],
    credentials: true,
  })
);
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));

// Routes
app.use("/api/studios", studioRoutes);
app.use("/api/bookings", bookingRoutes);

// Error handler (must be last)
app.use(errorHandler);

// Export for Vercel serverless functions
export const handler = async (req: Request, res: Response) => {
  // Allow local development with app.listen()
  if (process.env.NODE_ENV !== "production") {
    try {
      await mongoose.connect(process.env.MONGODB_URI as string);
      console.log("MongoDB connected");

      app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
      });
    } catch (error) {
      console.error("Failed to connect to DB", error);
    }
  }

  // Vercel serverless function handler
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    app(req as Request, res as Response);
  } catch (error) {
    console.error("Error handling request:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// For local development: start the server if run directly
if (require.main === module) {
  start();
}

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