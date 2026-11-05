import "dotenv/config";
import express, { type Request, type Response } from "express";
import cors from "cors";
import mongoose from "mongoose";
import { auth } from "./auth.js";

const app = express();
const PORT = Number(process.env.PORT ?? 5000);

const configuredOrigins = process.env.CLIENT_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      const localDevOrigin = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin);
      if (localDevOrigin || configuredOrigins?.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "2mb" }));

const STUDIO_CATEGORIES = [
  "Photo Studio",
  "Film Stage",
  "Podcast Lounge",
  "Music Suite",
  "Workshop",
];

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

type SessionUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type SessionResult = {
  user: SessionUser;
} | null;

function toHeaders(headers: Request["headers"]): Headers {
  const result = new Headers();
  for (const [key, value] of Object.entries(headers)) {
    if (Array.isArray(value)) {
      for (const item of value) result.append(key, item);
    } else if (typeof value === "string") {
      result.set(key, value);
    }
  }
  return result;
}

async function getSession(req: Request): Promise<SessionResult> {
  try {
    const session = await auth.api.getSession({ headers: toHeaders(req.headers) });
    return (session as SessionResult) ?? null;
  } catch (error) {
    console.error("Could not read the auth session:", error);
    return null;
  }
}

async function requireUser(req: Request): Promise<SessionUser> {
  const session = await getSession(req);
  if (!session?.user) {
    throw new HttpError(401, "Please log in to continue.");
  }
  return session.user;
}

function studiosCollection() {
  const db = mongoose.connection.db;
  if (!db) throw new HttpError(503, "Database is not connected.");
  return db.collection("studios");
}

function bookingsCollection() {
  const db = mongoose.connection.db;
  if (!db) throw new HttpError(503, "Database is not connected.");
  return db.collection("bookings");
}

function idFilter(id: string) {
  if (/^[0-9a-f]{24}$/i.test(id)) {
    return { _id: new mongoose.Types.ObjectId(id) };
  }
  return { _id: id };
}

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return Number.NaN;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function normalizeAmenities(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return fallback;
}

function normalizeGallery(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const items = value.map((item) => String(item).trim()).filter(Boolean);
    if (items.length > 0) return items;
  }
  if (typeof value === "string" && value.trim()) {
    return [value.trim()];
  }
  return fallback;
}

function parseStudioPayload(body: unknown, existing?: Record<string, unknown>) {
  const input = (body ?? {}) as Record<string, unknown>;
  const has = (key: string) => Object.prototype.hasOwnProperty.call(input, key);
  const value = (key: string, fallback: unknown) => (has(key) ? input[key] : fallback);

  const title = asString(value("title", existing?.title));
  const category = asString(value("category", existing?.category));
  const hourlyRate = asNumber(value("hourlyRate", existing?.hourlyRate));
  const securityDeposit = asNumber(
    value("securityDeposit", existing?.securityDeposit),
  );
  const maxCapacity = asNumber(value("maxCapacity", existing?.maxCapacity));
  const location = asString(value("location", existing?.location));
  const image = asString(value("image", existing?.image));
  const overview = asString(value("overview", existing?.overview));
  const amenities = normalizeAmenities(
    value("amenities", existing?.amenities),
    Array.isArray(existing?.amenities) ? (existing.amenities as string[]) : [],
  );

  if (!title) throw new HttpError(400, "Title is required.");
  if (!STUDIO_CATEGORIES.includes(category)) {
    throw new HttpError(400, "Choose a valid studio category.");
  }
  if (!Number.isFinite(hourlyRate) || hourlyRate <= 0) {
    throw new HttpError(400, "Hourly rate must be a positive number.");
  }
  if (!Number.isFinite(securityDeposit) || securityDeposit < 0) {
    throw new HttpError(400, "Security deposit cannot be negative.");
  }
  if (!Number.isInteger(maxCapacity) || maxCapacity < 1) {
    throw new HttpError(400, "Max capacity must be at least 1 guest.");
  }
  if (!location) throw new HttpError(400, "Location is required.");
  if (!image || !/^(https?:\/\/|\/)/i.test(image)) {
    throw new HttpError(400, "Provide a valid image URL.");
  }
  if (!overview) throw new HttpError(400, "Overview is required.");

  const existingGallery = Array.isArray(existing?.gallery)
    ? (existing.gallery as string[])
    : [];
  const imageChanged = existing && image !== existing.image;
  const gallery = normalizeGallery(
    value("gallery", imageChanged ? [image] : existingGallery),
    [image],
  );

  return {
    title,
    category,
    hourlyRate: roundMoney(hourlyRate),
    securityDeposit: roundMoney(securityDeposit),
    maxCapacity,
    location,
    image,
    gallery,
    amenities,
    overview,
  };
}

