import { Controller, Get } from '@nestjs/common';
import { Public } from './common/decorators/public.decorator';

type HealthResponse = {
  status: 'ok';
  timestamp: string;
  uptime: number;
};

@Public()
@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
