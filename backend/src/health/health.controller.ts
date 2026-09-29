import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import {
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DataSource } from 'typeorm';
import { Public } from '../auth/decorators';
import { ErrorResponseDto } from '../common/dto/error-response.dto';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  /** Liveness + database connectivity; used by the Docker healthcheck. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'Health check (API and database)' })
  @ApiOkResponse({ schema: { example: { status: 'ok' } } })
  @ApiServiceUnavailableResponse({ type: ErrorResponseDto })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
      return { status: 'ok' };
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }
  }
}
