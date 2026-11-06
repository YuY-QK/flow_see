import { useState } from 'react';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { content, site } from '../site';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

import { t } from '@flow-see/core';
function deviceInfo(): string {
  return [
    t('helpPage.device_site', { name: site.site.name, version: __APP_VERSION__ }),
    t('helpPage.device_browser', { ua: navigator.userAgent }),
  ].join('\n');
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** P7 帮助与反馈 /help：常见问题来自 help.yaml，联系方式来自 site.yaml */
export function HelpPage() {
  const { email, wechat } = site.contact;
  const [copied, setCopied] = useState('');
  const [manual, setManual] = useState('');

  const onCopy = async (label: string, text: string) => {
    if (await copy(text)) {
      setCopied(label);
      setManual('');
    } else {
      // 剪贴板不可用时，显示可手动选择的文本
      setManual(text);
    }
  };

  return (
    <div className={p.page}>
      <TopBar title={t('common.bang_zhu_yu_fan')} />
      <main className={p.content}>
        <section className={p.section}>
          <h2 className={p.h2}>{t('helpPage.chang_jian_wen_ti')}</h2>
          <div className={s.faq}>
            {content.help.faq.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {email || wechat ? (
          <section className={p.section}>
            <h2 className={p.h2}>{t('helpPage.fan_kui')}</h2>
            <div className={s.contact}>
              {email ? (
                <div>
                  {t('helpPage.you_xiang')}
                  <b>{email}</b>{' '}
                  <button
                    className={ui.btn}
                    onClick={() => onCopy(t('helpPage.you_xiang_2'), email)}
                  >
                    {t('helpPage.fu_zhi')}
                  </button>
                </div>
              ) : null}
              {wechat ? (
                <div>
                  {t('helpPage.wei_xin')}
                  <b>{wechat}</b>{' '}
                  <button
                    className={ui.btn}
                    onClick={() => onCopy(t('helpPage.wei_xin_2'), wechat)}
                  >
                    {t('helpPage.fu_zhi')}
                  </button>
                </div>
              ) : null}
              <div>
                <button
                  className={ui.btn}
                  onClick={() => onCopy(t('helpPage.she_bei_xin_xi'), deviceInfo())}
                >
                  {t('helpPage.fu_zhi_she_bei')}
                </button>
              </div>
              {copied ? (
                <p className={p.note} role="status">
                  {t('helpPage.copied', { what: copied })}
                </p>
              ) : null}
              {manual ? (
                <textarea
                  className={ui.field}
                  readOnly
                  rows={3}
                  value={manual}
                  onFocus={(e) => e.target.select()}
                />
              ) : null}
            </div>
          </section>
        ) : null}

        <p className={p.note}>
          {t('helpPage.version', { name: site.site.name, version: __APP_VERSION__ })}
        </p>
      </main>
    </div>
  );
}
