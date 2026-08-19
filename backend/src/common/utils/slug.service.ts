import { Injectable } from '@nestjs/common';

const CHAR_MAP: Record<string, string> = {
  à: 'a',
  á: 'a',
  â: 'a',
  ã: 'a',
  ä: 'a',
  å: 'a',
  æ: 'ae',
  ç: 'c',
  è: 'e',
  é: 'e',
  ê: 'e',
  ë: 'e',
  ì: 'i',
  í: 'i',
  î: 'i',
  ï: 'i',
  ñ: 'n',
  ò: 'o',
  ó: 'o',
  ô: 'o',
  õ: 'o',
  ö: 'o',
  œ: 'oe',
  ù: 'u',
  ú: 'u',
  û: 'u',
  ü: 'u',
  ý: 'y',
  ÿ: 'y',
};

@Injectable()
export class SlugService {
  slugify(input: string): string {
    const lowered = input.toLowerCase().trim();
    const mapped = lowered
      .split('')
      .map((ch) => CHAR_MAP[ch] ?? ch)
      .join('');

    return mapped
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-');
  }

  unique(base: string, existing: string[]): string {
    const slug = this.slugify(base);
    if (!existing.includes(slug)) {
      return slug;
    }
    let i = 2;
    while (existing.includes(`${slug}-${i}`)) {
      i += 1;
    }
    return `${slug}-${i}`;
  }
}
