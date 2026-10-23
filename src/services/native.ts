// App（Capacitor）里的原生能力。网页版不会加载这些插件。
import { Capacitor } from '@capacitor/core';

export function isNative(): boolean {
  return Capacitor.isNativePlatform();
}

/** 安卓返回键：能后退就后退，否则退出 App */
export async function setupNative() {
  if (!isNative()) return;
  const { App } = await import('@capacitor/app');
  App.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) window.history.back();
    else App.exitApp();
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

/** 把文件写进缓存目录，再交给系统分享面板（可存到相册、发给好友等） */
export async function shareFileNative(blob: Blob, filename: string): Promise<void> {
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const { uri } = await Filesystem.writeFile({
    path: filename,
    data: await blobToBase64(blob),
    directory: Directory.Cache,
  });
  await Share.share({ title: filename, files: [uri] });
}

export async function shareLinkNative(title: string, url: string): Promise<void> {
  const { Share } = await import('@capacitor/share');
  await Share.share({ title, url });
}

/** 原生朗读：安卓 WebView 没有 speechSynthesis，用系统的文字转语音 */
export async function speakNative(text: string, rate: number, lang: string): Promise<void> {
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
  await TextToSpeech.speak({ text, rate, lang });
}

export async function stopSpeakingNative(): Promise<void> {
  const { TextToSpeech } = await import('@capacitor-community/text-to-speech');
  await TextToSpeech.stop();
}
