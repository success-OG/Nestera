import { Controller, Get, UseGuards, VERSION_NEUTRAL } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../decorators/roles.decorator';
import { RolesGuard } from '../guards/roles.guard';
import { Role } from '../enums/role.enum';
import { VersionAnalyticsService } from './version-analytics.service';
import {
  SUPPORTED_VERSIONS,
  CURRENT_VERSION,
  DEPRECATED_VERSIONS,
} from './versioning.middleware';

@ApiTags('versioning')
@Controller({ path: 'versioning', version: VERSION_NEUTRAL })
export class VersioningController {
  constructor(private readonly versionAnalytics: VersionAnalyticsService) {}

  @Get('info')
  @ApiOperation({
    summary: 'Get API version information and sunset policy',
    description:
      'Returns the current version, all supported versions, deprecated versions with sunset dates, ' +
      'and a link to the migration guide.',
  })
  @ApiResponse({
    status: 200,
    description: 'Version information',
    schema: {
      example: {
        current: '2',
        supported: ['1', '2'],
        deprecated: [
          {
            version: '1',
            sunset: '2026-09-01',
            message: 'API v1 is deprecated. Please migrate to v2.',
          },
        ],
        migrationGuide: '/api/v2/docs',
      },
    },
  })
  getVersionInfo() {
    return {
      current: CURRENT_VERSION,
      supported: SUPPORTED_VERSIONS,
      deprecated: Object.entries(DEPRECATED_VERSIONS).map(([v, info]) => ({
        version: v,
        ...info,
      })),
      migrationGuide: `/api/v${CURRENT_VERSION}/docs`,
    };
  }

  @Get('deprecation-policy')
  @ApiOperation({
    summary: 'Get deprecation policy and migration guidance',
    description:
      'Returns the deprecation timeline, sunset policy, and version-specific migration steps.',
  })
  @ApiResponse({ status: 200, description: 'Deprecation policy details' })
  getDeprecationPolicy() {
    return {
      policy: {
        minimumSupportWindow: '6 months',
        sunsetNotice: '3 months before removal',
        headerIndicators: [
          'Deprecation: true — version is deprecated',
          'Sunset: <date> — date when the version will be removed',
          'X-Deprecation-Notice: <message> — human-readable migration guidance',
          'Link: <url>; rel="successor-version" — URL of the successor version docs',
        ],
        headerNegotiation: [
          'Accept-Version: <version> — request a specific API version via header',
          'X-API-Version: <version> — alternative version header',
        ],
      },
      versions: Object.fromEntries(
        [...SUPPORTED_VERSIONS].map((v) => {
          const deprecation = DEPRECATED_VERSIONS[v];
          return [
            `v${v}`,
            {
              status: deprecation ? 'deprecated' : 'current',
              ...(deprecation && { sunset: deprecation.sunset }),
              docs: `/api/v${v}/docs`,
            },
          ];
        }),
      ),
    };
  }

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get version usage analytics (admin only)',
    description: 'Returns per-version request counts and last-seen timestamps.',
  })
  @ApiResponse({ status: 200, description: 'Version usage statistics' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Admin role required' })
  getStats(): Record<string, { count: number; lastSeen: Date }> {
    return this.versionAnalytics.getStats();
  }
}
