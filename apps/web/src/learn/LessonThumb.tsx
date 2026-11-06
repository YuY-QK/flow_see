// 知识点缩略图：用这个知识点自己的动画画面（配置里的 cover 指定哪一步、什么参数），
// 滚到可见时才加载；加载出来之前显示 cover.text（如“9 + 4”）或名称的第一个字。
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { AssetUrlContext } from '@flow-see/blocks';
import { getTheme } from '@flow-see/core';
import { lessonToAnimation, type CatalogLesson, type LessonContent } from '@flow-see/content';
import { useSettings } from '@flow-see/runtime/store/settings.ts';
import { getTemplate } from '@flow-see/templates';
import { assetUrl, loadLesson } from '../site';
import s from './Learn.module.css';

/** 进入可见区域后返回 true（只触发一次）；不支持 IntersectionObserver 时直接算可见 */
function useVisibleOnce(ref: React.RefObject<Element | null>): boolean {
  const [seen, setSeen] = useState(typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    const el = ref.current;
    if (seen || !el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: '120px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, seen]);
  return seen;
}

interface Props {
  lesson: CatalogLesson;
  /** 学科色（占位底色） */
  color?: string;
  /** 右下角叠加的内容（星星） */
  children?: ReactNode;
}

export function LessonThumb({ lesson, color, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const visible = useVisibleOnce(ref);
  const defaultTheme = useSettings((st) => st.defaultTheme);
  const [content, setContent] = useState<LessonContent | null>(null);

  useEffect(() => {
    if (!visible || !lesson.available) return;
    let alive = true;
    loadLesson(lesson.id)
      .then((l) => alive && setContent(l ?? null))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [visible, lesson.id, lesson.available]);

  const animation = useMemo(
    () =>
      content
        ? lessonToAnimation(content, { themeId: defaultTheme, params: content.cover?.params })
        : null,
    [content, defaultTheme],
  );
  const template = content ? getTemplate(content.template) : undefined;
  const Stage = template?.Stage;
  const index = content
    ? Math.min(content.cover?.step ?? content.steps.length, content.steps.length) - 1
    : 0;
  const theme = animation ? getTheme(animation.themeId) : undefined;
  const text = lesson.meta?.coverText ?? lesson.title.slice(0, 1);

  return (
    <div
      ref={ref}
      className={s.thumb}
      style={
        {
          ['--subject' as string]: color,
          background: theme?.stageBg,
        } as CSSProperties
      }
    >
      {animation && Stage && theme ? (
        <AssetUrlContext.Provider value={assetUrl}>
          <div className={s.thumbStage} aria-hidden>
            <Stage animation={animation} index={index} progress={1} theme={theme} still />
          </div>
        </AssetUrlContext.Provider>
      ) : (
        <span className={s.thumbText} aria-hidden>
          {text}
        </span>
      )}
      {children}
    </div>
  );
}
