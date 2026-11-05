import type { RequestHandler } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { HttpError } from "../utils/errorHandler.js";

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

export const verifySession: RequestHandler = async (req, _res, next) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return next(new HttpError(401, "Please log in to continue."));
    }

    req.user = {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
      image: session.user.image ?? undefined,
    };

    return next();
  } catch (error) {
    return next(error);
  }
};
