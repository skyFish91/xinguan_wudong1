import { UserService, MerchantService } from '../src/module/user/user.module';
import { UserAddressEntity, MerchantApplyEntity, MerchantEntity, UserEntity } from '../src/entity/user.entity';
import { repo, makeService } from './helpers/db';

/** 组装地址服务 */
function wireUserService(): UserService {
  const svc = makeService(UserService);
  svc.addressRepo = repo(UserAddressEntity);
  return svc;
}

/** 组装商家入驻服务 */
function wireMerchantService(): MerchantService {
  const svc = makeService(MerchantService);
  svc.applyRepo = repo(MerchantApplyEntity);
  svc.merchantRepo = repo(MerchantEntity);
  return svc;
}

describe('UserService 地址簿', () => {
  let svc: UserService;

  beforeEach(() => {
    svc = wireUserService();
  });

  it('新增地址', async () => {
    const addr = await svc.addAddress(2, {
      receiver: '张三', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '乌东村1号', isDefault: 0,
    });
    expect(addr.id).toBeGreaterThan(0);
    expect(addr.userId).toBe(2);
    const list = await svc.listAddress(2);
    expect(list).toHaveLength(1);
  });

  it('设为默认地址时互斥其他默认', async () => {
    await svc.addAddress(2, {
      receiver: '张三', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '家', isDefault: 1,
    });
    await svc.addAddress(2, {
      receiver: '李四', phone: '13800000002', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '公司', isDefault: 1,
    });
    const list = await svc.listAddress(2);
    const defaults = list.filter(a => a.isDefault === 1);
    expect(defaults).toHaveLength(1);
    expect(defaults[0].receiver).toBe('李四');
  });

  it('修改地址内容与默认标记', async () => {
    const addr = await svc.addAddress(2, {
      receiver: '张三', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '家', isDefault: 0,
    });
    const updated = await svc.updateAddress(2, addr.id, {
      receiver: '张三丰', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '新家', isDefault: 1,
    });
    expect(updated.receiver).toBe('张三丰');
    expect(updated.isDefault).toBe(1);
  });

  it('修改他人地址抛 3005', async () => {
    const addr = await svc.addAddress(2, {
      receiver: '张三', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '家', isDefault: 0,
    });
    await expect(svc.updateAddress(3, addr.id, {} as any)).rejects.toMatchObject({ code: 3005 });
  });

  it('删除地址', async () => {
    const addr = await svc.addAddress(2, {
      receiver: '张三', phone: '13800000001', province: '贵州省', city: '黔东南州', district: '雷山县', detail: '家', isDefault: 0,
    });
    await svc.deleteAddress(2, addr.id);
    expect(await svc.listAddress(2)).toHaveLength(0);
  });

  it('删除不存在的地址抛 3005', async () => {
    await expect(svc.deleteAddress(2, 999)).rejects.toMatchObject({ code: 3005 });
  });
});

describe('MerchantService 商家入驻', () => {
  let svc: MerchantService;

  beforeEach(() => {
    svc = wireMerchantService();
  });

  const dto = {
    shopName: '苗银坊', moduleType: 'clothing', contact: '张三', contactPhone: '13800000001', licenseNo: 'L001', materials: '营业执照照片',
  };

  it('提交申请生成待审核记录', async () => {
    const { applyId } = await svc.apply(2, dto);
    expect(applyId).toBeGreaterThan(0);
    const list = await svc.myApply(2);
    expect(list).toHaveLength(1);
    expect(list[0].status).toBe(0);
  });

  it('存在待审核申请时重复提交抛 3001', async () => {
    await svc.apply(2, dto);
    await expect(svc.apply(2, dto)).rejects.toMatchObject({ code: 3001 });
  });

  it('历史申请被驳回后可再次提交', async () => {
    await svc.apply(2, dto);
    await repo(MerchantApplyEntity).update({ userId: 2 }, { status: 2 });
    await svc.apply(2, dto);
    const list = await svc.myApply(2);
    expect(list).toHaveLength(2);
  });

  it('查询店铺信息', async () => {
    const merchant = await repo(MerchantEntity).save(
      repo(MerchantEntity).create({ userId: 1, shopName: '苗银坊', moduleType: 'clothing', status: 1 })
    );
    const shop = await svc.myShop(merchant.id);
    expect(shop.shopName).toBe('苗银坊');
  });

  it('店铺不存在抛 3005', async () => {
    await expect(svc.myShop(999)).rejects.toMatchObject({ code: 3005 });
  });

  it('商家更新店铺信息', async () => {
    const merchant = await repo(MerchantEntity).save(
      repo(MerchantEntity).create({ userId: 1, shopName: '苗银坊', moduleType: 'clothing', status: 1 })
    );
    const shop = await svc.updateShop(merchant.id, { shopName: '新苗银坊', contact: '李四' });
    expect(shop.shopName).toBe('新苗银坊');
    expect(shop.contact).toBe('李四');
  });
});
