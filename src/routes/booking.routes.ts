import { Router, type Request, type Response, type NextFunction } from "express";
import Booking from "../models/booking.model.js";
import Studio from "../models/studio.model.js";
import { verifySession } from "../middleware/verifySession.js";
import { HttpError } from "../utils/errorHandler.js";

const router = Router();

const getGuestBookings = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    if (!req.user) {
      throw new HttpError(401, "Please log in to continue.");
    }

    const bookings = await Booking.find({ userId: req.user.id }).sort({
      createdAt: -1,
    });
    res.json(bookings);
  } catch (error) {
    next(error);
  }
};

router.get("/mine", verifySession, getGuestBookings);

router.get(
  "/",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      const scope = req.query.scope;
      if (scope !== "guest" && scope !== "host") {
        throw new HttpError(400, "Choose a valid booking scope.");
      }

      const filter =
        scope === "guest"
          ? { userId: req.user.id }
          : { ownerEmail: req.user.email };
      const bookings = await Booking.find(filter).sort({ createdAt: -1 });

      res.json(bookings);
    } catch (error) {
      next(error);
    }
  },
);

router.post(
  "/",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      const studio = await Studio.findById(req.body.studioId);
      if (!studio) {
        throw new HttpError(404, "Studio not found.");
      }

      const start = new Date(req.body.startTime);
      const end = new Date(req.body.endTime);
      const durationHours = (end.getTime() - start.getTime()) / 3600000;

      if (
        Number.isNaN(start.getTime()) ||
        Number.isNaN(end.getTime()) ||
        durationHours < 0.5 ||
        durationHours > 24
      ) {
        throw new HttpError(400, "Choose a valid booking duration.");
      }

      const guests = Number(req.body.guests ?? 1);
      if (!Number.isInteger(guests) || guests < 1) {
        throw new HttpError(400, "Choose a valid number of guests.");
      }

      const conflict = await Booking.findOne({
        studioId: studio._id.toString(),
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

      if (guests > studio.maxCapacity) {
        throw new HttpError(
          400,
          `This studio holds up to ${studio.maxCapacity} guests.`
        );
      }

      const hours = Math.round(durationHours);
      const totalPrice = Number(studio.hourlyRate) * hours;

      const booking = new Booking({
        studioId: studio._id.toString(),
        studioTitle: studio.title,
        studioImage: studio.image,
        studioCategory: studio.category,
        studioLocation: studio.location,
        ownerEmail: studio.ownerEmail,
        userId: req.user.id,
        userName: req.user.name,
        userEmail: req.user.email,
        startTime: start,
        endTime: end,
        guests,
        hours,
        totalPrice,
        status: "Pending",
      });

      await booking.save();
      res.status(201).json(booking);
    } catch (error) {
      next(error);
    }
  }
);

router.patch(
  "/:id",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      const booking = await Booking.findById(req.params.id);
      if (!booking) {
        throw new HttpError(404, "Booking not found.");
      }

      const status = req.body.status;
      if (
        status !== "Confirmed" &&
        status !== "Completed" &&
        status !== "Cancelled"
      ) {
        throw new HttpError(400, "Choose a valid booking status.");
      }

      const isHost = booking.ownerEmail === req.user.email;
      const isGuest = booking.userId === req.user.id;

      if (isHost) {
        const allowedStatuses =
          booking.status === "Pending"
            ? ["Confirmed", "Cancelled"]
            : booking.status === "Confirmed"
              ? ["Completed", "Cancelled"]
              : [];

        if (!allowedStatuses.includes(status)) {
          throw new HttpError(400, "This booking status cannot be changed.");
        }
      } else if (
        !(isGuest && booking.status === "Pending" && status === "Cancelled")
      ) {
        throw new HttpError(403, "You cannot change this booking status.");
      }

      booking.status = status;
      await booking.save();
      res.json(booking);
    } catch (error) {
      next(error);
    }
  }
);

export default router;