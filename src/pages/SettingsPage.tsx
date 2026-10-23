import { useEffect, useRef, useState } from 'react';
import { SPEEDS, THEME_LIST, type Speed } from '@/engine';
import { importBackup, makeBackup } from '@/services/backup';
import { saveFile } from '@/services/save';
import { isSpeechSupported, listVoices, onVoicesChanged, speak } from '@/services/speech';
import { repository } from '@/services/storage';
import { useSettings } from '@/store/settings';
import { AppHeader } from '@/ui/AppHeader';
import ui from '@/ui/ui.module.css';
import s from './Pages.module.css';

const RATES = [
  { value: 0.8, label: '慢一点' },
  { value: 1, label: '正常' },
  { value: 1.2, label: '快一点' },
];

export function SettingsPage() {
  const settings = useSettings();
  const speechOk = isSpeechSupported();
  const [voices, setVoices] = useState(() => listVoices('zh'));
  const [dataMsg, setDataMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => onVoicesChanged(() => setVoices(listVoices('zh'))), []);

  // 支持从“我的作品”跳到 #data
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id) document.getElementById(id)?.scrollIntoView();
  }, []);

  const exportBackup = async () => {
    const all = await repository.list();
    const blob = new Blob([JSON.stringify(makeBackup(all), null, 1)], { type: 'application/json' });
    const date = new Date().toISOString().slice(0, 10);
    const r = await saveFile(blob, `动画流备份-${date}.json`);
    if (r !== 'cancelled') setDataMsg({ ok: true, text: `已导出 ${all.length} 个作品。` });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = await importBackup(await file.text(), repository);
      setDataMsg({
        ok: true,
        text: `导入完成：新增 ${r.added} 个，更新 ${r.updated} 个，跳过 ${r.skipped} 个。`,
      });
    } catch (e) {
      setDataMsg({ ok: false, text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={s.page}>
      <AppHeader />
      <main className={s.content}>
        <h1 className={s.h1}>设置</h1>
        <div className={s.settingsLayout}>
          <nav className={s.settingsNav} aria-label="设置分类">
            <a href="#appearance">外观与语言</a>
            <a href="#speech">朗读与播放</a>
            <a href="#data">数据与备份</a>
            <a href="#about">关于</a>
          </nav>

          <div className={s.settingsBody}>
            <section className={s.panel} id="appearance" aria-labelledby="h-appearance">
              <h2 className={s.panelTitle} id="h-appearance">
                外观与语言
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>默认动画主题</b>
                  <span>新建动画时使用；作者设置过的作品以作者为准</span>
                </div>
                <div className={s.rowControls}>
                  {THEME_LIST.map((t) => (
                    <button
                      key={t.id}
                      className={s.themeChip}
                      aria-pressed={settings.defaultTheme === t.id}
                      onClick={() => settings.set({ defaultTheme: t.id })}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <label htmlFor="set-lang">界面语言</label>
                  <span>同时决定朗读的语言</span>
                </div>
                <select id="set-lang" className={s.select} value={settings.language} disabled>
                  <option value="zh-CN">简体中文</option>
                </select>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b id="lbl-large">大字号</b>
                  <span>按钮和文字整体放大，适合小朋友或投影演示</span>
                </div>
                <button
                  className={ui.toggle}
                  role="switch"
                  aria-labelledby="lbl-large"
                  aria-checked={settings.largeText}
                  onClick={() => settings.set({ largeText: !settings.largeText })}
                />
              </div>
            </section>

            <section className={s.panel} id="speech" aria-labelledby="h-speech">
              <h2 className={s.panelTitle} id="h-speech">
                朗读与播放
              </h2>
              {!speechOk ? (
                <div className={s.row}>
                  <span className={s.note}>这个浏览器不支持朗读，播放时只显示字幕。</span>
                </div>
              ) : null}
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b id="lbl-narrate">自动朗读每一步</b>
                  <span>播放时自动读出每一步的说明</span>
                </div>
                <button
                  className={ui.toggle}
                  role="switch"
                  aria-labelledby="lbl-narrate"
                  aria-checked={settings.autoNarrate}
                  disabled={!speechOk}
                  onClick={() => settings.set({ autoNarrate: !settings.autoNarrate })}
                />
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <label htmlFor="set-voice">朗读声音</label>
                  <span>
                    {voices.length ? `找到 ${voices.length} 个中文声音` : '使用系统默认声音'}
                  </span>
                </div>
                <div className={s.rowControls}>
                  <select
                    id="set-voice"
                    className={s.select}
                    value={settings.voiceURI}
                    disabled={!speechOk}
                    onChange={(e) => settings.set({ voiceURI: e.target.value })}
                  >
                    <option value="">系统默认</option>
                    {voices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name}
                      </option>
                    ))}
                  </select>
                  <button
                    className={ui.btn}
                    disabled={!speechOk}
                    onClick={() =>
                      speak('你好，我是动画流的讲解员。', {
                        voiceURI: settings.voiceURI,
                        rate: settings.speechRate,
                      })
                    }
                  >
                    试听
                  </button>
                </div>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <label htmlFor="set-rate">朗读语速</label>
                </div>
                <select
                  id="set-rate"
                  className={s.select}
                  value={settings.speechRate}
                  disabled={!speechOk}
                  onChange={(e) => settings.set({ speechRate: Number(e.target.value) })}
                >
                  {RATES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <label htmlFor="set-speed">默认播放速度</label>
                </div>
                <select
                  id="set-speed"
                  className={s.select}
                  value={settings.defaultSpeed}
                  onChange={(e) => settings.set({ defaultSpeed: Number(e.target.value) as Speed })}
                >
                  {SPEEDS.map((sp) => (
                    <option key={sp} value={sp}>
                      {sp}×
                    </option>
                  ))}
                </select>
              </div>
            </section>

            <section className={s.panel} id="data" aria-labelledby="h-data">
              <h2 className={s.panelTitle} id="h-data">
                数据与备份
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>我的作品保存在这台设备上</b>
                  <span>可以导出成一个备份文件，在别的设备上导入</span>
                </div>
                <div className={s.rowControls}>
                  <button className={ui.btn} onClick={exportBackup}>
                    导出备份
                  </button>
                  <button className={ui.btn} onClick={() => fileRef.current?.click()}>
                    导入
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="application/json,.json"
                    hidden
                    onChange={(e) => onImport(e.target.files?.[0])}
                  />
                </div>
              </div>
              {dataMsg ? (
                <div className={s.row}>
                  <span
                    className={s.status}
                    style={dataMsg.ok ? undefined : { color: 'var(--danger)' }}
                    role="status"
                  >
                    {dataMsg.text}
                  </span>
                </div>
              ) : null}
            </section>

            <section className={s.panel} id="about" aria-labelledby="h-about">
              <h2 className={s.panelTitle} id="h-about">
                关于
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>动画流</b>
                  <span>把任何有流程的事物或原理，做成可以观察、可以操作的动画。</span>
                </div>
                <span className={s.note}>版本 {__APP_VERSION__}</span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
