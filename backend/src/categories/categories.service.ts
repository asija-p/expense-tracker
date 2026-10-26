import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Category } from './category.entity';
import { UpdateCategoryDto } from './dto/update-category.dto';

function isUniqueConstraintViolation(error: unknown): boolean {
  if (!(error instanceof QueryFailedError)) {
    return false;
  }

  const driverError: unknown = error.driverError;
  return (
    typeof driverError === 'object' &&
    driverError !== null &&
    'code' in driverError &&
    driverError.code === '23505'
  );
}

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async findAll(userId: number) {
    const categories = await this.categories.find({
      where: { user: { id: userId } },
      order: { name: 'ASC' },
    });
    return categories.map(({ id, name }) => ({ id, name }));
  }

  async create(userId: number, name: string) {
    try {
      const category = await this.categories.save(
        this.categories.create({ name, user: { id: userId } }),
      );
      return { id: category.id, name: category.name };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('You already have a category with this name');
      }
      throw error;
    }
  }

  async update(userId: number, id: number, dto: UpdateCategoryDto) {
    const category = await this.findOwned(userId, id);
    if (dto.name !== undefined) {
      category.name = dto.name;
    }

    try {
      const updated = await this.categories.save(category);
      return { id: updated.id, name: updated.name };
    } catch (error) {
      if (isUniqueConstraintViolation(error)) {
        throw new ConflictException('You already have a category with this name');
      }
      throw error;
    }
  }

  async remove(userId: number, id: number) {
    const category = await this.findOwned(userId, id);
    try {
      await this.categories.remove(category);
    } catch (error) {
      if (this.isForeignKeyViolation(error)) {
        throw new ConflictException(
          'Cannot delete a category that is used by an expense',
        );
      }
      throw error;
    }
  }

  private async findOwned(userId: number, id: number) {
    const category = await this.categories.findOne({
      where: { id, user: { id: userId } },
    });
    if (!category) {
      throw new NotFoundException('Category not found');
    }
    return category;
  }

  private isForeignKeyViolation(error: unknown): boolean {
    if (!(error instanceof QueryFailedError)) {
      return false;
    }

    const driverError: unknown = error.driverError;
    return (
      typeof driverError === 'object' &&
      driverError !== null &&
      'code' in driverError &&
      driverError.code === '23503'
    );
  }
}
