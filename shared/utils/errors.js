// Errors whose message is intentionally safe to show to the public.
// Anything else thrown by a handler is treated as internal and never echoed.
export class ClientError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "ClientError";
    this.status = status;
  }
}

export function isClientError(error) {
  return error instanceof ClientError;
}
