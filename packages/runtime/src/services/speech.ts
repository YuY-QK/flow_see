// 朗读：网页用浏览器自带的语音合成；App 里用系统的文字转语音。
import { isNative, speakNative, stopSpeakingNative } from './native';
import { toSpeech, type ReadAsRule } from './readAs';
import { runtimeConfig } from '../config';

function currentReadAsRules(): ReadAsRule[] {
  try {
    return runtimeConfig().speech?.readAs ?? [];
  } catch {
    return [];
  }
}

export interface SpeakHandle {
  /** 读完（或被取消、出错）时完成 */
  done: Promise<void>;
  cancel(): void;
  /** 已经读到第几个字（浏览器报告的词边界；不支持时一直是 0） */
  spokenChars(): number;
}

export function isSpeechSupported(): boolean {
  if (isNative()) return true;
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

/** 可用的朗读声音（按语言过滤）；部分浏览器异步加载声音列表 */
export function listVoices(lang = 'zh'): SpeechSynthesisVoice[] {
  // App 里使用系统默认声音
  if (isNative() || !isSpeechSupported()) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.toLowerCase().startsWith(lang.toLowerCase()));
}

export function onVoicesChanged(cb: () => void): () => void {
  if (isNative() || !isSpeechSupported()) return () => {};
  window.speechSynthesis.addEventListener('voiceschanged', cb);
  return () => window.speechSynthesis.removeEventListener('voiceschanged', cb);
}

export function speak(
  text: string,
  opts: { rate?: number; lang?: string; voiceURI?: string; rules?: ReadAsRule[] } = {},
): SpeakHandle {
  const rules = opts.rules ?? currentReadAsRules();
  const spokenText = toSpeech(text, rules);
  if (!isSpeechSupported() || !spokenText.trim()) {
    return { done: Promise.resolve(), cancel() {}, spokenChars: () => 0 };
  }
  if (isNative()) return speakWithNative(spokenText, opts);
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(spokenText);
  u.lang = opts.lang ?? 'zh-CN';
  u.rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
  if (opts.voiceURI) {
    const voice = synth.getVoices().find((v) => v.voiceURI === opts.voiceURI);
    if (voice) u.voice = voice;
  }

  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  // 部分浏览器偶尔不触发 onend，用按字数估算的超时兜底
  const fallback = window.setTimeout(finish, (spokenText.length * 350) / u.rate + 3000);
  let spoken = 0;
  u.onboundary = (e) => {
    spoken = Math.max(spoken, e.charIndex);
  };
  u.onend = u.onerror = () => {
    window.clearTimeout(fallback);
    spoken = spokenText.length;
    finish();
  };
  synth.speak(u);

  return {
    done,
    spokenChars: () => spoken,
    cancel() {
      window.clearTimeout(fallback);
      u.onend = u.onerror = null;
      synth.cancel();
    },
  };
}

function speakWithNative(text: string, opts: { rate?: number; lang?: string }): SpeakHandle {
  const rate = Math.min(2, Math.max(0.5, opts.rate ?? 1));
  let finish!: () => void;
  const done = new Promise<void>((resolve) => (finish = resolve));
  const fallback = window.setTimeout(finish, (text.length * 350) / rate + 3000);
  speakNative(text, rate, opts.lang ?? 'zh-CN')
    .catch(() => {})
    .finally(() => {
      window.clearTimeout(fallback);
      finish();
    });
  return {
    done,
    spokenChars: () => 0,
    cancel() {
      window.clearTimeout(fallback);
      void stopSpeakingNative().catch(() => {});
    },
  };
}
