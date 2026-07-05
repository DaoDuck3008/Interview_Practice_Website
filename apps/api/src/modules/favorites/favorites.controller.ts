import { Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { FavoritesService } from './favorites.service';
import { QueryFavoriteDto } from './dto/query-favorite.dto';
import { QueryRecentFavoriteDto } from './dto/query-recent-favorite.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface AuthUser {
  id: string;
}

@UseGuards(JwtAuthGuard)
@Controller('favorites')
export class FavoritesController {
  constructor(private favorites: FavoritesService) {}

  @Get('ids')
  getIds(@CurrentUser() user: AuthUser) {
    return this.favorites.getIds(user.id);
  }

  @Get('recent')
  getRecent(@CurrentUser() user: AuthUser, @Query() query: QueryRecentFavoriteDto) {
    return this.favorites.getRecent(user.id, query.limit);
  }

  @Get()
  getPaginated(@CurrentUser() user: AuthUser, @Query() query: QueryFavoriteDto) {
    return this.favorites.getPaginated(user.id, query);
  }

  @Post(':questionId')
  add(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    return this.favorites.add(user.id, questionId);
  }

  @Delete(':questionId')
  remove(@CurrentUser() user: AuthUser, @Param('questionId') questionId: string) {
    return this.favorites.remove(user.id, questionId);
  }
}
