import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiQuery,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FilterExpensesDto } from './dto/filter-expenses.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { ExpensesService } from './expenses.service';

@ApiTags('Expenses')
@Controller('expenses')
@UseGuards(SessionAuthGuard)
@ApiUnauthorizedResponse({ description: 'Log in to manage your expenses' })
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  @Get()
  @ApiQuery({ type: FilterExpensesDto })
  @ApiOkResponse({ description: 'Your expenses' })
  findAll(
    @Query() filters: FilterExpensesDto,
    @Req() request: Request,
  ) {
    return this.expensesService.findAll(request.session.userId!, filters);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Expense created' })
  create(@Body() dto: CreateExpenseDto, @Req() request: Request) {
    return this.expensesService.create(request.session.userId!, dto);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Expense updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateExpenseDto,
    @Req() request: Request,
  ) {
    return this.expensesService.update(request.session.userId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Expense deleted' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.expensesService.remove(request.session.userId!, id);
  }
}
