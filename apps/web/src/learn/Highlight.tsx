import { highlightParts } from '@flow-see/content';
import s from './Learn.module.css';

/** 把命中搜索词的字高亮显示（搜索结果页） */
export function Highlight({ text, words }: { text: string; words?: string[] }) {
  if (!words?.length) return <>{text}</>;
  return (
    <>
      {highlightParts(text, words).map((p, i) =>
        p.hit ? (
          <mark key={i} className={s.mark}>
            {p.text}
          </mark>
        ) : (
          p.text
        ),
      )}
    </>
  );
}
