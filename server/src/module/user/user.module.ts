import { Body, Controller, Get, Inject, Param, Post, Put, Query } from '@midwayjs/core';
import { InjectEntityModel } from '@midwayjs/typeorm';
import { Repository } from 'typeorm';
import { ApiOperation, ApiTags } from '@midwayjs/swagger';
import { Provide } from '@midwayjs/core';
import { UserAddressEntity, MerchantApplyEntity, MerchantEntity } from '../../entity/user.entity';
import { UserEntity } from '../../entity/user.entity';
import { BizError } from '../../common/BizError';
import { Auth, CurrentUserParam, CurrentUser } from '../../common/decorators';
import { ok } from '../../common/response';
import { IsNotEmpty } from 'class-validator';

/** 地址 DTO */
export class AddressDTO {
  @IsNotEmpty({ message: '收货人不能为空' })
  receiver: string;
  @IsNotEmpty({ message: '手机号不能为空' })
  phone: string;
  @IsNotEmpty({ message: '省份不能为空' })
  province: string;
  @IsNotEmpty({ message: '城市不能为空' })
  city: string;
  @IsNotEmpty({ message: '区县不能为空' })
  district: string;
  @IsNotEmpty({ message: '详细地址不能为空' })
  detail: string;
  isDefault?: number;
}

/** 商家入驻申请 DTO */
export class MerchantApplyDTO {
  @IsNotEmpty({ message: '店铺名不能为空' })
  shopName: string;
  @IsNotEmpty({ message: '模块类型不能为空' })
  moduleType: string;
  @IsNotEmpty({ message: '联系人不能为空' })
  contact: string;
  @IsNotEmpty({ message: '联系电话不能为空' })
  contactPhone: string;
  @IsNotEmpty({ message: '营业执照号不能为空' })
  licenseNo: string;
  materials?: string;
}

/** 用户服务：收货地址 + 个人中心聚合 */
@Provide()
export class UserService {
  @InjectEntityModel(UserAddressEntity)
  addressRepo: Repository<UserAddressEntity>;

  async listAddress(userId: number) {
    const list = await this.addressRepo.find({ where: { userId }, order: { isDefault: 'DESC', id: 'DESC' } });
    return list;
  }

  async addAddress(userId: number, dto: AddressDTO) {
    if (dto.isDefault === 1) {
      await this.addressRepo.update({ userId }, { isDefault: 0 });
    }
    const addr = this.addressRepo.create({ ...dto, userId, isDefault: dto.isDefault || 0 });
    return this.addressRepo.save(addr);
  }

  async updateAddress(userId: number, id: number, dto: AddressDTO) {
    const addr = await this.addressRepo.findOneBy({ id, userId });
    if (!addr) {
      throw BizError.notFound('地址不存在');
    }
    if (dto.isDefault === 1) {
      await this.addressRepo.update({ userId }, { isDefault: 0 });
    }
    Object.assign(addr, dto);
    return this.addressRepo.save(addr);
  }

  async deleteAddress(userId: number, id: number) {
    const result = await this.addressRepo.delete({ id, userId });
    if (!result.affected) {
      throw BizError.notFound('地址不存在');
    }
    return true;
  }
}

/** 商家服务：入驻申请 */
@Provide()
export class MerchantService {
  @InjectEntityModel(MerchantApplyEntity)
  applyRepo: Repository<MerchantApplyEntity>;

  @InjectEntityModel(MerchantEntity)
  merchantRepo: Repository<MerchantEntity>;

  async apply(userId: number, dto: MerchantApplyDTO) {
    // 一个用户只能有一条待审核申请
    const pending = await this.applyRepo.findOneBy({ userId, status: 0 });
    if (pending) {
      throw BizError.biz('已有待审核的入驻申请');
    }
    const apply = this.applyRepo.create({ ...dto, userId, status: 0 });
    await this.applyRepo.save(apply);
    return { applyId: apply.id };
  }

  async myApply(userId: number) {
    const list = await this.applyRepo.find({ where: { userId }, order: { id: 'DESC' } });
    return list;
  }

  /** 商家店铺信息（商家自维护） */
  async myShop(merchantId: number) {
    const merchant = await this.merchantRepo.findOneBy({ id: merchantId });
    if (!merchant) {
      throw BizError.notFound('店铺不存在');
    }
    return merchant;
  }

  async updateShop(merchantId: number, dto: { shopName?: string; contact?: string; contactPhone?: string }) {
    await this.merchantRepo.update(merchantId, dto);
    return this.myShop(merchantId);
  }
}

@ApiTags(['公共-个人中心'])
@Controller('/api/user')
export class UserController {
  @Inject()
  userService: UserService;

  @ApiOperation({ summary: '收货地址列表' })
  @Auth()
  @Get('/addresses')
  async listAddress(@CurrentUserParam() user: CurrentUser) {
    return this.userService.listAddress(user.userId);
  }

  @ApiOperation({ summary: '新增收货地址' })
  @Auth()
  @Post('/addresses')
  async addAddress(@Body() dto: AddressDTO, @CurrentUserParam() user: CurrentUser) {
    return this.userService.addAddress(user.userId, dto);
  }

  @ApiOperation({ summary: '修改收货地址' })
  @Auth()
  @Put('/addresses/:id')
  async updateAddress(@Param('id') id: number, @Body() dto: AddressDTO, @CurrentUserParam() user: CurrentUser) {
    return this.userService.updateAddress(user.userId, Number(id), dto);
  }

  @ApiOperation({ summary: '删除收货地址' })
  @Auth()
  @Post('/addresses/:id/delete')
  async deleteAddress(@Param('id') id: number, @CurrentUserParam() user: CurrentUser) {
    return this.userService.deleteAddress(user.userId, Number(id));
  }
}

@ApiTags(['公共-商家'])
@Controller('/api/merchant')
export class MerchantController {
  @Inject()
  merchantService: MerchantService;

  @ApiOperation({ summary: '提交商家入驻申请' })
  @Auth()
  @Post('/apply')
  async apply(@Body() dto: MerchantApplyDTO, @CurrentUserParam() user: CurrentUser) {
    return this.merchantService.apply(user.userId, dto);
  }

  @ApiOperation({ summary: '我的入驻申请' })
  @Auth()
  @Get('/my-apply')
  async myApply(@CurrentUserParam() user: CurrentUser) {
    return this.merchantService.myApply(user.userId);
  }

  @ApiOperation({ summary: '我的店铺信息（商家）' })
  @Auth('merchant')
  @Get('/my-shop')
  async myShop(@CurrentUserParam() user: CurrentUser) {
    return this.merchantService.myShop(user.merchantId);
  }

  @ApiOperation({ summary: '修改店铺信息（商家）' })
  @Auth('merchant')
  @Put('/my-shop')
  async updateShop(@Body() dto: any, @CurrentUserParam() user: CurrentUser) {
    return this.merchantService.updateShop(user.merchantId, dto);
  }
}
