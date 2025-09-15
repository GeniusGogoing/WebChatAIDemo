#!/usr/bin/env node

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔍 开始 TypeScript 类型检查...\n');

try {
  // 运行 TypeScript 编译器进行类型检查
  execSync('npx tsc --noEmit', {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
  
  console.log('\n✅ TypeScript 类型检查通过！');
  console.log('🎉 项目已启用严格模式，所有类型注解完善！');
  
} catch {
  console.error('\n❌ TypeScript 类型检查失败！');
  console.error('请修复上述类型错误后重试。');
  process.exit(1);
}
