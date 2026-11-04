import { useEffect, useRef, useState } from 'react';
import { SPEEDS, THEME_LIST, type Speed, t } from '@flow-see/core';
import { importBackup, makeBackup } from '@flow-see/runtime/services/backup.ts';
import { saveFile } from '@flow-see/runtime/services/save.ts';
import {
  isSpeechSupported,
  listVoices,
  onVoicesChanged,
  speak,
} from '@flow-see/runtime/services/speech.ts';
import { repository } from '@flow-see/runtime/services/storage.ts';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import { site } from '../site';
import { TopBar } from '../ui/TopBar';
import ui from '@flow-see/runtime/ui/ui.module.css';
import s from './Pages.module.css';

const RATES = [
  { value: 0.8, label: t('settingsPage.man_yi_dian') },
  { value: 1, label: t('settingsPage.zheng_chang') },
  { value: 1.2, label: t('settingsPage.kuai_yi_dian') },
];

const UI_THEMES = [
  { id: 'light', name: t('settingsPage.qian_se') },
  { id: 'dark', name: t('settingsPage.shen_se') },
  { id: 'auto', name: t('settingsPage.gen_sui_xi_tong') },
] as const;

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
    const r = await saveFile(blob, t('settingsPage.backup_file', { name: site.site.name, date }));
    if (r !== 'cancelled')
      setDataMsg({ ok: true, text: t('settingsPage.exported', { n: all.length }) });
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const r = await importBackup(await file.text(), repository);
      setDataMsg({
        ok: true,
        text: t('settingsPage.imported', {
          added: r.added,
          updated: r.updated,
          skipped: r.skipped,
        }),
      });
    } catch (e) {
      setDataMsg({ ok: false, text: (e as Error).message });
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className={s.page}>
      <TopBar title={t('common.she_zhi')} />
      <main className={s.content}>
        <div className={s.settingsLayout}>
          <nav className={s.settingsNav} aria-label={t('settingsPage.she_zhi_fen_lei')}>
            <a href="#appearance">{t('settingsPage.wai_guan_yu_yu')}</a>
            <a href="#speech">{t('settingsPage.lang_du_yu_bo')}</a>
            <a href="#data">{t('settingsPage.shu_ju_yu_bei')}</a>
            <a href="#about">{t('settingsPage.guan_yu')}</a>
          </nav>

          <div className={s.settingsBody}>
            <section className={s.panel} id="appearance" aria-labelledby="h-appearance">
              <h2 className={s.panelTitle} id="h-appearance">
                {t('settingsPage.wai_guan_yu_yu')}
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>{t('settingsPage.jie_mian_zhu_ti')}</b>
                  <span>{t('settingsPage.qian_se_shen_se')}</span>
                </div>
                <div className={s.rowControls}>
                  {UI_THEMES.map((t) => (
                    <button
                      key={t.id}
                      className={s.themeChip}
                      aria-pressed={settings.uiTheme === t.id}
                      onClick={() => settings.set({ uiTheme: t.id })}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>{t('settingsPage.mo_ren_dong_hua')}</b>
                  <span>{t('settingsPage.xin_jian_dong_hua')}</span>
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
                  <label htmlFor="set-lang">{t('settingsPage.jie_mian_yu_yan')}</label>
                  <span>{t('settingsPage.tong_shi_jue_ding')}</span>
                </div>
                <select id="set-lang" className={s.select} value={settings.language} disabled>
                  <option value="zh-CN">{t('settingsPage.jian_ti_zhong_wen')}</option>
                </select>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b id="lbl-large">{t('settingsPage.da_zi_hao')}</b>
                  <span>{t('settingsPage.an_niu_he_wen')}</span>
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
                {t('settingsPage.lang_du_yu_bo')}
              </h2>
              {!speechOk ? (
                <div className={s.row}>
                  <span className={s.note}>{t('settingsPage.zhe_ge_liu_lan')}</span>
                </div>
              ) : null}
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b id="lbl-narrate">{t('common.zi_dong_lang_du')}</b>
                  <span>{t('settingsPage.bo_fang_shi_zi')}</span>
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
                  <label htmlFor="set-voice">{t('settingsPage.lang_du_sheng_yin')}</label>
                  <span>
                    {voices.length
                      ? t('settingsPage.voices_found', { n: voices.length })
                      : t('settingsPage.shi_yong_xi_tong')}
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
                    <option value="">{t('settingsPage.xi_tong_mo_ren')}</option>
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
                      speak(t('settingsPage.voice_sample', { name: site.site.name }), {
                        voiceURI: settings.voiceURI,
                        rate: settings.speechRate,
                      })
                    }
                  >
                    {t('settingsPage.shi_ting')}
                  </button>
                </div>
              </div>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <label htmlFor="set-rate">{t('settingsPage.lang_du_yu_su')}</label>
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
                  <label htmlFor="set-speed">{t('settingsPage.mo_ren_bo_fang')}</label>
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
                {t('settingsPage.shu_ju_yu_bei')}
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>{t('settingsPage.wo_de_zuo_pin')}</b>
                  <span>{t('settingsPage.ke_yi_dao_chu')}</span>
                </div>
                <div className={s.rowControls}>
                  <button className={ui.btn} onClick={exportBackup}>
                    {t('settingsPage.dao_chu_bei_fen')}
                  </button>
                  <button className={ui.btn} onClick={() => fileRef.current?.click()}>
                    {t('settingsPage.dao_ru')}
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
                {t('settingsPage.guan_yu')}
              </h2>
              <div className={s.row}>
                <div className={s.rowLabel}>
                  <b>{site.site.name}</b>
                  <span>{site.site.slogan}</span>
                </div>
                <span className={s.note}>
                  {t('settingsPage.version', { version: __APP_VERSION__ })}
                </span>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
