import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
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
    const authHeader = req.headers.authorization;
    const cookieToken = req.cookies?.["connect.sid"];
    const token =
      (authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined) ??
      cookieToken;

    if (!token) {
      throw new HttpError(401, "Please log in to continue.");
    }

    const payload = jwt.verify(token, process.env.JWT_SECRET as string) as {
      id: string;
      name: string;
      email: string;
      image?: string;
    };

    req.user = {
      id: payload.id,
      name: payload.name,
      email: payload.email,
      image: payload.image,
    };

    next();
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      "name" in error &&
      error.name === "TokenExpiredError"
    ) {
      throw new HttpError(401, "Session expired. Please log in again.");
    }

    throw new HttpError(401, "Invalid session token.");
  }
};