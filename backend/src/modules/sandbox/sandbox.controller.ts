import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { SandboxService } from './sandbox.service';
import { TestDataGeneratorService } from './test-data-generator.service';
import { SandboxApiKey } from './entities/sandbox-api-key.entity';
import { SandboxUsageAnalytics } from './entities/sandbox-usage-analytics.entity';

@ApiTags('sandbox')
@Controller('sandbox')
export class SandboxController {
  constructor(
    private readonly sandboxService: SandboxService,
    private readonly testDataGeneratorService: TestDataGeneratorService,
  ) {}

  @Post('api-keys')
  @ApiOperation({ summary: 'Create a new sandbox API key' })
  @ApiResponse({
    status: 201,
    description: 'API key created successfully',
    type: SandboxApiKey,
  })
  async createApiKey(
    @Body('name') name: string,
    @Body('userId') userId?: string,
  ): Promise<SandboxApiKey> {
    return this.sandboxService.createApiKey(name, userId);
  }

  @Get('api-keys')
  @ApiOperation({ summary: 'Get all sandbox API keys' })
  @ApiResponse({
    status: 200,
    description: 'List of API keys',
    type: [SandboxApiKey],
  })
  async getApiKeys(): Promise<SandboxApiKey[]> {
    return this.sandboxService.getApiKeys();
  }

  @Post('test-data')
  @ApiOperation({ summary: 'Generate test data for sandbox' })
  @ApiResponse({
    status: 201,
    description: 'Test data generated successfully',
  })
  async generateTestData() {
    return this.testDataGeneratorService.generateTestData();
  }

  @Post('reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset all sandbox data' })
  @ApiResponse({
    status: 200,
    description: 'Sandbox data reset successfully',
  })
  async resetData() {
    await this.sandboxService.resetSandboxData();
    return { message: 'Sandbox data reset successfully' };
  }

  @Get('usage-analytics')
  @ApiOperation({ summary: 'Get sandbox usage analytics' })
  @ApiResponse({
    status: 200,
    description: 'Usage analytics data',
    type: [SandboxUsageAnalytics],
  })
  async getUsageAnalytics(): Promise<SandboxUsageAnalytics[]> {
    return this.sandboxService.getUsageAnalytics();
  }
}
