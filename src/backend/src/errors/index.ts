export class ValidationError extends Error {
  readonly statusCode = 400;
  readonly errorName = 'Bad Request';

  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  readonly statusCode = 404;
  readonly errorName = 'Not Found';

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends Error {
  readonly statusCode = 409;
  readonly errorName = 'Conflict';

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

export class InternalError extends Error {
  readonly statusCode = 500;
  readonly errorName = 'Internal Server Error';

  constructor(message: string) {
    super(message);
    this.name = 'InternalError';
  }
}

// Para operaciones semánticamente inválidas (ej: lectura en monitoreo pausado)
export class UnprocessableEntityError extends Error {
  readonly statusCode = 422;
  readonly errorName = 'Unprocessable Entity';

  constructor(message: string) {
    super(message);
    this.name = 'UnprocessableEntityError';
  }
}

export function isAppError(
  error: unknown
): error is
  | ValidationError
  | NotFoundError
  | ConflictError
  | InternalError
  | UnprocessableEntityError {
  return (
    error instanceof ValidationError ||
    error instanceof NotFoundError ||
    error instanceof ConflictError ||
    error instanceof InternalError ||
    error instanceof UnprocessableEntityError
  );
}
