// 分享：把作品上传到服务端，得到短链接。没有账号时用“修改凭证”允许作者更新同一个链接。
import { runtimeConfig } from '../config';
import { migrate, type Animation, type ShareInfo, t } from '@flow-see/core';

export class ShareError extends Error {}

export function shareUrl(id: string): string {
  return `${runtimeConfig().shareOrigin}/s/${id}`;
}

async function request(path: string, init?: RequestInit) {
  let res: Response;
  try {
    res = await fetch(`${runtimeConfig().shareApiBase}${path}`, init);
  } catch {
    throw new ShareError(t('share.lian_bu_shang_fen'));
  }
  // 服务端没有运行时，开发服务器或静态托管可能返回网页而不是 JSON
  const isJson = res.headers.get('content-type')?.includes('application/json');
  if (!isJson) throw new ShareError(t('share.fen_xiang_fu_wu'));
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
      throw new ShareError(t('share.geng_xin_fen_xiang'));
  }

  const { res, body } = await request('/shares', { method: 'POST', headers, body: payload });
  if (res.status === 413) throw new ShareError(t('share.zuo_pin_tai_da'));
  if (!res.ok) throw new ShareError(t('share.fen_xiang_shi_bai'));
  return { id: body.id, token: body.token, sharedAt: Date.now() };
}

export async function fetchShared(id: string): Promise<Animation | null> {
  const { res, body } = await request(`/shares/${encodeURIComponent(id)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new ShareError(t('share.du_qu_fen_xiang'));
  return migrate(body.animation);
}
