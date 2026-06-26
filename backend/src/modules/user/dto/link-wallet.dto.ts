import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { IsStellarPublicKey } from '../../../common/validators/is-stellar-key.validator';
import { Trim } from '../../../common/decorators/trim.decorator';

export class LinkWalletDto {
  @ApiProperty({ description: 'Stellar public key (G...)' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  @IsStellarPublicKey()
  address: string;

  @ApiProperty({ description: 'Signed message proving wallet ownership' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  signature: string;

  @ApiProperty({ description: 'The message that was signed' })
  @IsString()
  @IsNotEmpty()
  @Trim()
  message: string;
}
