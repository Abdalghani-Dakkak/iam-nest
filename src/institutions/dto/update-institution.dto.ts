import { PartialType } from '@nestjs/mapped-types';
import { CreateInstitutionDto } from './create-institution.dto';

// Sending `parentId` re-parents the node (level + the whole subtree are
// recomputed); send `null` to move it to the root. Omit it to leave the parent
// unchanged.
export class UpdateInstitutionDto extends PartialType(CreateInstitutionDto) {}
