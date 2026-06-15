// Unit test cho renderEmail/escapeHtml — hàm thuần (không gửi mạng, không DB)
// nên test thẳng như toSlug, không cần mock.
import { escapeHtml, renderEmail } from '../lib/email-templates';

describe('escapeHtml', () => {
  it('escape các ký tự HTML nguy hiểm (chống chèn thẻ)', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;',
    );
  });

  it('escape dấu & và nháy đơn', () => {
    expect(escapeHtml("Tom & Jerry's")).toBe('Tom &amp; Jerry&#39;s');
  });
});

describe('renderEmail', () => {
  it('chèn tiêu đề và nội dung vào layout', () => {
    const html = renderEmail({ title: 'Tieu de', heading: 'Xin chào', bodyHtml: '<p>Nội dung</p>' });
    expect(html).toContain('<title>Tieu de</title>');
    expect(html).toContain('Xin chào');
    expect(html).toContain('<p>Nội dung</p>');
  });

  it('render nút CTA khi có ĐỦ cả label lẫn url', () => {
    const html = renderEmail({
      title: 'T',
      heading: 'H',
      bodyHtml: '',
      ctaLabel: 'Bấm vào',
      ctaUrl: 'https://x.test/go',
    });
    expect(html).toContain('Bấm vào');
    expect(html).toContain('href="https://x.test/go"');
  });

  it('KHÔNG render nút CTA khi thiếu url', () => {
    const html = renderEmail({ title: 'T', heading: 'H', bodyHtml: '', ctaLabel: 'Bấm vào' });
    expect(html).not.toContain('Bấm vào');
  });

  it('escape heading do user nhập (chống chèn thẻ HTML)', () => {
    const html = renderEmail({ title: 'T', heading: '<b>hack</b>', bodyHtml: '' });
    expect(html).toContain('&lt;b&gt;hack&lt;/b&gt;');
    expect(html).not.toContain('<b>hack</b>');
  });

  it('giữ nguyên bodyHtml (nội dung hệ thống tự build → HTML tin cậy)', () => {
    const html = renderEmail({ title: 'T', heading: 'H', bodyHtml: '<strong>đậm</strong>' });
    expect(html).toContain('<strong>đậm</strong>');
  });
});
