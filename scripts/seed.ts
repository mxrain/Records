import { loadEnvConfig } from '@next/env';
import { randomUUID } from 'crypto';
import { createClient } from 'redis';

loadEnvConfig(process.cwd());

let _db: any = null;

async function getDb() {
  if (!_db) {
    const mod = await import('../lib/db-core');
    _db = mod.db;
  }
  return _db;
}

async function clearRedisCache() {
  if (!process.env.REDIS_URL) {
    console.log('  Redis not configured, skipping cache clear');
    return;
  }
  try {
    const client = createClient({ url: process.env.REDIS_URL });
    await client.connect();
    await client.del('db:categories');
    await client.del('db:resources');
    console.log('  ✓ Cleared Redis cache (categories, resources)');
    await client.disconnect();
  } catch (e) {
    console.log('  ⚠ Redis cache clear skipped:', (e as Error).message);
  }
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seedCategories() {
  const db = await getDb();
  console.log('Seeding categories...');

  // 清除旧数据（修正数组格式问题）
  await db.query('DELETE FROM categories');
  console.log('  Cleared existing categories');

  const categories = [
    {
      name: '编程开发',
      slug: 'programming',
      icon: 'Code2',
      description: '各类编程语言、框架和开发工具资源',
      sort_order: 1,
      children: [
        { name: '前端开发', slug: 'frontend', icon: 'Layout', description: 'HTML/CSS/JS 及前端框架' },
        { name: '后端开发', slug: 'backend', icon: 'Server', description: 'Node.js/Python/Go 等后端技术' },
        { name: '移动开发', slug: 'mobile', icon: 'Smartphone', description: 'iOS/Android/跨平台移动开发' },
        { name: 'DevOps', slug: 'devops', icon: 'Terminal', description: 'CI/CD、容器化和运维工具' },
      ],
    },
    {
      name: '设计素材',
      slug: 'design',
      icon: 'Palette',
      description: 'UI/UX 设计素材、图标和字体',
      sort_order: 2,
      children: [
        { name: 'UI 套件', slug: 'ui-kits', icon: 'Component', description: 'Figma/Sketch UI Kit' },
        { name: '图标资源', slug: 'icons', icon: 'Star', description: 'SVG 图标集和图标字体' },
        { name: '字体资源', slug: 'fonts', icon: 'Type', description: '中英文字体资源' },
      ],
    },
    {
      name: '效率工具',
      slug: 'tools',
      icon: 'Wrench',
      description: '提升工作效率的各种工具',
      sort_order: 3,
      children: [
        { name: '办公效率', slug: 'office', icon: 'Briefcase', description: 'Office 套件及替代品' },
        { name: '笔记工具', slug: 'note', icon: 'FileText', description: 'Notion/Obsidian 等笔记工具' },
        { name: '自动化', slug: 'automation', icon: 'Zap', description: '自动化工作流和脚本' },
      ],
    },
    {
      name: '学习资源',
      slug: 'learning',
      icon: 'GraduationCap',
      description: '在线课程、教程和书籍',
      sort_order: 4,
      children: [
        { name: '视频课程', slug: 'courses', icon: 'PlayCircle', description: '视频教程和在线课程' },
        { name: '电子书籍', slug: 'books', icon: 'BookOpen', description: '技术书籍和文档' },
        { name: '技术文档', slug: 'docs', icon: 'ScrollText', description: 'API 文档和参考手册' },
      ],
    },
    {
      name: '人工智能',
      slug: 'ai',
      icon: 'Brain',
      description: 'AI 模型、工具和数据集',
      sort_order: 5,
      children: [
        { name: 'AI 模型', slug: 'models', icon: 'Cpu', description: 'LLM/Stable Diffusion 等模型' },
        { name: 'AI 工具', slug: 'ai-tools', icon: 'Wand2', description: 'ChatGPT/Copilot 等 AI 工具' },
        { name: '数据集', slug: 'datasets', icon: 'Database', description: '训练和测试数据集' },
      ],
    },
  ];

  // 将 children 数组转为以 slug 为 key 的对象，并添加 link 字段
  function childrenToObject(children: any[]) {
    const obj: Record<string, any> = {};
    for (const child of children) {
      obj[child.slug] = {
        name: child.name,
        slug: child.slug,
        icon: child.icon || '',
        link: `/${child.slug}`,
      };
    }
    return obj;
  }

  for (const cat of categories) {
    const childrenObj = childrenToObject(cat.children);
    await db.query(
      `INSERT INTO categories (name, slug, icon, description, children, sort_order) VALUES ($1, $2, $3, $4, $5, $6)`,
      [cat.name, cat.slug, cat.icon, cat.description, JSON.stringify(childrenObj), cat.sort_order]
    );
    console.log(`  ✓ ${cat.name}`);
  }
}

async function seedResources() {
  const db = await getDb();
  console.log('\nSeeding resources...');

  await db.query('DELETE FROM media_files');
  await db.query('DELETE FROM change_logs');
  await db.query('DELETE FROM resources');
  console.log('  Cleared existing resources, change_logs and media_files');

  const resourceTemplates = [
    {
      title: 'VS Code 完整配置指南',
      category: '编程开发 > 前端开发',
      description: '包含最佳扩展推荐、settings.json 配置、快捷键方案和主题优化，帮助开发者搭建高效的 VS Code 开发环境。',
      tags: { editor: '编辑器', vscode: 'VS Code', devtools: '开发工具' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example1', psw: 'abcd', size: '2.3 MB' },
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example1', psw: '', size: '2.3 MB' },
      },
      images: [
        'https://picsum.photos/seed/vscode1/800/600',
        'https://picsum.photos/seed/vscode2/800/600',
      ],
      json_data: { rating: 4.8, platform: '跨平台', license: '免费', version: '1.90' },
    },
    {
      title: 'React 18 高级实战项目',
      category: '编程开发 > 前端开发',
      description: '从零搭建企业级 React 应用，涵盖 Hooks、Context、Redux Toolkit、React Query 和性能优化实战。',
      tags: { react: 'React', frontend: '前端', typescript: 'TypeScript' },
      source_links: {
        GitHub: { link: 'https://github.com/example/react-advanced', psw: '', size: '15 MB' },
        百度网盘: { link: 'https://pan.baidu.com/s/1example2', psw: 'xyz1', size: '500 MB' },
      },
      images: ['https://picsum.photos/seed/react1/800/600'],
      json_data: { rating: 4.9, platform: 'Web', license: 'MIT', version: '2.0' },
    },
    {
      title: 'Python 自动化脚本合集',
      category: '编程开发 > 后端开发',
      description: '50+ 实用 Python 脚本，涵盖文件处理、网页爬虫、数据分析、自动化办公等场景。',
      tags: { python: 'Python', automation: '自动化', scripting: '脚本' },
      source_links: {
        GitHub: { link: 'https://github.com/example/python-scripts', psw: '', size: '8 MB' },
      },
      images: [
        'https://picsum.photos/seed/python1/800/600',
        'https://picsum.photos/seed/python2/800/600',
        'https://picsum.photos/seed/python3/800/600',
      ],
      json_data: { rating: 4.7, platform: '跨平台', license: 'MIT' },
    },
    {
      title: 'Docker & K8s 实战手册',
      category: '编程开发 > DevOps',
      description: '从 Docker 基础到 Kubernetes 集群管理，包含完整的 CI/CD 流水线配置示例。',
      tags: { docker: 'Docker', kubernetes: 'K8s', devops: 'DevOps' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example3', psw: 'dk8s', size: '1.2 GB' },
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example2', psw: '', size: '1.2 GB' },
      },
      images: ['https://picsum.photos/seed/docker1/800/600'],
      json_data: { rating: 4.6, platform: 'Linux', version: '2024' },
    },
    {
      title: 'Figma UI Kit — SaaS Dashboard',
      category: '设计素材 > UI 套件',
      description: '完整的 SaaS 仪表盘 UI 组件库，包含 60+ 屏幕、自动布局和设计变量。',
      tags: { figma: 'Figma', ui: 'UI设计', dashboard: '仪表盘' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example4', psw: 'ui88', size: '340 MB' },
      },
      images: [
        'https://picsum.photos/seed/figma1/800/600',
        'https://picsum.photos/seed/figma2/800/600',
      ],
      json_data: { rating: 4.5, format: 'Figma', category_extra: 'Dashboard' },
    },
    {
      title: '5000+ 精美 SVG 图标集',
      category: '设计素材 > 图标资源',
      description: '覆盖 30+ 分类的矢量图标集合，支持多种风格：线性、填充、双色调。',
      tags: { icons: '图标', svg: 'SVG', design: '设计' },
      source_links: {
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example3', psw: '', size: '85 MB' },
        OneDrive: { link: 'https://onedrive.live.com/example', psw: 'ic99', size: '85 MB' },
      },
      images: ['https://picsum.photos/seed/icons1/800/600'],
      json_data: { rating: 4.4, format: 'SVG', count: 5000, license: '免费商用' },
    },
    {
      title: 'Notion 全场景模板合集',
      category: '效率工具 > 笔记工具',
      description: '涵盖个人管理、项目管理、知识库、日程规划等 20+ 实用 Notion 模板。',
      tags: { notion: 'Notion', template: '模板', productivity: '生产力' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example5', psw: 'no23', size: '12 MB' },
      },
      images: [
        'https://picsum.photos/seed/notion1/800/600',
        'https://picsum.photos/seed/notion2/800/600',
      ],
      json_data: { rating: 4.3, platform: 'Notion', template_count: 22 },
    },
    {
      title: 'Raycast 效率插件包',
      category: '效率工具 > 自动化',
      description: '精心挑选的 Raycast 扩展集合，包含剪贴板管理、窗口管理、快捷搜索等。',
      tags: { raycast: 'Raycast', mac: 'Mac', launcher: '启动器' },
      source_links: {
        GitHub: { link: 'https://github.com/example/raycast-extensions', psw: '', size: '3 MB' },
      },
      images: ['https://picsum.photos/seed/raycast1/800/600'],
      json_data: { rating: 4.8, platform: 'macOS', extensions: 15 },
    },
    {
      title: '机器学习入门到精通',
      category: '学习资源 > 视频课程',
      description: '200 小时系统化机器学习课程，包含 Python/NumPy/Pandas/TensorFlow/PyTorch 完整学习路径。',
      tags: { ml: '机器学习', ai: '人工智能', python: 'Python' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example6', psw: 'ml01', size: '50 GB' },
      },
      images: ['https://picsum.photos/seed/ml1/800/600'],
      json_data: { rating: 4.9, hours: 200, level: '入门到精通', language: '中文' },
    },
    {
      title: 'TypeScript 编程手册（中文版）',
      category: '学习资源 > 电子书籍',
      description: '全面深入的 TypeScript 学习指南，从类型系统基础到高级模式，PDF + EPUB 双格式。',
      tags: { typescript: 'TypeScript', book: '书籍', programming: '编程' },
      source_links: {
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example4', psw: '', size: '45 MB' },
        百度网盘: { link: 'https://pan.baidu.com/s/1example7', psw: 'ts99', size: '45 MB' },
      },
      images: ['https://picsum.photos/seed/tsbook1/800/600'],
      json_data: { rating: 4.7, pages: 680, format: 'PDF/EPUB', author: '社区编译' },
    },
    {
      title: 'MDN Web 文档离线版',
      category: '学习资源 > 技术文档',
      description: 'MDN Web Docs 完整离线镜像，包含 HTML/CSS/JS/Web API 全部文档，支持全文搜索。',
      tags: { mdn: 'MDN', web: 'Web开发', docs: '文档' },
      source_links: {
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example5', psw: '', size: '2.8 GB' },
      },
      images: ['https://picsum.photos/seed/mdn1/800/600'],
      json_data: { rating: 4.8, format: 'HTML', language: '中英双语', version: '2024 Q4' },
    },
    {
      title: 'Stable Diffusion 模型合集',
      category: '人工智能 > AI 模型',
      description: '精选 SD 1.5 / SDXL / SD3 高清模型，涵盖写实、二次元、建筑、产品设计等风格。',
      tags: { sd: 'Stable Diffusion', model: '模型', artwork: '绘画' },
      source_links: {
        百度网盘: { link: 'https://pan.baidu.com/s/1example8', psw: 'sd99', size: '120 GB' },
      },
      images: [
        'https://picsum.photos/seed/sd1/800/600',
        'https://picsum.photos/seed/sd2/800/600',
        'https://picsum.photos/seed/sd3/800/600',
      ],
      json_data: { rating: 4.6, models: 45, base: 'SDXL/SD1.5', format: 'safetensors' },
    },
    {
      title: 'ChatGPT 提示词宝典',
      category: '人工智能 > AI 工具',
      description: '涵盖编程、写作、营销、设计、教育等 15 个领域的 500+ 优质提示词模板。',
      tags: { chatgpt: 'ChatGPT', prompt: '提示词', nlp: 'NLP' },
      source_links: {
        GitHub: { link: 'https://github.com/example/awesome-chatgpt-prompts', psw: '', size: '1 MB' },
      },
      images: ['https://picsum.photos/seed/chatgpt1/800/600'],
      json_data: { rating: 4.5, prompts_count: 520, categories: '15个领域', format: 'Markdown/JSON' },
    },
    {
      title: 'iOS 开发资源大全',
      category: '编程开发 > 移动开发',
      description: 'Swift/SwiftUI 学习路线、开源项目推荐和 App Store 上架经验总结。',
      tags: { ios: 'iOS', swift: 'Swift', mobile: '移动开发' },
      source_links: {
        GitHub: { link: 'https://github.com/example/ios-resources', psw: '', size: '5 MB' },
        百度网盘: { link: 'https://pan.baidu.com/s/1example9', psw: 'ios1', size: '2.5 GB' },
      },
      images: ['https://picsum.photos/seed/ios1/800/600'],
      json_data: { rating: 4.4, platform: 'macOS', language: 'Swift/SwiftUI' },
    },
    {
      title: '思源黑体 + 阿里巴巴普惠体',
      category: '设计素材 > 字体资源',
      description: '高质量开源中文字体合集，包含思源系列和阿里巴巴普惠体系列，适合商业项目。',
      tags: { font: '字体', design: '设计', chinese: '中文' },
      source_links: {
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example6', psw: '', size: '380 MB' },
      },
      images: ['https://picsum.photos/seed/fonts1/800/600'],
      json_data: { rating: 4.3, license: '开源免费', format: 'TTF/OTF', count: '12款字体' },
    },
    {
      title: '开源数据集精选集合',
      category: '人工智能 > 数据集',
      description: '覆盖 NLP、CV、语音识别等领域的高质量开源数据集，含预处理脚本和标注工具。',
      tags: { dataset: '数据集', ai: '人工智能', research: '研究' },
      source_links: {
        阿里云盘: { link: 'https://www.aliyundrive.com/s/example7', psw: '', size: '15 GB' },
        GoogleDrive: { link: 'https://drive.google.com/example', psw: '', size: '15 GB' },
      },
      images: ['https://picsum.photos/seed/dataset1/800/600'],
      json_data: { rating: 4.2, datasets_count: 30, domain: 'NLP/CV/ASR', format: 'JSON/CSV/Parquet' },
    },
  ];

  let inserted = 0;
  for (const tmpl of resourceTemplates) {
    const uuid = randomUUID();
    const now = new Date();
    const daysAgo = rand(0, 60);
    const createdAt = new Date(now.getTime() - daysAgo * 86400000);
    const updatedAt = new Date(createdAt.getTime() + rand(1, 30) * 86400000);

    const fullJsonData = {
      name: tmpl.title,
      category: tmpl.category,
      images: tmpl.images,
      tags: tmpl.tags,
      source_links: tmpl.source_links,
      uploaded: createdAt.getTime(),
      update_time: updatedAt.getTime(),
      introduction: tmpl.description,
      ...tmpl.json_data,
    };

    await db.query(
      `INSERT INTO resources (uuid, title, description, category, tags, source_links, images, json_data, sync_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)`,
      [
        uuid,
        tmpl.title,
        tmpl.description,
        tmpl.category,
        JSON.stringify(tmpl.tags),
        JSON.stringify(tmpl.source_links),
        JSON.stringify(tmpl.images),
        JSON.stringify(fullJsonData),
        createdAt,
        updatedAt,
      ]
    );
    console.log(`  ✓ ${tmpl.title}`);
    inserted++;
  }

  return inserted;
}

async function seedMediaFiles() {
  const db = await getDb();
  console.log('\nSeeding media files...');

  const { rows: resources } = await db.query('SELECT uuid FROM resources LIMIT 5');
  if (resources.length === 0) return;

  const media = [
    { bucket: 'records', key: 'screenshots/vscode-setup.png', name: 'vscode-setup.png', size: 245000, mime: 'image/png' },
    { bucket: 'records', key: 'screenshots/react-demo.jpg', name: 'react-demo.jpg', size: 512000, mime: 'image/jpeg' },
    { bucket: 'records', key: 'files/python-scripts.zip', name: 'python-scripts.zip', size: 8192000, mime: 'application/zip' },
    { bucket: 'records', key: 'files/notion-templates.zip', name: 'notion-templates.zip', size: 12288000, mime: 'application/zip' },
  ];

  for (let i = 0; i < media.length; i++) {
    const uuid = resources[i]?.uuid || resources[0].uuid;
    await db.query(
      `INSERT INTO media_files (resource_uuid, bucket_name, object_key, original_name, file_size, mime_type)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuid, media[i].bucket, media[i].key, media[i].name, media[i].size, media[i].mime]
    );
    console.log(`  ✓ ${media[i].name}`);
  }
}

async function main() {
  console.log('🌱 Starting database seed...\n');

  await clearRedisCache();
  await seedCategories();
  const count = await seedResources();
  await seedMediaFiles();

  console.log(`\n✅ Seed completed: 5 parent categories, ${count} resources with media files`);
  process.exit(0);
}

main().catch((error) => {
  console.error('❌ Seed failed:', error);
  process.exit(1);
});
