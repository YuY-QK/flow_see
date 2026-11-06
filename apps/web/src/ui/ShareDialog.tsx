import { useEffect, useRef, useState } from 'react';
import type { Animation, ShareInfo } from '@flow-see/core';
import { isNative, shareLinkNative } from '@flow-see/runtime/services/native.ts';
import { copyText } from '@flow-see/runtime/services/save.ts';
import { publishShare, shareUrl } from '@flow-see/runtime/services/share.ts';
import { Dialog } from './Dialog';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Panels.module.css';

import { t } from '@flow-see/core';
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
    <Dialog title={t('common.fen_xiang')} onClose={props.onClose}>
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
            {t('common.chong_shi')}
          </button>
        </div>
      ) : !url ? (
        <p className={s.muted} aria-live="polite">
          {t('shareDialog.zheng_zai_sheng_cheng')}
        </p>
      ) : (
        <>
          <p className={s.muted}>
            {props.mode === 'publish'
              ? t('shareDialog.na_dao_lian_jie')
              : t('shareDialog.na_dao_lian_jie_2')}
          </p>
          <label className="sr-only" htmlFor="share-url">
            {t('common.fen_xiang_lian_jie')}
          </label>
          <input
            id="share-url"
            className={ui.field}
            value={url}
            readOnly
            onFocus={(e) => e.target.select()}
          />
          {copied === false ? <p className={s.muted}>{t('shareDialog.liu_lan_qi_bu')}</p> : null}
          <div className={s.actions}>
            {canNativeShare ? (
              <button className={ui.btn} onClick={() => nativeShare(url)}>
                {t('shareDialog.yong_qi_ta_ying')}
              </button>
            ) : null}
            <button
              className={`${ui.btn} ${ui.primary}`}
              onClick={async () => setCopied(await copyText(url))}
            >
              {copied ? t('shareDialog.yi_fu_zhi') : t('common.fu_zhi_lian_jie')}
            </button>
          </div>
        </>
      )}
    </Dialog>
  );
}
