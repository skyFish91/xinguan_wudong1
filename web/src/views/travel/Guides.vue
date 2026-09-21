<template>
  <div>
    <TopNav />
    <div class="page">
      <div class="toolbar">
        <el-select v-model="departFrom" placeholder="全部出发地" clearable class="from-select" @change="load">
          <el-option v-for="f in fromOptions" :key="f" :label="f" :value="f" />
        </el-select>
      </div>

      <el-empty v-if="!list.length" description="暂无攻略" />
      <div class="grid">
        <el-card v-for="g in list" :key="g.id" class="item" shadow="hover" @click="showDetail(g)">
          <img v-if="g.image" :src="g.image" class="item-img" />
          <div class="item-title">{{ g.title }}</div>
          <div class="item-sub">{{ g.departFrom }} → {{ g.dest }} · {{ g.transport }} · {{ g.duration }} · {{ g.cost }}</div>
        </el-card>
      </div>

      <el-dialog v-model="dialog" :title="current?.title" width="640px">
        <img v-if="current?.image" :src="current.image" class="dialog-img" />
        <div class="dialog-line">出发地：{{ current?.departFrom }} · 目的地：{{ current?.dest }}</div>
        <div class="dialog-line">交通方式：{{ current?.transport }} · 用时：{{ current?.duration }} · 费用：{{ current?.cost }}</div>
        <div class="dialog-detail" v-html="current?.detail" />
      </el-dialog>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const departFrom = ref('');
const fromOptions = ref<string[]>([]);
const list = ref<any[]>([]);
const dialog = ref(false);
const current = ref<any>(null);

async function load() {
  try {
    list.value = await request.get('/travel/guides', {
      params: { departFrom: departFrom.value || undefined },
    });
    const set = new Set<string>();
    list.value.forEach(g => set.add(g.departFrom));
    fromOptions.value = Array.from(set);
  } catch {
    // 已提示
  }
}

async function showDetail(g: any) {
  try {
    current.value = await request.get(`/travel/guides/${g.id}`);
    dialog.value = true;
  } catch {
    // 已提示
  }
}

onMounted(load);
</script>

<style scoped>
.page {
  max-width: 1000px;
  margin: 0 auto;
  padding: 20px;
}
.toolbar {
  margin-bottom: 16px;
}
.from-select {
  width: 180px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.item {
  cursor: pointer;
}
.item-img {
  width: 100%;
  height: 140px;
  object-fit: cover;
  border-radius: 4px;
}
.item-title {
  margin-top: 8px;
  font-weight: 600;
}
.item-sub {
  font-size: 12px;
  color: #999;
  margin-top: 4px;
}
.dialog-img {
  width: 100%;
  height: 240px;
  object-fit: cover;
  border-radius: 6px;
  margin-bottom: 12px;
}
.dialog-line {
  color: #555;
  margin-bottom: 6px;
}
.dialog-detail {
  margin-top: 10px;
  line-height: 1.8;
  color: #444;
}
</style>
