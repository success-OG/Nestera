import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function IsUUID(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUUID',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && UUID_PATTERN.test(value);
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a valid UUID (v1-v5)`;
        },
      },
    });
  };
}
