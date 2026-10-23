// 朗读：第一版使用浏览器自带的语音合成。

export interface SpeakHandle {
  /** 读完（或被取消、出错）时完成 */
  done: Promise<void>;
  cancel(): void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 可用的朗读声音（按语言过滤）；部分浏览器异步加载声音列表 */
export function listVoices(lang = 'zh'): SpeechSynthesisVoice[] {
  if (!isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
}

export function onVoicesChanged(cb: () => void): () => void {
  if (!isSpeechSupported()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

export function speak(
  text: string,
  opts: { rate?: number; lang?: string; voiceURI?: string } = {},
): SpeakHandle {
  if (!isSpeechSupported() || !text.trim()) {
    return { done: Promise.resolve(), cancel() {} };
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'zh-CN';
  u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
  if (opts.voiceURI) {
    const voice = synth.getVoices().find((v) => v.voiceURI === opts.voiceURI);
    if (voice) u.voice = voice;
  }

  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  // 部分浏览器偶尔不触发 onend，用按字数估算的超时兜底
  const fallback = window.setTimeout(finish, (text.length * 350) / u.rate + 3000);
  u.onend = u.onerror = () => {
    window.clearTimeout(fallback);
    finish();
  };
  synth.speak(u);

  return {
    done,
    cancel() {
      window.clearTimeout(fallback);
      u.onend = u.onerror = null;
      synth.cancel();
    },
  };
}
