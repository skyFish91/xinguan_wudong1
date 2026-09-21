# 乌东文旅后端（Midway 3）镜像：构建阶段编译 TS，运行阶段仅保留生产依赖
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm config set registry https://registry.npmmirror.com
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY bootstrap.js ./
COPY --from=builder /app/dist ./dist
RUN mkdir -p uploads/tmp
# 种子占位图（首页轮播/分类图等）随镜像分发；uploads-data 卷首次挂载时会自动复制
COPY uploads/seeds ./uploads/seeds
EXPOSE 7001
CMD ["node", "bootstrap.js"]
