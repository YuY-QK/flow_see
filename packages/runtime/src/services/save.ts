// 把生成的文件交给用户：App 里交给系统分享面板；手机浏览器优先用系统分享；否则直接下载。
import { isNative, shareFileNative } from './native';

export type SaveResult = 'shared' | 'downloaded' | 'cancelled';

export async function saveFile(blob: Blob, filename: string): Promise<SaveResult> {
  if (isNative()) {
    try {
      await shareFileNative(blob, filename);
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  const file = new File([blob], filename, { type: blob.type });
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  if (touch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
      // 分享失败时继续尝试下载
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return 'downloaded';
}

/** 复制文字；剪贴板不可用时返回 false，由界面提示用户手动复制 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
