import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  Headers,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { AdminDisputesService } from './admin-disputes.service';
import {
  DisputeFilterDto,
  AssignDisputeDto,
  ResolveDisputeDto,
  EscalateDisputeDto,
  AddEvidenceDto,
  UpdateDisputeDto,
} from './dto/admin-dispute.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { Dispute, DisputeTimeline } from '../disputes/entities/dispute.entity';

@ApiTags('admin/disputes')
@Controller('admin/disputes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth()
export class AdminDisputesController {
  constructor(private readonly adminDisputesService: AdminDisputesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all disputes with filters' })
  @ApiResponse({
    status: 200,
    description: 'List of disputes',
    schema: {
      properties: {
        disputes: {
          type: 'array',
          items: { $ref: '#/components/schemas/Dispute' },
        },
        total: { type: 'number' },
      },
    },
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: [
      'OPEN',
      'IN_PROGRESS',
      'UNDER_REVIEW',
      'RESOLVED',
      'CLOSED',
      'ESCALATED',
    ],
  })
  @ApiQuery({
    name: 'priority',
    required: false,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
  })
  @ApiQuery({ name: 'assignedTo', required: false, type: String })
  @ApiQuery({ name: 'fromDate', required: false, type: String })
  @ApiQuery({ name: 'toDate', required: false, type: String })
  async getAllDisputes(@Query() filters: DisputeFilterDto) {
    return await this.adminDisputesService.findAll(filters);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get dispute statistics' })
  @ApiResponse({
    status: 200,
    description: 'Dispute statistics',
  })
  async getStats() {
    return await this.adminDisputesService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get dispute by ID' })
  @ApiResponse({ status: 200, description: 'Dispute details', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDispute(@Param('id') id: string) {
    return await this.adminDisputesService.findOne(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get dispute timeline/history' })
  @ApiResponse({
    status: 200,
    description: 'Dispute timeline',
    type: [DisputeTimeline],
  })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async getDisputeTimeline(@Param('id') id: string) {
    return await this.adminDisputesService.getTimeline(id);
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign dispute to admin' })
  @ApiResponse({ status: 200, description: 'Dispute assigned', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async assignDispute(
    @Param('id') id: string,
    @Body() dto: AssignDisputeDto,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ipAddress = forwardedFor || req?.ip;
    return await this.adminDisputesService.assignDispute(
      id,
      dto,
      req.user?.id || 'admin',
      ipAddress,
    );
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a dispute' })
  @ApiResponse({ status: 200, description: 'Dispute resolved', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async resolveDispute(
    @Param('id') id: string,
    @Body() dto: ResolveDisputeDto,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ipAddress = forwardedFor || req?.ip;
    return await this.adminDisputesService.resolveDispute(
      id,
      dto,
      req.user?.id || 'admin',
      ipAddress,
    );
  }

  @Post(':id/escalate')
  @ApiOperation({ summary: 'Escalate dispute to senior admin' })
  @ApiResponse({ status: 200, description: 'Dispute escalated', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async escalateDispute(
    @Param('id') id: string,
    @Body() dto: EscalateDisputeDto,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ipAddress = forwardedFor || req?.ip;
    return await this.adminDisputesService.escalateDispute(
      id,
      dto,
      req.user?.id || 'admin',
      ipAddress,
    );
  }

  @Post(':id/evidence')
  @ApiOperation({ summary: 'Add evidence/document to dispute' })
  @ApiResponse({ status: 200, description: 'Evidence added', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async addEvidence(
    @Param('id') id: string,
    @Body() dto: AddEvidenceDto,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ipAddress = forwardedFor || req?.ip;
    return await this.adminDisputesService.addEvidence(
      id,
      dto,
      req.user?.id || 'admin',
      ipAddress,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update dispute status/priority' })
  @ApiResponse({ status: 200, description: 'Dispute updated', type: Dispute })
  @ApiResponse({ status: 404, description: 'Dispute not found' })
  async updateDispute(
    @Param('id') id: string,
    @Body() dto: UpdateDisputeDto,
    @Req() req: any,
    @Headers('x-forwarded-for') forwardedFor?: string,
  ) {
    const ipAddress = forwardedFor || req?.ip;
    return await this.adminDisputesService.updateDispute(
      id,
      dto,
      req.user?.id || 'admin',
      ipAddress,
    );
  }
}
