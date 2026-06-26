import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsUrl,
  IsArray,
  ArrayNotEmpty,
  IsString,
  IsOptional,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'The HTTPS URL to deliver events to',
    example: 'https://example.com/webhooks',
  })
  @IsUrl({ require_tld: false })
  url: string;

  @ApiProperty({
    description:
      'Event patterns to subscribe to. Supports exact names and wildcards (e.g. "savings.*", "*")',
    example: ['savings.deposit', 'savings.withdrawal', 'goal.completed'],
    type: [String],
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({ each: true })
  events: string[];

  @ApiPropertyOptional({
    description:
      'Optional HMAC-SHA256 secret for signature verification. Auto-generated if omitted.',
    example: 'my-secret-key',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(256)
  secret?: string;

  @ApiPropertyOptional({
    description: 'Human-readable description of this webhook',
    example: 'Production deposit notifications',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
