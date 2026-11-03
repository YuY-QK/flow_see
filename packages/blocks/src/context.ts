import { createContext } from 'react';

/** 素材 id → 地址。由网站提供（来自 assets/manifest.yaml），零件里的 image 用它找图片。 */
export const AssetUrlContext = createContext<(id: string) => string | undefined>(() => undefined);
