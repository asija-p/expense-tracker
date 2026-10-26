import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../categories/category.entity';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { Expense } from './expense.entity';

@Injectable()
export class ExpensesService {
  constructor(
    @InjectRepository(Expense)
    private readonly expenses: Repository<Expense>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async findAll(userId: number, filters: FilterExpensesDto) {
    if (
      filters.fromDate &&
      filters.toDate &&
      filters.fromDate > filters.toDate
    ) {
      throw new UnprocessableEntityException(
        'fromDate must be on or before toDate',
      );
    }

    const query = this.expenses
      .createQueryBuilder('expense')
      .innerJoin('expense.user', 'user')
      .leftJoinAndSelect('expense.category', 'category')
      .where('user.id = :userId', { userId });

    if (filters.categoryId !== undefined) {
      query.andWhere('category.id = :categoryId', {
        categoryId: filters.categoryId,
      });
    }
    if (filters.fromDate) {
      query.andWhere('expense.expenseDate >= :fromDate', {
        fromDate: filters.fromDate,
      });
    }
    if (filters.toDate) {
      query.andWhere('expense.expenseDate <= :toDate', {
        toDate: filters.toDate,
      });
    }

    const expenses = await query
      .orderBy('expense.expenseDate', 'DESC')
      .addOrderBy('expense.id', 'DESC')
      .getMany();
    return expenses.map((expense) => this.toResponse(expense));
  }

  async create(userId: number, dto: CreateExpenseDto) {
    const category = await this.findCategory(userId, dto.categoryId);
    const expense = this.expenses.create({
      title: dto.title,
      amount: dto.amount,
      description: dto.description ?? null,
      expenseDate: dto.expenseDate,
      user: { id: userId },
      category,
    });
    return this.toResponse(await this.expenses.save(expense));
  }

  async update(userId: number, id: number, dto: UpdateExpenseDto) {
    const expense = await this.findOwned(userId, id);
    if (dto.title !== undefined) {
      expense.title = dto.title;
    }
    if (dto.amount !== undefined) {
      expense.amount = dto.amount;
    }
    if (dto.description !== undefined) {
      expense.description = dto.description;
    }
    if (dto.expenseDate !== undefined) {
      expense.expenseDate = dto.expenseDate;
    }
    if (dto.categoryId !== undefined) {
      expense.category = await this.findCategory(userId, dto.categoryId);
    }

    return this.toResponse(await this.expenses.save(expense));
  }

  async remove(userId: number, id: number) {
    const expense = await this.findOwned(userId, id);
    await this.expenses.remove(expense);
  }

  private async findOwned(userId: number, id: number) {
    const expense = await this.expenses.findOne({
      where: { id, user: { id: userId } },
      relations: { category: true },
    });
    if (!expense) {
      throw new NotFoundException('Expense not found');
    }
    return expense;
  }

  private async findCategory(userId: number, categoryId: number) {
    const category = await this.categories.findOne({
      where: { id: categoryId, user: { id: userId } },
    });
    if (!category) {
      throw new UnprocessableEntityException(
        'Category does not exist or does not belong to you',
      );
    }
    return category;
  }

  private toResponse(expense: Expense) {
    return {
      id: expense.id,
      title: expense.title,
      amount: expense.amount,
      description: expense.description,
      expenseDate: expense.expenseDate,
      category: { id: expense.category.id, name: expense.category.name },
      createdAt: expense.createdAt,
    };
  }
}
