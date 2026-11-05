import { Router, Request, Response, NextFunction } from "express";
import Booking from "../models/booking.model";
import Studio from "../models/studio.model";
import { verifyJwt } from "../middleware/verifyJwt";
import { HttpError } from "../utils/jwt";

const router = Router();

// GET /api/bookings/mine - Get user's bookings
router.get("/mine", verifyJwt, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const bookings = await Booking.find({ userId: (req as any).user?.id })
      .sort({ createdAt: -1 });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
});

// POST /api/bookings - Create new booking (with overlap check - Challenge 2)
router.post(
  "/",
  verifyJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await Studio.findById(req.body.studioId);
      if (!studio) {
        throw new HttpError(404, "Studio not found");
      }

      const start = new Date(req.body.startTime);
      const end = new Date(req.body.endTime);

      // Check for time overlap with Confirmed bookings (Challenge 2)
      const conflict = await Booking.findOne({
        studioId: req.body.studioId,
        status: "Confirmed",
        startTime: { $lt: end },
        endTime: { $gt: start },
      });

      if (conflict) {
        throw new HttpError(
          409,
          "This time slot is already booked. Pick another time."
        );
      }

      // Capacity check
      if (req.body.guests > studio.maxCapacity) {
        throw new HttpError(
          400,
          `This studio holds up to ${studio.maxCapacity} guests.`
        );
      }

      const hours = Math.round((end.getTime() - start.getTime()) / 3600000);
      if (hours < 0.5) {
        throw new HttpError(400, "Book at least 30 minutes");
      }
      if (hours > 24) {
        throw new HttpError(400, "Bookings cannot be longer than 24 hours");
      }

      const totalPrice = Number(studio.hourlyRate) * hours;

      const booking = new Booking({
        ...req.body,
        userId: (req as any).user?.id,
        userName: (req as any).user?.name,
        userEmail: (req as any).user?.email,
        totalPrice,
        status: "Pending",
      });

      await booking.save();
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
);

// PATCH /api/bookings/:id - Update booking status (host only)
router.patch(
  "/:id",
  verifyJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        throw new HttpError(404, "Booking not found");
      }

      const studio = await Studio.findById(booking.studioId);
      if (!studio) {
        throw new HttpError(404, "Studio not found");
      }

      // Check if user is host
      if (studio.ownerEmail !== (req as any).user?.email) {
        throw new HttpError(403, "Only the host can change booking status");
      }

      if (
        req.body.status === "Confirmed" ||
        req.body.status === "Completed"
      ) {
        if (
          (req as any).user?.role !== "host" &&
          (req as any).user?.email !== studio.ownerEmail
        ) {
          throw new HttpError(403, "Only the host can confirm or complete");
        }
      }

      booking.status = req.body.status;
      await booking.save();
      res.json(booking);
    } catch (error) {
      if (error instanceof HttpError) {
        return res.status(error.status).json({ message: error.message });
      }
      next(error);
    }
  }
);

export default router;