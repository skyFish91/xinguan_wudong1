import { createRouter, createWebHistory } from 'vue-router';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('../views/Login.vue') },
    {
      path: '/',
      component: () => import('../views/Layout.vue'),
      children: [
        { path: '', component: () => import('../views/Dashboard.vue') },
        // 平台管理员
        { path: 'users', component: () => import('../views/Users.vue'), meta: { role: 'admin' } },
        { path: 'applies', component: () => import('../views/Applies.vue'), meta: { role: 'admin' } },
        { path: 'orders', component: () => import('../views/Orders.vue'), meta: { role: 'admin' } },
        { path: 'refunds', component: () => import('../views/Refunds.vue'), meta: { role: 'admin' } },
        { path: 'content', component: () => import('../views/Content.vue'), meta: { role: 'admin' } },
        { path: 'sensitive', component: () => import('../views/Sensitive.vue'), meta: { role: 'admin' } },
        { path: 'ops', component: () => import('../views/Ops.vue'), meta: { role: 'admin' } },
        { path: 'finance', component: () => import('../views/Finance.vue'), meta: { role: 'admin' } },
        // 商家
        { path: 'merchant/clothing', component: () => import('../views/merchant/Clothing.vue'), meta: { role: 'merchant', module: 'clothing' } },
        { path: 'merchant/food', component: () => import('../views/merchant/Food.vue'), meta: { role: 'merchant', module: 'food' } },
        { path: 'merchant/hotel', component: () => import('../views/merchant/Hotel.vue'), meta: { role: 'merchant', module: 'hotel' } },
        { path: 'merchant/travel', component: () => import('../views/merchant/Travel.vue'), meta: { role: 'merchant', module: 'travel' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
});

// 登录守卫
router.beforeEach((to) => {
  if (to.path === '/login') {
    return;
  }
  if (!localStorage.getItem('token')) {
    return { path: '/login', query: { redirect: to.fullPath } };
  }
  const userInfo = JSON.parse(localStorage.getItem('userInfo') || 'null');
  const role = userInfo?.role || '';
  // 平台管理员页面商家不可访问；商家页面管理员按模块进入不受限（演示用途）
  if (to.meta.role === 'admin' && role !== 'admin') {
    return { path: '/' };
  }
  if (to.meta.role === 'merchant' && role !== 'merchant') {
    return { path: '/' };
  }
  if (to.meta.module && userInfo?.merchant?.moduleType !== to.meta.module) {
    return { path: '/' };
  }
});

export default router;
