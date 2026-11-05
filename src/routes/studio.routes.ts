import { Router, type Request, type Response, type NextFunction } from "express";
import Studio from "../models/studio.model";
import { verifyJwt } from "../middleware/verifyJwt";
import { HttpError } from "../utils/errorHandler";

const router = Router();

// GET /api/studios - List studios with optional category filter
router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const category = req.query.category as string | undefined;
    const filter: any = {};

    if (category) {
      filter.category = category;
    }

    const studios = await Studio.find(filter)
      .sort({ createdAt: -1 })
      .limit(6);

    res.json(studios);
  } catch (error) {
    next(error);
  }
});

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
  verifyJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const payload = {
        ...req.body,
        ownerId: (req as any).user?.id,
        ownerEmail: (req as any).user?.email,
        ownerName: (req as any).user?.name,
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
  verifyJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await Studio.findById(req.params.id);
      if (!studio) {
        return res.status(404).json({ message: "Studio not found" });
      }

      // Check ownership
      if (studio.ownerEmail !== (req as any).user?.email) {
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
  verifyJwt,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const studio = await Studio.findById(req.params.id);
      if (!studio) {
        return res.status(404).json({ message: "Studio not found" });
      }

      // Check ownership
      if (studio.ownerEmail !== (req as any).user?.email) {
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