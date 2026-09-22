import { Controller, Get } from '@nestjs/common';

type HealthResponse = {
  status: 'ok';
  timestamp: string;
  uptime: number;
};

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