function isOwner(studio: Record<string, unknown>, user: SessionUser): boolean {
  const ownerId = asString(studio.ownerId);
  const ownerEmail = asString(studio.ownerEmail).toLowerCase();
  return ownerId === user.id || ownerEmail === user.email.toLowerCase();
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function findStudio(id: string) {
  return studiosCollection().findOne(idFilter(id) as never);
}

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.get("/api/studios", async (req, res) => {
  const filter: Record<string, unknown> = {};

  const category = typeof req.query.category === "string" ? req.query.category : "";
  if (category && category !== "All") {
    filter.category = {
      $regex: `^${escapeRegex(category)}$`,
      $options: "i",
    };
  }

  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";
  if (search) {
    const regex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [{ title: regex }, { location: regex }, { overview: regex }];
  }

  if (req.query.mine === "true") {
    const user = await requireUser(req);
    filter.$and = [
      {
        $or: [
          { ownerId: user.id },
          { ownerEmail: { $regex: `^${escapeRegex(user.email)}$`, $options: "i" } },
        ],
      },
    ];
  }

  const studios = await studiosCollection()
    .find(filter as never)
    .sort({ createdAt: -1 })
    .toArray();

  res.json(studios);
});

app.get("/api/studios/:id", async (req, res) => {
  const studio = await findStudio(req.params.id);
  if (!studio) throw new HttpError(404, "Studio not found.");
  res.json(studio);
});

app.post("/api/studios", async (req, res) => {
  const user = await requireUser(req);
  const payload = parseStudioPayload(req.body);

  const studio = {
    ...payload,
    ownerId: user.id,
    ownerName: user.name,
    ownerEmail: user.email,
    ownerPhoto: user.image ?? "",
    rating: 0,
    reviewsCount: 0,
    createdAt: new Date().toISOString(),
  };

  const result = await studiosCollection().insertOne(studio as never);
  res.status(201).json({ ...studio, _id: result.insertedId });
});

app.patch("/api/studios/:id", async (req, res) => {
  const user = await requireUser(req);
  const existing = await findStudio(req.params.id);
  if (!existing) throw new HttpError(404, "Studio not found.");
  if (!isOwner(existing, user)) {
    throw new HttpError(403, "You can only edit studios that you own.");
  }

  const payload = parseStudioPayload(req.body, existing);
  const result = await studiosCollection().findOneAndUpdate(
    idFilter(req.params.id) as never,
    { $set: { ...payload, updatedAt: new Date().toISOString() } } as never,
    { returnDocument: "after" },
  );

  const updated = (result as { value?: unknown } | null)?.value ?? result;
  res.json(updated);
});

app.delete("/api/studios/:id", async (req, res) => {
  const user = await requireUser(req);
  const existing = await findStudio(req.params.id);
  if (!existing) throw new HttpError(404, "Studio not found.");
  if (!isOwner(existing, user)) {
    throw new HttpError(403, "You can only delete studios that you own.");
  }

  await studiosCollection().deleteOne(idFilter(req.params.id) as never);
  await bookingsCollection().deleteMany({ studioId: String(existing._id) });
  res.json({ message: "Studio deleted." });
});

app.post("/api/bookings", async (req, res) => {
  const user = await requireUser(req);
  const body = (req.body ?? {}) as Record<string, unknown>;
  const studioId = asString(body.studioId);
  const start = new Date(asString(body.startTime));
  const end = new Date(asString(body.endTime));

  if (!studioId) throw new HttpError(400, "Studio is required.");
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new HttpError(400, "Choose a valid date and time.");
  }
  if (end.getTime() <= start.getTime()) {
    throw new HttpError(400, "The end time must be after the start time.");
  }
  if (start.getTime() < Date.now() - 60_000) {
    throw new HttpError(400, "Choose a start time in the future.");
  }

  const studio = await findStudio(studioId);
  if (!studio) throw new HttpError(404, "Studio not found.");

  const guests = Math.floor(asNumber(body.guests ?? 1));
  if (!Number.isInteger(guests) || guests < 1) {
    throw new HttpError(400, "Guest count must be at least 1.");
  }
  const maxCapacity = Number(studio.maxCapacity);
  if (Number.isFinite(maxCapacity) && guests > maxCapacity) {
    throw new HttpError(400, `This studio holds up to ${maxCapacity} guests.`);
  }

  const hours = roundMoney((end.getTime() - start.getTime()) / 3_600_000);
  if (hours < 0.5) throw new HttpError(400, "Book at least 30 minutes.");
  if (hours > 24) throw new HttpError(400, "Bookings cannot be longer than 24 hours.");

  const conflict = await bookingsCollection().findOne({
    studioId: String(studio._id),
    status: "Confirmed",
    startTime: { $lt: end },
    endTime: { $gt: start },
  } as never);

  if (conflict) {
    throw new HttpError(409, "This time slot is already booked. Pick another time.");
  }

  const booking = {
    studioId: String(studio._id),
    studioTitle: studio.title,
    studioImage: studio.image,
    studioCategory: studio.category,
    studioLocation: studio.location,
    ownerEmail: studio.ownerEmail ?? "",
    userId: user.id,
    userName: user.name,
    userEmail: user.email,
    startTime: start,
    endTime: end,
    hours,
    guests,
    totalPrice: roundMoney(Number(studio.hourlyRate) * hours),
    status: "Pending",
    createdAt: new Date(),
  };

  const result = await bookingsCollection().insertOne(booking as never);
  res.status(201).json({ ...booking, _id: result.insertedId });
});

