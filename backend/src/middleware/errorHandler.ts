import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
  statusCode: number;
  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  console.error(err);

  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ error: err.message });
  }

  // Multer errors (file size, wrong type, etc.) carry name "MulterError"
  if ((err as any)?.name === "MulterError") {
    return res.status(400).json({ error: (err as Error).message });
  }

  const message = err instanceof Error ? err.message : "Internal server error";
  return res.status(500).json({ error: message });
}
