import { describe, expect, it } from 'vitest';
import { findOfficial } from './official';
import { matches } from './search';

describe('广场搜索', () => {
  const tcp = findOfficial('official-tcp-handshake')!;
  it('按标题、分类、模板名、步骤标题匹配，不区分大小写', () => {
    expect(matches(tcp, 'tcp')).toBe(true);
    expect(matches(tcp, '网络协议')).toBe(true);
    expect(matches(tcp, '消息传递')).toBe(true);
    expect(matches(tcp, 'SYN')).toBe(true);
  });
  it('多个关键词需要同时满足；空关键词匹配全部', () => {
    expect(matches(tcp, 'tcp 握手')).toBe(true);
    expect(matches(tcp, 'tcp 排序')).toBe(false);
    expect(matches(tcp, '')).toBe(true);
  });
});
