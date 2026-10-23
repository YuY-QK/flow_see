const PATHS = {
  logo: 'M4 12h11M11 7l5 5-5 5',
  back: 'M14 5l-7 7 7 7',
  prev: 'M14 6l-6 6 6 6',
  next: 'M10 6l6 6-6 6',
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h3v14H7zM14 5h3v14h-3z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  trash: 'M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12',
  drag: 'M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01',
  sound: 'M4 10v4h4l5 4V6l-5 4zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11',
  mute: 'M4 10v4h4l5 4V6l-5 4zM17 9l4 6M21 9l-4 6',
  fullscreen: 'M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5',
  palette: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 3v18',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
  edit: 'M4 20h4L19 9l-4-4L4 16zM13 7l4 4',
  copy: 'M8 8h11v11H8zM5 16V5h11',
  menu: 'M4 7h16M4 12h16M4 17h16',
  search: 'M11 4a7 7 0 100 14 7 7 0 000-14zM16 16l4 4',
  grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
  settings:
    'M12 9a3 3 0 100 6 3 3 0 000-6zM12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1',
  share: 'M12 15V4M8 8l4-4 4 4M5 13v7h14v-7',
  download: 'M12 4v11M8 11l4 4 4-4M5 20h14',
  link: 'M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1',
  check: 'M5 12l5 5 9-10',
} as const;

export type IconName = keyof typeof PATHS;

const FILLED: IconName[] = ['play', 'pause'];

export function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const filled = FILLED.includes(name);
  const dotted = name === 'drag' || name === 'more';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth={dotted ? 3.5 : 2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
