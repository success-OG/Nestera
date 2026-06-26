import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsPositiveAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isPositiveAmount',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          const num = typeof value === 'string' ? parseFloat(value) : Number(value);
          return isFinite(num) && num > 0;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a positive number`;
        },
      },
    });
  };
}

export function IsUSDCAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isUSDCAmount',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          const num = typeof value === 'string' ? parseFloat(value) : Number(value);
          if (!isFinite(num) || num <= 0) return false;
          // USDC uses 7 decimal places on Stellar
          const strVal = String(value);
          const decimalPart = strVal.split('.')[1] || '';
          return decimalPart.length <= 7;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a positive USDC amount with at most 7 decimal places`;
        },
      },
    });
  };
}

export function IsNonNegativeAmount(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isNonNegativeAmount',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          const num = typeof value === 'string' ? parseFloat(value) : Number(value);
          return isFinite(num) && num >= 0;
        },
        defaultMessage(args: ValidationArguments): string {
          return `${args.property} must be a non-negative number`;
        },
      },
    });
  };
}
