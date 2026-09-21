<template>
  <div>
    <TopNav />
    <div class="page">
      <h2>发布游记</h2>
      <el-form :model="form" label-width="90px" class="form">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="200" placeholder="给你的游记起个标题" class="input" />
        </el-form-item>
        <el-form-item label="选择话题">
          <el-select v-model="form.topicId" placeholder="选择话题（选填）" clearable class="topic-select">
            <el-option v-for="t in topics" :key="t.id" :label="`#${t.name}`" :value="t.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="位置信息">
          <el-input v-model="form.location" placeholder="输入位置名称，如：乌东村、吊脚楼民宿等（选填）" class="input" />
        </el-form-item>
        <el-form-item label="正文">
          <el-input v-model="form.content" type="textarea" :rows="8" maxlength="5000" show-word-limit placeholder="分享你在乌东的见闻与照片故事" />
        </el-form-item>
        <el-form-item label="图片">
          <div class="upload-area">
            <div v-for="(img, i) in images" :key="i" class="img-box">
              <img :src="img" class="uploaded-img" />
              <el-icon class="remove-icon" @click="removeImage(i)"><Close /></el-icon>
            </div>
            <el-upload
              v-if="images.length < 9"
              :show-file-list="false"
              :before-upload="beforeUpload"
              :http-request="doUpload"
              accept="image/*"
              class="upload-btn"
            >
              <el-button>+ 上传图片</el-button>
            </el-upload>
          </div>
          <div class="upload-tip">支持 jpg/png/webp，单张不超过 5MB，最多 9 张</div>
        </el-form-item>
        <el-form-item label="视频链接">
          <el-input v-model="form.videoUrl" placeholder="视频 URL（选填）" class="input" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="publishing" @click="submit">发布</el-button>
          <el-button @click="$router.back()">取消</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { Close } from '@element-plus/icons-vue';
import TopNav from '../../components/TopNav.vue';
import request from '../../api/request';

const router = useRouter();
const topics = ref<any[]>([]);
const images = ref<string[]>([]);
const publishing = ref(false);
const form = reactive({
  title: '',
  content: '',
  location: '',
  topicId: undefined as number | undefined,
  videoUrl: '',
});

function beforeUpload(file: File) {
  const okType = /image\/(jpeg|png|webp)/.test(file.type);
  if (!okType) {
    ElMessage.warning('仅支持 jpg/png/webp 图片');
    return false;
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.warning('图片大小不能超过 5MB');
    return false;
  }
  return true;
}

async function doUpload(options: any) {
  const fd = new FormData();
  fd.append('file', options.file);
  try {
    const saved: any = await request.post('/upload/file', fd);
    if (saved?.length) {
      images.value.push(saved[0].url);
    }
  } catch {
    // 已提示
  }
}

function removeImage(i: number) {
  images.value.splice(i, 1);
}

async function submit() {
  if (!form.title.trim()) {
    ElMessage.warning('请输入标题');
    return;
  }
  if (!form.content.trim()) {
    ElMessage.warning('请输入正文内容');
    return;
  }
  publishing.value = true;
  try {
    const result: any = await request.post('/community/posts', {
      title: form.title,
      content: form.content,
      location: form.location,
      images: JSON.stringify(images.value),
      videoUrl: form.videoUrl,
      topicId: form.topicId,
    });
    if (result?.needAudit) {
      ElMessage.warning('内容触发敏感词检测，已提交人工审核，通过后可见');
    } else {
      ElMessage.success('发布成功');
    }
    router.push('/community');
  } catch {
    // 已提示
  } finally {
    publishing.value = false;
  }
}

onMounted(async () => {
  try {
    topics.value = await request.get('/community/topics');
  } catch {
    // 已提示
  }
});
</script>

<style scoped>
.page {
  max-width: 760px;
  margin: 0 auto;
  padding: 20px;
}
.form {
  margin-top: 20px;
}
.input {
  max-width: 480px;
}
.topic-select {
  width: 240px;
}
.upload-area {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  align-items: center;
}
.img-box {
  position: relative;
}
.uploaded-img {
  width: 100px;
  height: 100px;
  object-fit: cover;
  border-radius: 6px;
}
.remove-icon {
  position: absolute;
  top: -6px;
  right: -6px;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  border-radius: 50%;
  cursor: pointer;
  padding: 2px;
}
.upload-btn {
  display: inline-block;
}
.upload-tip {
  font-size: 12px;
  color: #999;
  margin-top: 6px;
  width: 100%;
}
</style>
