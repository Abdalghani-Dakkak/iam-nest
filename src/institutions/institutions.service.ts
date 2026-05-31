import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { Institution } from './entities/institution.entity';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';

@Injectable()
export class InstitutionsService {
  constructor(
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
  ) {}

  async create(
    createInstitutionDto: CreateInstitutionDto,
  ): Promise<Institution> {
    const { parentId, ...data } = createInstitutionDto;
    const parent = await this.resolveParent(parentId);
    // No parentId => creating a root. Only one root is allowed in the tree.
    if (!parent) {
      await this.assertNoExistingRoot();
    }
    const institution = this.institutionsRepository.create(data);
    institution.parent = parent;
    institution.level = parent ? parent.level + 1 : 1;
    // A node can't be active under an inactive parent — inherit the disabled
    // state so the "inactive subtree" invariant holds for new children too.
    if (parent && !parent.isActive) {
      institution.isActive = false;
    }
    const saved = await this.institutionsRepository.save(institution);
    return this.findOne(saved.id);
  }

  // Flat list — every node carries `parentId` (via @RelationId) and `level`, so a
  // client can rebuild the hierarchy without per-row relation joins.
  findAll(): Promise<Institution[]> {
    return this.institutionsRepository.find({
      order: { level: 'ASC', id: 'ASC' },
    });
  }

  // Nested forest: roots, each with a recursively populated `children` array.
  // Built in memory from a single query rather than N recursive ones.
  async findTree(): Promise<Institution[]> {
    const all = await this.institutionsRepository.find({
      order: { level: 'ASC', id: 'ASC' },
    });
    const byId = new Map<number, Institution>();
    for (const node of all) {
      node.children = [];
      byId.set(node.id, node);
    }
    const roots: Institution[] = [];
    for (const node of all) {
      const parent =
        node.parentId != null ? byId.get(node.parentId) : undefined;
      if (parent) {
        parent.children.push(node);
      } else {
        roots.push(node);
      }
    }
    return roots;
  }

  async findOne(id: number): Promise<Institution> {
    const institution = await this.institutionsRepository.findOne({
      where: { id },
      relations: { parent: true, children: true },
    });
    if (!institution) {
      throw new NotFoundException(`Institution #${id} not found`);
    }
    return institution;
  }

  async update(
    id: number,
    updateInstitutionDto: UpdateInstitutionDto,
  ): Promise<Institution> {
    const { parentId, ...data } = updateInstitutionDto;
    const institution = await this.findOne(id);
    Object.assign(institution, data);

    // `parentId === undefined` => caller didn't touch the parent; `null` => move
    // to root. Either way, re-parenting shifts this node's depth, so the whole
    // subtree's levels are recomputed afterwards.
    const reparenting = parentId !== undefined;
    if (reparenting) {
      const parent = await this.resolveParent(parentId);
      if (parent) {
        if (parent.id === institution.id) {
          throw new BadRequestException(
            'An institution cannot be its own parent',
          );
        }
        await this.assertNotInSubtree(institution.id, parent.id);
      } else {
        // Moving to root: reject if a different institution is already the root.
        await this.assertNoExistingRoot(institution.id);
      }
      institution.parent = parent;
      institution.level = parent ? parent.level + 1 : 1;
    }

    await this.institutionsRepository.save(institution);
    if (reparenting) {
      await this.recomputeChildrenLevels(institution);
    }
    // Activating/deactivating a node cascades the same flag to its whole
    // subtree (only when isActive is actually part of the update).
    if (data.isActive !== undefined) {
      await this.cascadeActive(institution, data.isActive);
    }
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const institution = await this.findOne(id);
    if (institution.children.length > 0) {
      throw new ConflictException(
        `Institution #${id} has child institutions; move or delete them first`,
      );
    }
    await this.institutionsRepository.remove(institution);
    return { deleted: true, id };
  }

  // Enforces the single-root invariant: at most one institution may have no
  // parent. `excludeId` lets an existing root stay root on update without
  // conflicting with itself.
  private async assertNoExistingRoot(excludeId?: number): Promise<void> {
    const existingRoot = await this.institutionsRepository.findOne({
      where: { parent: IsNull() },
    });
    if (existingRoot && existingRoot.id !== excludeId) {
      throw new ConflictException(
        `A root institution already exists (#${existingRoot.id} "${existingRoot.name}"); only one root is allowed`,
      );
    }
  }

  private async resolveParent(
    parentId: number | null | undefined,
  ): Promise<Institution | null> {
    if (parentId == null) {
      return null;
    }
    const parent = await this.institutionsRepository.findOne({
      where: { id: parentId },
    });
    if (!parent) {
      throw new NotFoundException(`Parent institution #${parentId} not found`);
    }
    return parent;
  }

  // Guards against cycles: walking up from the prospective parent must never
  // reach the node being moved (that would make the node its own ancestor).
  private async assertNotInSubtree(
    nodeId: number,
    newParentId: number,
  ): Promise<void> {
    let cursorId: number | null = newParentId;
    while (cursorId != null) {
      if (cursorId === nodeId) {
        throw new BadRequestException(
          `Cannot move institution #${nodeId} under its own descendant`,
        );
      }
      const current = await this.institutionsRepository.findOne({
        where: { id: cursorId },
        relations: { parent: true },
      });
      cursorId = current?.parent ? current.parent.id : null;
    }
  }

  private async recomputeChildrenLevels(node: Institution): Promise<void> {
    const children = await this.institutionsRepository.find({
      where: { parent: { id: node.id } },
    });
    for (const child of children) {
      child.level = node.level + 1;
      await this.institutionsRepository.save(child);
      await this.recomputeChildrenLevels(child);
    }
  }

  // Propagates an isActive value down the whole subtree of `node`.
  private async cascadeActive(
    node: Institution,
    isActive: boolean,
  ): Promise<void> {
    const children = await this.institutionsRepository.find({
      where: { parent: { id: node.id } },
    });
    for (const child of children) {
      child.isActive = isActive;
      await this.institutionsRepository.save(child);
      await this.cascadeActive(child, isActive);
    }
  }
}
