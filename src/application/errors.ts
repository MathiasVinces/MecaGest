export class AppError extends Error {
  constructor(public readonly status: number, public readonly code: string, message: string) { super(message); }
}
export function requireValue<T>(value: T | undefined, label: string): T {
  if (!value) throw new AppError(404, 'NOT_FOUND', `${label} no encontrado`);
  return value;
}
