import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/errorHandler.js";

export const errorHandler = (
  err: HttpError | Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  console.error(err instanceof Error ? err.stack : err);
  res.status(500).json({ message: "Something went wrong!" });
};