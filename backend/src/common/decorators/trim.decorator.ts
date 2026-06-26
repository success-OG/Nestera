import { Transform, TransformFnParams } from 'class-transformer';

/**
 * Decorator to trim strings in DTOs.
 * Uses class-transformer's Transform decorator.
 */
export function Trim() {
  return Transform(({ value }: TransformFnParams) => {
    if (typeof value === 'string') {
      return value.trim();
    }
    return value;
  });
}
