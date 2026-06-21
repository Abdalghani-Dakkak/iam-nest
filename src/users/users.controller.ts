import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  ParseIntPipe,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { GrantPermissionsDto } from './dto/grant-permissions.dto';
import { Public } from '../auth/public.decorator';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Public()
  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create(createUserDto);
  }

  @Get()
  findAll() {
    return this.usersService.findAll();
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

  // Grant permissions directly to a user (admin action, no request needed).
  @Post(':id/permissions')
  grantPermissions(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: GrantPermissionsDto,
  ) {
    return this.usersService.grantPermissions(id, dto.permissionIds);
  }

  // Revoke a single direct permission from a user.
  @Delete(':id/permissions/:permId')
  revokePermission(
    @Param('id', ParseIntPipe) id: number,
    @Param('permId', ParseIntPipe) permId: number,
  ) {
    return this.usersService.revokePermission(id, permId);
  }
}
