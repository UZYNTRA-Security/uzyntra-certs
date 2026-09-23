export class AppError extends Error {
  constructor(public readonly code: string, message: string, public readonly status = 500) {
    super(message);
    this.name = "AppError";
  }
}

export function toPublicError(error: unknown) {
  if (error instanceof AppError && error.status < 500) {
    return { status: error.status, code: error.code, message: error.message };
  }
  return { status: 500, code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." };
}
