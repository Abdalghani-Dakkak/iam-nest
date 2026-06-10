import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { PermissionRequestsService } from './permission-requests.service';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';
import { ReviewPermissionRequestDto } from './dto/review-permission-request.dto';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('permission-requests')
export class PermissionRequestsController {
  constructor(
    private readonly permissionRequestsService: PermissionRequestsService,
  ) {}

  @Post()
  create(
    @Req() req: Request & { user: JwtPayload },
    @Body() dto: CreatePermissionRequestDto,
  ) {
    return this.permissionRequestsService.create(req.user.sub, dto);
  }

  @Get('mine')
  findMine(@Req() req: Request & { user: JwtPayload }) {
    return this.permissionRequestsService.findMine(req.user.sub);
  }

  @Get()
  findAll(@Query('type') type?: string) {
    return this.permissionRequestsService.findAll(type);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionRequestsService.findOne(+id);
  }

  @Patch(':id/review')
  review(
    @Req() req: Request & { user: JwtPayload },
    @Param('id') id: string,
    @Body() dto: ReviewPermissionRequestDto,
  ) {
    return this.permissionRequestsService.review(req.user.sub, +id, dto);
  }
}
