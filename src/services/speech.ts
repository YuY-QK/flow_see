// 朗读：第一版使用浏览器自带的语音合成。

export interface SpeakHandle {
  /** 读完（或被取消、出错）时完成 */
  done: Promise<void>;
  cancel(): void;
}

export function isSpeechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text: string, opts: { rate?: number; lang?: string } = {}): SpeakHandle {
  if (!isSpeechSupported() || !text.trim()) {
    return { done: Promise.resolve(), cancel() {} };
  }
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = opts.lang ?? 'zh-CN';
  u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));

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
