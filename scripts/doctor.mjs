import { mkdir, access } from 'node:fs/promises';
import { constants } from 'node:fs';
import path from 'node:path';
const directory = path.resolve(process.env.WORKBENCH_DATA_DIR || 'work/local');
if (Number(process.versions.node.split('.')[0]) < 22) { console.error('请使用 Node.js 22 或更新版本。'); process.exit(1); }
await mkdir(directory, {recursive:true,mode:0o700});
await access(directory,constants.W_OK);
console.log(`Node.js ${process.versions.node}\n数据目录可写：${directory}\n本地模式无需 Docker。AI 可在设置页配置。\n启动：pnpm dev；健康检查：/api/v1/health`);