app.get("/api/bookings", async (req, res) => {
  const user = await requireUser(req);
  const scope = typeof req.query.scope === "string" ? req.query.scope : "guest";

  const ownedStudios = await studiosCollection()
    .find({
      $or: [
        { ownerId: user.id },
        { ownerEmail: { $regex: `^${escapeRegex(user.email)}$`, $options: "i" } },
      ],
    } as never)
    .project({ _id: 1 })
    .toArray();
  const ownedStudioIds = ownedStudios.map((studio) => String(studio._id));

  let filter: Record<string, unknown>;
  if (scope === "host") {
    filter = { studioId: { $in: ownedStudioIds } };
  } else if (scope === "all") {
    filter = {
      $or: [{ userId: user.id }, { studioId: { $in: ownedStudioIds } }],
    };
  } else {
    filter = { userId: user.id };
  }

  const bookings = await bookingsCollection()
    .find(filter as never)
    .sort({ createdAt: -1 })
    .toArray();

  res.json(bookings);
});

app.patch("/api/bookings/:id", async (req, res) => {
  const user = await requireUser(req);
  const booking = await bookingsCollection().findOne(
    idFilter(req.params.id) as never,
  );
  if (!booking) throw new HttpError(404, "Booking not found.");

  const studio = await findStudio(String(booking.studioId));
  const isGuest = booking.userId === user.id;
  const isHost =
    studio !== null
      ? isOwner(studio, user)
      : asString(booking.ownerEmail).toLowerCase() === user.email.toLowerCase();

  if (!isGuest && !isHost) {
    throw new HttpError(403, "You cannot change this booking.");
  }

  const status = asString((req.body as Record<string, unknown>)?.status);
  if (!["Confirmed", "Completed", "Cancelled"].includes(status)) {
    throw new HttpError(400, "Choose a valid booking status.");
  }
  if ((status === "Confirmed" || status === "Completed") && !isHost) {
    throw new HttpError(403, "Only the host can confirm or complete a booking.");
  }
  if (status === "Cancelled" && isGuest && !isHost && booking.status !== "Pending") {
    throw new HttpError(400, "Only pending bookings can be cancelled.");
  }

  const result = await bookingsCollection().findOneAndUpdate(
    idFilter(req.params.id) as never,
    { $set: { status, updatedAt: new Date() } } as never,
    { returnDocument: "after" },
  );

  const updated = (result as { value?: unknown } | null)?.value ?? result;
  res.json(updated);
});

app.use("/api", (_req, res) => {
  res.status(404).json({ message: "API route not found." });
});

app.use((error: unknown, _req: Request, res: Response, _next: unknown) => {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({
    message: "Something went wrong on the server. Please try again.",
  });
});

async function start() {
  const databaseUrl = process.env.MONGODB_URI;
  if (!databaseUrl) throw new Error("MONGODB_URI is not configured");

  await mongoose.connect(databaseUrl);
  console.log("MongoDB connected");

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

start().catch((error) => {
  console.error("Could not start the server:", error);
  process.exit(1);
});
