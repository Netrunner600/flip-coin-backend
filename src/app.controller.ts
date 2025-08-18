import { Controller, Get, Req } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('auth/csrf-token')
  getCsrfToken(@Req() req) {
    return { csrfToken: req.csrfToken() };
  }
}
