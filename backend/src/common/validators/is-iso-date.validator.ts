import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsISODate(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isISODate',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'string') return false;
          const date = new Date(value);
          return !isNaN(date.getTime()) && value === date.toISOString().split('T')[0] ||
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid ISO 8601 date string (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)`;
        },
      },
    });
  };
}

export function IsDateRange(
  startField: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isDateRange',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      constraints: [startField],
      validator: {
        validate(value: unknown, args: ValidationArguments): boolean {
          const startValue = (args.object as Record<string, unknown>)[args.constraints[0]];
          if (!value || !startValue) return true;
          return new Date(value as string) >= new Date(startValue as string);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be after or equal to ${args.constraints[0]}`;
        },
      },
    });
  };
}
