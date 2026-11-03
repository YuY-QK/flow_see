// 运行时配置：由应用（apps/web）启动时根据 site.yaml 注入。
// runtime 处在内容层之下，不能直接读取内容配置，所以通过这里传进来。
export interface RuntimeConfig {
  /** 网站名称：导出视频的署名、备份文件提示等 */
  siteName: string;
  /** 分享接口地址，如 /api 或 https://example.com/api */
  shareApiBase: string;
  /** 分享链接使用的网址（不含路径），如 https://example.com */
  shareOrigin: string;
}

let current: RuntimeConfig | undefined;

export function configureRuntime(config: RuntimeConfig): void {
  current = config;
}

export function runtimeConfig(): RuntimeConfig {
  if (!current) throw new Error('runtime 还没有配置：应用启动时要先调用 configureRuntime()');
  return current;
}
