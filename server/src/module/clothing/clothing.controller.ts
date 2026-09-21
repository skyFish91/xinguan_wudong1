import { Body, Controller, Get, Inject, Param, Post, Put, Query } from '@midwayjs/core';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { ClothingService } from './clothing.service';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { IsIn, IsNotEmpty } from 'class-validator';

/** 评价 DTO */
export class ReviewDTO {
  @IsNotEmpty({ message: '评价对象类型不能为空' })
  bizType: string;
  @IsNotEmpty({ message: '评价对象不能为空' })
  bizId: number;
  @IsNotEmpty({ message: '评分不能为空' })
  rating: number;
  @IsNotEmpty({ message: '评价内容不能为空' })
  content: string;
  images?: string;
  orderId?: number;
}

@ApiTags(['模块一-衣-非遗商品'])
@Controller('/api/clothing')
export class ClothingController {
  @Inject()
  clothingService: ClothingService;

  @ApiOperation({ summary: '商品分类树（一级+二级）' })
  @Get('/categories')
  async categories() {
    return this.clothingService.categoryTree();
  }

  @ApiOperation({ summary: '商品列表（分类/关键词/价格/排序/分页）' })
  @Get('/products')
  async products(
    @Query('categoryId') categoryId: number | undefined,
    @Query('keyword') keyword: string,
    @Query('minPrice') minPrice: string | undefined,
    @Query('maxPrice') maxPrice: string | undefined,
    @Query('sort') sort: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 12
  ) {
    return this.clothingService.productList({
      categoryId: categoryId ? Number(categoryId) : undefined,
      keyword,
      minPrice: minPrice !== undefined && minPrice !== '' ? Number(minPrice) : undefined,
      maxPrice: maxPrice !== undefined && maxPrice !== '' ? Number(maxPrice) : undefined,
      sort,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @ApiOperation({ summary: '商品详情（SKU/图片/传承人/评价）' })
  @Get('/products/:id')
  async detail(@Param('id') id: number) {
    return this.clothingService.productDetail(Number(id));
  }

  @ApiOperation({ summary: '收藏/取消收藏' })
  @Auth()
  @Post('/favorite/toggle')
  async toggleFavorite(
    @Query('bizType') bizType: string,
    @Query('bizId') bizId: number,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.clothingService.toggleFavorite(user.userId, bizType, Number(bizId));
  }

  @ApiOperation({ summary: '是否已收藏' })
  @Auth()
  @Get('/favorite/status')
  async favoriteStatus(
    @Query('bizType') bizType: string,
    @Query('bizId') bizId: number,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.clothingService.isFavorite(user.userId, bizType, Number(bizId));
  }

  @ApiOperation({ summary: '我的收藏聚合（bizType: all/product/...）' })
  @Auth()
  @Get('/favorites')
  async myFavorites(
    @Query('bizType') bizType: string,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.clothingService.myFavorites(user.userId, bizType, Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '发表评价（文字+图片+评分）' })
  @Auth()
  @Post('/reviews')
  async createReview(@Body() dto: ReviewDTO, @CurrentUserParam() user: CurrentUser) {
    return this.clothingService.createReview(user.userId, dto);
  }

  @ApiOperation({ summary: '追评（30 天内）' })
  @Auth()
  @Post('/reviews/:id/follow-up')
  async followUp(@Param('id') id: number, @Body('content') content: string, @CurrentUserParam() user: CurrentUser) {
    return this.clothingService.followUpReview(user.userId, Number(id), content);
  }

  @ApiOperation({ summary: '评价列表（bizType: product/farm/restaurant/homestay/ticket/route）' })
  @Get('/reviews')
  async reviews(
    @Query('bizType') bizType: string,
    @Query('bizId') bizId: number,
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10
  ) {
    return this.clothingService.reviewList(bizType, Number(bizId), Number(page), Number(pageSize));
  }

  @ApiOperation({ summary: '我的评价' })
  @Auth()
  @Get('/my-reviews')
  async myReviews(
    @Query('page') page = 1,
    @Query('pageSize') pageSize = 10,
    @CurrentUserParam() user: CurrentUser
  ) {
    return this.clothingService.myReviews(user.userId, Number(page), Number(pageSize));
  }
}
