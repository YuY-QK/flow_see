import { useState } from 'react';
import ui from '@flow-see/runtime/ui/ui.module.css';
import { content, site } from '../site';
import { TopBar } from '../ui/TopBar';
import s from '../learn/Learn.module.css';
import p from './Pages.module.css';

function deviceInfo(): string {
  return [`网站：${site.site.name} ${__APP_VERSION__}`, `浏览器：${navigator.userAgent}`].join(
    '\n',
  );
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
      <TopBar title="帮助与反馈" />
      <main className={p.content}>
        <section className={p.section}>
          <h2 className={p.h2}>常见问题</h2>
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
            <h2 className={p.h2}>反馈</h2>
            <div className={s.contact}>
              {email ? (
                <div>
                  邮箱：<b>{email}</b>{' '}
                  <button className={ui.btn} onClick={() => onCopy('邮箱', email)}>
                    复制
                  </button>
                </div>
              ) : null}
              {wechat ? (
                <div>
                  微信：<b>{wechat}</b>{' '}
                  <button className={ui.btn} onClick={() => onCopy('微信', wechat)}>
                    复制
                  </button>
                </div>
              ) : null}
              <div>
                <button className={ui.btn} onClick={() => onCopy('设备信息', deviceInfo())}>
                  复制设备信息
                </button>
              </div>
              {copied ? (
                <p className={p.note} role="status">
                  已复制{copied}
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
          {site.site.name} · 版本 {__APP_VERSION__}
        </p>
      </main>
    </div>
  );
}
