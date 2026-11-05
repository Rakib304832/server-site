import { Request, Response, NextFunction } from "express";
import { verify } from "jsonwebtoken";
import { HttpError } from "../utils/errorHandler";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        name: string;
        email: string;
        image?: string;
      };
    }
  }
}

export const verifyJwt = (req: Request, res: Response, next: NextFunction) => {
  try {
    const cookie = req.cookies["connect.sid"];
    if (!cookie) {
      throw new HttpError(401, "Please log in to continue.");
    }

    // Better Auth stores session in cookie, verify it
    const payload = verify(
      cookie,
      process.env.JWT_SECRET as string
    ) as { id: string; name: string; email: string; image?: string };

    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      image: payload.image,
    };

    next();
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      throw new HttpError(401, "Session expired. Please log in again.");
    }
    throw new HttpError(401, "Invalid session token.");
  }
};