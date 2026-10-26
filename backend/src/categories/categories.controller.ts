import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
  Patch,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { SessionAuthGuard } from '../auth/session-auth.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@ApiTags('Categories')
@Controller('categories')
@UseGuards(SessionAuthGuard)
@ApiUnauthorizedResponse({ description: 'Log in to manage your categories' })
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  @ApiOkResponse({ description: 'Your categories' })
  findAll(@Req() request: Request) {
    return this.categoriesService.findAll(request.session.userId!);
  }

  @Post()
  @ApiCreatedResponse({ description: 'Category created' })
  create(@Body() dto: CreateCategoryDto, @Req() request: Request) {
    return this.categoriesService.create(request.session.userId!, dto.name);
  }

  @Patch(':id')
  @ApiOkResponse({ description: 'Category updated' })
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
    @Req() request: Request,
  ) {
    return this.categoriesService.update(request.session.userId!, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Category deleted' })
  remove(@Param('id', ParseIntPipe) id: number, @Req() request: Request) {
    return this.categoriesService.remove(request.session.userId!, id);
  }
}
