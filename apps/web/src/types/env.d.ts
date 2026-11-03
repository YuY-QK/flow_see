/** 由 vite.config.ts 注入的版本号 */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 'memory'：内嵌预览用内存路由 */
  readonly VITE_ROUTER?: string;
  /** 分享接口地址（App 里需要设为服务器的完整地址） */
  readonly VITE_API_BASE?: string;
  /** 分享链接使用的公开网址 */
  readonly VITE_SHARE_ORIGIN?: string;
}
