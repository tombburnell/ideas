import type { NextFunction, Request, Response } from "express";

export const errorHandler = (
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction
): void => {
  const message = error instanceof Error ? error.message : "Unexpected server error";
  response.status(400).json({
    error: message
  });
};
