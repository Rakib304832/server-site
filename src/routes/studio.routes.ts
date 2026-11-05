import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type RequestHandler,
} from "express";
import Studio from "../models/studio.model.js";
import { verifySession } from "../middleware/verifySession.js";
import { HttpError } from "../utils/errorHandler.js";

const router = Router();

const verifySessionForMine: RequestHandler = (req, res, next) => {
  if (req.query.mine !== "true") {
    return next();
  }

  return verifySession(req, res, next);
};

router.get(
  "/",
  verifySessionForMine,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const filter: Record<string, string> = {};
      const category = req.query.category;

      if (typeof category === "string") {
        filter.category = category;
      }

      if (req.query.mine === "true") {
        if (!req.user) {
          throw new HttpError(401, "Please log in to continue.");
        }
        filter.ownerEmail = req.user.email;
      }

      const studios = await Studio.find(filter).sort({ createdAt: -1 });
      res.json(studios);
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/studios/:id - Get single studio
router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const studio = await Studio.findById(req.params.id);
    if (!studio) {
      return res.status(404).json({ message: "Studio not found" });
    }
    res.json(studio);
  } catch (error) {
    next(error);
  }
});

// POST /api/studios - Create new studio (protected)
router.post(
  "/",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      const payload = {
        ...req.body,
        ownerId: req.user.id,
        ownerEmail: req.user.email,
        ownerName: req.user.name,
        ownerPhoto: req.user.image ?? "",
        rating: 0,
        reviewsCount: 0,
      };

      const studio = new Studio(payload);
      await studio.save();
      res.status(201).json(studio);
    } catch (error) {
      next(error);
    }
  }
);

// PATCH /api/studios/:id - Update studio (owner only)
router.patch(
  "/:id",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await Studio.findById(req.params.id);
      if (!studio) {
        return res.status(404).json({ message: "Studio not found" });
      }

      // Check ownership
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      if (studio.ownerEmail !== req.user.email) {
        throw new HttpError(403, "You can only edit studios that you own.");
      }

      const updatedStudio = await Studio.findByIdAndUpdate(
        req.params.id,
        { $set: req.body },
        { new: true, runValidators: true }
      );

      res.json(updatedStudio);
    } catch (error) {
      next(error);
    }
  }
);

// DELETE /api/studios/:id - Delete studio (owner only)
router.delete(
  "/:id",
  verifySession,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await Studio.findById(req.params.id);
      if (!studio) {
        return res.status(404).json({ message: "Studio not found" });
      }

      // Check ownership
      if (!req.user) {
        throw new HttpError(401, "Please log in to continue.");
      }

      if (studio.ownerEmail !== req.user.email) {
        throw new HttpError(403, "You can only delete studios that you own.");
      }

      await Studio.findByIdAndDelete(req.params.id);
      res.json({ message: "Studio deleted" });
    } catch (error) {
      next(error);
    }
  }
);

export default router;