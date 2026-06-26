import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { IsString, IsNotEmpty } from 'class-validator';
import { Trim } from '../decorators/trim.decorator';

class TestDto {
  @IsString()
  @IsNotEmpty()
  @Trim()
  name: string;
}

describe('Validation Standardization and Sanitization', () => {
  let validationPipe: ValidationPipe;

  beforeEach(() => {
    validationPipe = new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          field: error.property,
          message: Object.values(error.constraints || {}).join(', '),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: result,
        });
      },
    });
  });

  it('should trim string inputs', async () => {
    const input = { name: '  John Doe  ' };
    const result = await validationPipe.transform(input, {
      type: 'body',
      metatype: TestDto,
    });

    expect(result.name).toBe('John Doe');
  });

  it('should return standardized error response on validation failure', async () => {
    const input = { name: '' };
    try {
      await validationPipe.transform(input, {
        type: 'body',
        metatype: TestDto,
      });
      fail('Should have thrown BadRequestException');
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = error.getResponse() as any;
      expect(response.message).toBe('Validation failed');
      expect(response.errors).toBeDefined();
      expect(response.errors).toHaveLength(1);
      expect(response.errors[0].field).toBe('name');
      expect(response.errors[0].message).toContain('name should not be empty');
    }
  });
});
