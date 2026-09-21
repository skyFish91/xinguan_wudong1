<template>
  <div>
    <el-card>
      <el-tabs v-model="tab" @tab-change="reload">
        <!-- 帖子审核 -->
        <el-tab-pane label="游记审核" name="posts">
          <div class="toolbar">
            <el-select v-model="postStatus" placeholder="全部状态" clearable class="select" @change="loadPosts(1)">
              <el-option label="待审核" value="0" />
              <el-option label="已过审" value="1" />
              <el-option label="已驳回" value="2" />
            </el-select>
            <el-input v-model="postKeyword" placeholder="搜索标题/内容" class="search" clearable @keyup.enter="loadPosts(1)" />
            <el-button type="primary" @click="loadPosts(1)">查询</el-button>
          </div>
          <el-table :data="posts" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column prop="title" label="标题" />
            <el-table-column label="作者" width="110">
              <template #default="{ row }">{{ row.author?.nickname || row.userId }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : row.status === 2 ? 'danger' : 'warning'" size="small">
                  {{ row.status === 0 ? '待审核' : row.status === 1 ? '已过审' : '已驳回' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="220">
              <template #default="{ row }">
                <el-button v-if="row.status === 0" link type="success" @click="auditPost(row, true)">通过</el-button>
                <el-button v-if="row.status === 0" link type="danger" @click="auditPost(row, false)">驳回</el-button>
                <el-button link type="warning" @click="toggleHot(row)">{{ row.isHot ? '取消热门' : '设为热门' }}</el-button>
                <el-button link type="danger" @click="deletePost(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="postTotal"
            :page-size="10"
            :current-page="postPage"
            class="pager"
            @current-change="loadPosts"
          />
        </el-tab-pane>

        <!-- 评论 -->
        <el-tab-pane label="评论管理" name="comments">
          <el-table :data="comments" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="用户" width="110">
              <template #default="{ row }">{{ row.user?.nickname || row.userId }}</template>
            </el-table-column>
            <el-table-column prop="content" label="内容" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'danger'" size="small">{{ row.status === 1 ? '正常' : '已隐藏' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="110">
              <template #default="{ row }">
                <el-button link :type="row.status === 1 ? 'danger' : 'success'" @click="toggleComment(row)">
                  {{ row.status === 1 ? '隐藏' : '恢复' }}
                </el-button>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="commentTotal"
            :page-size="10"
            :current-page="commentPage"
            class="pager"
            @current-change="loadComments"
          />
        </el-tab-pane>

        <!-- 举报 -->
        <el-tab-pane label="举报处理" name="reports">
          <el-table :data="reports" border>
            <el-table-column prop="id" label="ID" width="70" />
            <el-table-column label="举报人" width="110">
              <template #default="{ row }">{{ row.reporter || row.reportUserId }}</template>
            </el-table-column>
            <el-table-column label="对象" width="140">
              <template #default="{ row }">{{ row.targetType }} #{{ row.targetId }}</template>
            </el-table-column>
            <el-table-column prop="reason" label="原因" />
            <el-table-column label="状态" width="90">
              <template #default="{ row }">
                <el-tag :type="row.status === 1 ? 'success' : 'warning'" size="small">{{ row.status === 0 ? '待处理' : '已处理' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="170">
              <template #default="{ row }">
                <el-button v-if="row.status === 0" link type="danger" @click="handleReport(row, true)">下架内容</el-button>
                <el-button v-if="row.status === 0" link type="success" @click="handleReport(row, false)">驳回举报</el-button>
                <span v-else class="muted">{{ row.handleNote || '-' }}</span>
              </template>
            </el-table-column>
          </el-table>
          <el-pagination
            layout="prev, pager, next, total"
            :total="reportTotal"
            :page-size="10"
            :current-page="reportPage"
            class="pager"
            @current-change="loadReports"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const tab = ref('posts');

// 帖子
const postStatus = ref('');
const postKeyword = ref('');
const posts = ref<any[]>([]);
const postTotal = ref(0);
const postPage = ref(1);

// 评论
const comments = ref<any[]>([]);
const commentTotal = ref(0);
const commentPage = ref(1);

// 举报
const reports = ref<any[]>([]);
const reportTotal = ref(0);
const reportPage = ref(1);

async function loadPosts(p = 1) {
  postPage.value = p;
  try {
    const data: any = await request.get('/admin/community/posts', {
      params: { status: postStatus.value || undefined, keyword: postKeyword.value || undefined, page: postPage.value, pageSize: 10 },
    });
    posts.value = data.list || [];
    postTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function auditPost(row: any, pass: boolean) {
  const action = pass ? '通过' : '驳回';
  try {
    let reason = '';
    if (!pass) {
      const r = await ElMessageBox.prompt('请填写驳回原因', '驳回游记');
      reason = r.value || '';
    } else {
      await ElMessageBox.confirm('确定通过该游记审核？', '提示', { type: 'warning' });
    }
    await request.post(`/admin/community/posts/${row.id}/audit`, { pass, reason });
    ElMessage.success(`已${action}`);
    loadPosts(postPage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function toggleHot(row: any) {
  try {
    await request.post(`/admin/community/posts/${row.id}/toggle-hot`);
    ElMessage.success('已切换');
    loadPosts(postPage.value);
  } catch {
    // 已提示
  }
}

async function deletePost(row: any) {
  try {
    await ElMessageBox.confirm('确定删除该游记？', '提示', { type: 'warning' });
    await request.post(`/admin/community/posts/${row.id}/delete`);
    ElMessage.success('已删除');
    loadPosts(postPage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

async function loadComments(p = 1) {
  commentPage.value = p;
  try {
    const data: any = await request.get('/admin/community/comments', {
      params: { page: commentPage.value, pageSize: 10 },
    });
    comments.value = data.list || [];
    commentTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function toggleComment(row: any) {
  try {
    await request.post(`/admin/community/comments/${row.id}/status`, { status: row.status === 1 ? 0 : 1 });
    ElMessage.success('已操作');
    loadComments(commentPage.value);
  } catch {
    // 已提示
  }
}

async function loadReports(p = 1) {
  reportPage.value = p;
  try {
    const data: any = await request.get('/admin/community/reports', {
      params: { page: reportPage.value, pageSize: 10 },
    });
    reports.value = data.list || [];
    reportTotal.value = data.total || 0;
  } catch {
    // 已提示
  }
}

async function handleReport(row: any, takeDown: boolean) {
  try {
    await ElMessageBox.confirm(takeDown ? '确定下架被举报内容？' : '确定驳回该举报？', '提示', { type: 'warning' });
    await request.post(`/admin/community/reports/${row.id}/handle`, { takeDown, note: takeDown ? '内容违规，已下架' : '举报不成立' });
    ElMessage.success('已处理');
    loadReports(reportPage.value);
  } catch (e: any) {
    // 取消或已提示
  }
}

function reload() {
  if (tab.value === 'posts') loadPosts(1);
  if (tab.value === 'comments') loadComments(1);
  if (tab.value === 'reports') loadReports(1);
}

onMounted(() => {
  loadPosts(1);
  loadComments(1);
  loadReports(1);
});
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.select {
  width: 140px;
}
.pager {
  margin-top: 14px;
  justify-content: flex-end;
}
.muted {
  color: #999;
  font-size: 12px;
}
</style>
