import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  Delete,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantPermissionsDto } from './dto/grant-permissions.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { Public } from '../auth/public.decorator';
import type { JwtPayload } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll(
    @Query() query: QueryUsersDto,
    @Req() req: Request & { user: JwtPayload },
  ) {
    return this.usersService.findAll(query, req.user.systemId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(+id, updateUserDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }

  @Get(':id/permissions')
  getUserPermissions(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.getUserPermissions(id);
  }

  @Post(':id/permissions')
  grantPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GrantPermissionsDto,
  ) {
    return this.usersService.grantPermissions(id, dto.permissionIds);
  }

  @Delete(':id/permissions/:permId')
  revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permId', ParseIntPipe) permId: number,
  ) {
    return this.usersService.revokePermission(id, permId);
  }
}
