import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CircuitBreakerService } from '../../common/circuit-breaker/circuit-breaker.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '../../common/enums/role.enum';

@Controller('api/admin/circuit-breaker')
@ApiTags('Admin - Circuit Breaker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class CircuitBreakerController {
  constructor(private circuitBreakerService: CircuitBreakerService) {}

  @Get('metrics')
  @ApiOperation({
    summary: 'Get all circuit breaker metrics',
    description: 'Retrieve metrics for all RPC circuit breakers',
  })
  getMetrics() {
    return this.circuitBreakerService.getMetrics();
  }

  @Get('metrics/:name')
  @ApiOperation({
    summary: 'Get circuit breaker metrics by name',
    description: 'Retrieve metrics for a specific circuit breaker',
  })
  getMetricsByName(@Param('name') name: string) {
    return this.circuitBreakerService.getMetrics(name);
  }

  @Get('breakers')
  @ApiOperation({
    summary: 'List all circuit breakers',
    description: 'Get list of all registered circuit breakers',
  })
  getAllBreakers() {
    return {
      breakers: this.circuitBreakerService.getAllBreakers(),
    };
  }

  @Post(':name/open')
  @ApiOperation({
    summary: 'Manually open a circuit breaker',
    description: 'Manually trip a circuit breaker to prevent requests',
  })
  openBreaker(@Param('name') name: string) {
    this.circuitBreakerService.manualOpen(name);
    return { message: `Circuit breaker ${name} manually opened` };
  }

  @Post(':name/close')
  @ApiOperation({
    summary: 'Manually close a circuit breaker',
    description: 'Manually reset a circuit breaker to allow requests',
  })
  closeBreaker(@Param('name') name: string) {
    this.circuitBreakerService.manualClose(name);
    return { message: `Circuit breaker ${name} manually closed` };
  }
}
