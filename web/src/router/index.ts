import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('../views/Home.vue') },
    { path: '/login', component: () => import('../views/Login.vue') },
    { path: '/register', component: () => import('../views/Register.vue') },
    // 衣
    { path: '/clothing', component: () => import('../views/clothing/List.vue') },
    { path: '/clothing/:id', component: () => import('../views/clothing/Detail.vue') },
    // 食
    { path: '/food', component: () => import('../views/food/Index.vue') },
    { path: '/food/restaurant/:id', component: () => import('../views/food/RestaurantDetail.vue') },
    // 住
    { path: '/hotel', component: () => import('../views/hotel/List.vue') },
    { path: '/hotel/:id', component: () => import('../views/hotel/Detail.vue') },
    // 行
    { path: '/travel', component: () => import('../views/travel/Scenics.vue') },
    { path: '/travel/scenic/:id', component: () => import('../views/travel/ScenicDetail.vue') },
    { path: '/travel/routes', component: () => import('../views/travel/Routes.vue') },
    { path: '/travel/routes/:id', component: () => import('../views/travel/RouteDetail.vue') },
    { path: '/travel/guides', component: () => import('../views/travel/Guides.vue') },
    { path: '/travel/my-etickets', component: () => import('../views/travel/MyEtickets.vue'), meta: { requiresAuth: true } },
    // 社区
    { path: '/community', component: () => import('../views/community/Home.vue') },
    { path: '/community/feed', component: () => import('../views/community/Feed.vue') },
    { path: '/community/topics', component: () => import('../views/community/Topics.vue') },
    { path: '/community/search', component: () => import('../views/community/Search.vue') },
    { path: '/community/publish', component: () => import('../views/community/Publish.vue'), meta: { requiresAuth: true } },
    { path: '/community/:id', component: () => import('../views/community/PostDetail.vue') },
    // 交易
    { path: '/cart', component: () => import('../views/trade/Cart.vue'), meta: { requiresAuth: true } },
    { path: '/orders', component: () => import('../views/trade/Orders.vue'), meta: { requiresAuth: true } },
    { path: '/pay/:orderId', component: () => import('../views/trade/Pay.vue'), meta: { requiresAuth: true } },
    // 个人中心
    { path: '/user', component: () => import('../views/user/Profile.vue'), meta: { requiresAuth: true } },
    { path: '/user/:userId', component: () => import('../views/user/UserHome.vue') },
    { path: '/user/apply-merchant', component: () => import('../views/user/MerchantApply.vue'), meta: { requiresAuth: true } },
    // 商家中心
    {
      path: '/merchant',
      component: () => import('../views/merchant/Layout.vue'),
      meta: { requiresAuth: true, requiresMerchant: true },
      children: [
        { path: 'dashboard', component: () => import('../views/merchant/Dashboard.vue') },
        { path: 'products', component: () => import('../views/merchant/Products.vue') },
        { path: 'orders', component: () => import('../views/merchant/Orders.vue') },
        { path: 'homestays', component: () => import('../views/merchant/Homestays.vue') },
        { path: 'restaurants', component: () => import('../views/merchant/Restaurants.vue') },
        { path: 'scenics', component: () => import('../views/merchant/Scenics.vue') },
        { path: 'statistics', component: () => import('../views/merchant/Statistics.vue') },
        { path: 'settings', component: () => import('../views/merchant/Settings.vue') },
      ],
    },
    // 管理后台
    {
      path: '/admin',
      component: () => import('../views/admin/Layout.vue'),
      meta: { requiresAuth: true, requiresAdmin: true },
      children: [
        { path: 'dashboard', component: () => import('../views/admin/Dashboard.vue') },
        { path: 'users', component: () => import('../views/admin/Users.vue') },
        { path: 'merchants', component: () => import('../views/admin/Merchants.vue') },
        { path: 'posts', component: () => import('../views/admin/Posts.vue') },
        { path: 'comments', component: () => import('../views/admin/Comments.vue') },
        { path: 'reports', component: () => import('../views/admin/Reports.vue') },
        { path: 'products', component: () => import('../views/admin/Products.vue') },
        { path: 'topics', component: () => import('../views/admin/Topics.vue') },
      ],
    },
  ],
});

// 登录守卫
router.beforeEach((to) => {
  const token = localStorage.getItem('token');
  if (to.meta.requiresAuth && !token) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }

  // 商家权限检查
  if (to.meta.requiresMerchant) {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    try {
      const user = JSON.parse(userInfo);
      if (user.role !== 'merchant') {
        return { path: '/', query: { error: 'no-permission' } };
      }
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }

  // 管理员权限检查
  if (to.meta.requiresAdmin) {
    const userInfo = localStorage.getItem('userInfo');
    if (!userInfo) {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
    try {
      const user = JSON.parse(userInfo);
      if (user.role !== 'admin') {
        return { path: '/', query: { error: 'no-permission' } };
      }
    } catch {
      return { path: '/login', query: { redirect: to.fullPath } };
    }
  }
});

export default router;
