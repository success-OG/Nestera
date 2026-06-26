import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhookService: WebhookService) {}

  // ── Registration ────────────────────────────────────────────────────────

  @Post()
  @ApiOperation({ summary: 'Register a new webhook subscription' })
  @ApiCreatedResponse({ description: 'Webhook created' })
  async create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateWebhookDto,
  ) {
    return this.webhookService.register(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all webhook subscriptions for the current user' })
  @ApiOkResponse({ description: 'List of webhook subscriptions' })
  async findAll(@CurrentUser('id') userId: string) {
    return this.webhookService.list(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific webhook subscription' })
  @ApiOkResponse({ description: 'Webhook subscription details' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a webhook subscription' })
  @ApiOkResponse({ description: 'Updated webhook subscription' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateWebhookDto,
  ) {
    return this.webhookService.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a webhook subscription' })
  @ApiNoContentResponse({ description: 'Webhook deleted' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.remove(id, userId);
  }

  @Patch(':id/disable')
  @ApiOperation({ summary: 'Disable a webhook subscription' })
  @ApiOkResponse({ description: 'Webhook disabled' })
  async disable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.disable(id, userId);
  }

  @Patch(':id/enable')
  @ApiOperation({ summary: 'Re-enable a disabled webhook subscription' })
  @ApiOkResponse({ description: 'Webhook enabled' })
  async enable(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.enable(id, userId);
  }

  // ── Delivery Logs ────────────────────────────────────────────────────────

  @Get(':id/deliveries')
  @ApiOperation({ summary: 'Get delivery log for a webhook subscription' })
  @ApiOkResponse({ description: 'List of delivery attempts' })
  async getLogs(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.getLogs(id, userId);
  }

  // ── Testing ──────────────────────────────────────────────────────────────

  @Post(':id/test')
  @ApiOperation({ summary: 'Send a test event to the webhook endpoint' })
  @ApiCreatedResponse({ description: 'Test delivery result' })
  async test(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.webhookService.test(id, userId);
  }
}
