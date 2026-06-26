import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WalletService } from './wallet.service';
import { LinkWalletDto } from './dto/link-wallet.dto';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users/wallets')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('link')
  @ApiOperation({
    summary: 'Link a new Stellar wallet with signature verification',
  })
  @ApiResponse({ status: 201, description: 'Wallet linked successfully' })
  @ApiResponse({ status: 409, description: 'Wallet already linked' })
  linkWallet(@CurrentUser() user: { id: string }, @Body() dto: LinkWalletDto) {
    return this.walletService.linkWallet(user.id, dto);
  }

  @Delete(':address/unlink')
  @ApiOperation({ summary: 'Unlink a wallet address' })
  @ApiResponse({ status: 200, description: 'Wallet unlinked' })
  async unlinkWallet(
    @CurrentUser() user: { id: string },
    @Param('address') address: string,
  ) {
    await this.walletService.unlinkWallet(user.id, address);
    return { message: 'Wallet unlinked successfully' };
  }

  @Get()
  @ApiOperation({ summary: 'List all linked wallets' })
  listWallets(@CurrentUser() user: { id: string }) {
    return this.walletService.listWallets(user.id);
  }

  @Patch(':address/set-primary')
  @ApiOperation({ summary: 'Set a wallet as primary' })
  setPrimary(
    @CurrentUser() user: { id: string },
    @Param('address') address: string,
  ) {
    return this.walletService.setPrimary(user.id, address);
  }
}
