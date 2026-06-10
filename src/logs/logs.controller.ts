import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { LogsService } from './logs.service';
import { CreateLogDto } from './dto/create-log.dto';
import { QueryLogsDto } from './dto/query-logs.dto';

@Controller('logs')
export class LogsController {
  constructor(private readonly logsService: LogsService) {}

  @Post()
  create(@Body() createLogDto: CreateLogDto) {
    return this.logsService.create(createLogDto);
  }

  @Get()
  findAll(@Query() query: QueryLogsDto) {
    return this.logsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.logsService.findOne(+id);
  }
}
