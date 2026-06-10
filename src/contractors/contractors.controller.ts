import { Controller, Get, Post, Patch, Body, Param } from '@nestjs/common';
import { ContractorsService } from './contractors.service';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { EndContractDto } from './dto/end-contract.dto';
import { ExtendContractDto } from './dto/extend-contract.dto';

@Controller('contractors')
export class ContractorsController {
  constructor(private readonly contractorsService: ContractorsService) {}

  @Post()
  create(@Body() createDto: CreateContractorDto) {
    return this.contractorsService.create(createDto);
  }

  @Get()
  findAll() {
    return this.contractorsService.findAll();
  }

  @Patch(':id/end')
  endContract(@Param('id') id: string, @Body() dto: EndContractDto) {
    return this.contractorsService.endContract(+id, dto);
  }

  @Patch(':id/extend')
  extendContract(@Param('id') id: string, @Body() dto: ExtendContractDto) {
    return this.contractorsService.extendContract(+id, dto);
  }

  @Patch(':id/toggle-active')
  toggleActive(@Param('id') id: string) {
    return this.contractorsService.toggleActive(+id);
  }
}
