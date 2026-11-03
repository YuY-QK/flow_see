import { useEffect, useRef, useState } from 'react';
import type { Animation, ShareInfo } from '@/engine';
import { isNative, shareLinkNative } from '@/services/native';
import { copyText } from '@/services/save';
import { publishShare, shareUrl } from '@/services/share';
import { Dialog } from './Dialog';
import ui from './ui.module.css';
import s from './Panels.module.css';

type Props =
  | {
      /** 自己的作品：上传到服务器生成短链接 */
      mode: 'publish';
      animation: Animation;
      onShared(info: ShareInfo): void;
      onClose(): void;
    }
  | {
      /** 已有链接（广场作品等）：直接复制 */
      mode: 'link';
      url: string;
      title: string;
      onClose(): void;
    };

export function ShareDialog(props: Props) {
  const [url, setUrl] = useState<string | null>(props.mode === 'link' ? props.url : null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean | null>(null);
  const [attempt, setAttempt] = useState(0);

  const animation = props.mode === 'publish' ? props.animation : null;
  const onShared = props.mode === 'publish' ? props.onShared : null;

  // 每次打开（或点“重试”）只上传一次；开发模式下 effect 会执行两遍，用 ref 去重
  const startedFor = useRef(-1);
  useEffect(() => {
    if (!animation || !onShared || startedFor.current === attempt) return;
    startedFor.current = attempt;
    publishShare(animation)
      .then((info) => {
        onShared(info);
        setUrl(shareUrl(info.id));
      })
      .catch((e: Error) => setError(e.message));
    // 只在打开对话框（或点“重试”）时上传
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt]);

  const title = props.mode === 'publish' ? props.animation.title : props.title;
  const canNativeShare = isNative() || (typeof navigator !== 'undefined' && !!navigator.share);
  const nativeShare = (u: string) =>
    isNative()
      ? shareLinkNative(title, u).catch(() => {})
      : navigator.share({ title, url: u }).catch(() => {});

  return (
    <Dialog title="分享" onClose={props.onClose}>
      {error ? (
        <div className={s.error} role="alert">
          <p>{error}</p>
          <button
            className={ui.btn}
            onClick={() => {
              setError(null);
              setAttempt((n) => n + 1);
            }}
          >
            重试
          </button>
        </div>
      ) : !url ? (
        <p className={s.muted} aria-live="polite">
          正在生成分享链接…
        </p>
      ) : (
        <>
          <p className={s.muted}>
            {props.mode === 'publish'
              ? '拿到链接的人打开就能观看和操作。之后修改作品，再点一次分享就会更新这个链接的内容。'
              : '拿到链接的人打开就能观看。'}
          </p>
          <label className="sr-only" htmlFor="share-url">
            分享链接
          </label>
          <input
            id="share-url"
            className={ui.field}
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          {copied === false ? (
            <p className={s.muted}>浏览器不允许自动复制，请长按或选中上面的链接手动复制。</p>
          ) : null}
          <div className={s.actions}>
            {canNativeShare ? (
              <button className={ui.btn} onClick={() => nativeShare(url)}>
                用其他应用分享
              </button>
            ) : null}
            <button
              className={`${ui.btn} ${ui.primary}`}
              onClick={async () => setCopied(await copyText(url))}
            >
              {copied ? '已复制' : '复制链接'}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
