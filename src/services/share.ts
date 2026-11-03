// 分享：把作品上传到服务端，得到短链接。没有账号时用“修改凭证”允许作者更新同一个链接。
import { migrate, type Animation, type ShareInfo } from '@/engine';

/** 接口地址；App 里需要设为服务器的完整地址 */
const API_BASE: string = import.meta.env.VITE_API_BASE ?? '';
/** 分享链接使用的网址；App 里 location.origin 不是公开网址，需单独配置 */
const SHARE_ORIGIN: string =
  import.meta.env.VITE_SHARE_ORIGIN ?? (typeof location !== 'undefined' ? location.origin : '');

export class ShareError extends Error {}

export function shareUrl(id: string): string {
  return `${SHARE_ORIGIN}/s/${id}`;
}

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/api${path}`, init);
  } catch {
    throw new ShareError('连不上分享服务，请检查网络后重试。');
  }
  // 服务端没有运行时，开发服务器或静态托管可能返回网页而不是 JSON
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) throw new ShareError('分享服务暂时不可用。');
  return { res, body: await res.json() };
}

/** 第一次分享创建短链接；之后再分享会更新同一个链接的内容 */
export async function publishShare(animation: Animation): Promise<ShareInfo> {
  const payload = JSON.stringify({ animation });
  const headers: Record<string, string> = { 'content-type': 'application/json' };

  if (animation.share) {
    const { res } = await request(`/shares/${animation.share.id}`, {
      method: 'PUT',
      headers: { ...headers, authorization: `Bearer ${animation.share.token}` },
      body: payload,
    });
    if (res.ok) return { ...animation.share, sharedAt: Date.now() };
    // 链接已失效（例如服务器数据被清理）时重新创建
    if (res.status !== 404 && res.status !== 403)
      throw new ShareError('更新分享失败，请稍后重试。');
  }

  const { res, body } = await request('/shares', { method: 'POST', headers, body: payload });
  if (res.status === 413) throw new ShareError('作品太大，暂时无法分享。');
  if (!res.ok) throw new ShareError('分享失败，请稍后重试。');
  return { id: body.id, token: body.token, sharedAt: Date.now() };
}

export async function fetchShared(id: string): Promise<Animation | null> {
  const { res, body } = await request(`/shares/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new ShareError('读取分享内容失败，请稍后重试。');
  return migrate(body.animation);
}
