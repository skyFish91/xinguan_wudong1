<template>
  <div>
    <el-card>
      <div class="toolbar">
        <el-input v-model="word" placeholder="输入敏感词" class="search" @keyup.enter="addWord" />
        <el-button type="primary" @click="addWord">添加敏感词</el-button>
      </div>
      <div class="words">
        <el-tag
          v-for="w in words"
          :key="w.id"
          closable
          class="word-tag"
          @close="removeWord(w)"
        >
          {{ w.word }}
        </el-tag>
      </div>
      <el-empty v-if="!words.length" description="暂无敏感词" />
      <div class="tip">用户发布游记/评论时命中敏感词将自动进入人工审核。</div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import request from '../api/request';

const words = ref<any[]>([]);
const word = ref('');

async function load() {
  try {
    words.value = await request.get('/admin/sensitive-words');
  } catch {
    // 已提示
  }
}

async function addWord() {
  if (!word.value.trim()) {
    ElMessage.warning('请输入敏感词');
    return;
  }
  try {
    await request.post('/admin/sensitive-words/add', { word: word.value.trim() });
    ElMessage.success('已添加');
    word.value = '';
    load();
  } catch {
    // 已提示
  }
}

async function removeWord(w: any) {
  try {
    await ElMessageBox.confirm(`确定删除敏感词「${w.word}」？`, '提示', { type: 'warning' });
    await request.post(`/admin/sensitive-words/${w.id}/delete`);
    ElMessage.success('已删除');
    load();
  } catch (e: any) {
    // 取消或已提示
  }
}

onMounted(load);
</script>

<style scoped>
.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 14px;
}
.search {
  width: 240px;
}
.words {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.word-tag {
  font-size: 13px;
}
.tip {
  margin-top: 16px;
  color: #999;
  font-size: 12px;
}
</style>
