import { Controller, Get, Post, Body, Param, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  create(@Body() createLogDto: CreateLogDto) {
    return this.logsService.create(createLogDto);
  }

  @Get()
  findAll(
    @Query() query: QueryLogsDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.logsService.findAll(query, req.user.systemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: Request & { user: JwtPayload }) {
    return this.logsService.findOne(+id, req.user.systemId);
  }
}
