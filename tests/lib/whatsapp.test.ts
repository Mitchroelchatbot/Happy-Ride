import { describe, expect, it } from 'vitest';
import { CONTACT } from '@/config';
import { whatsappUrl } from '@/lib/whatsapp';

describe('whatsappUrl', () => {
  it('zonder bericht', () => {
    expect(whatsappUrl()).toBe(`https://wa.me/${CONTACT.whatsapp}`);
  });
  it('met gecodeerd bericht', () => {
    expect(whatsappUrl('Hoi & tot zo')).toBe(`https://wa.me/${CONTACT.whatsapp}?text=Hoi%20%26%20tot%20zo`);
  });
});
