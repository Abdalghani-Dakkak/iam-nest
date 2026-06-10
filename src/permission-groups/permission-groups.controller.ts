import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { PermissionGroupsService } from './permission-groups.service';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';

@Controller('permission-groups')
export class PermissionGroupsController {
  constructor(
    private readonly permissionGroupsService: PermissionGroupsService,
  ) {}

  @Post()
  create(@Body() createDto: CreatePermissionGroupDto) {
    return this.permissionGroupsService.create(createDto);
  }

  @Get()
  findAll(@Query('institutionId') institutionId?: string) {
    return this.permissionGroupsService.findAll(institutionId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionGroupsService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDto: UpdatePermissionGroupDto) {
    return this.permissionGroupsService.update(+id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.permissionGroupsService.remove(+id);
  }
}
