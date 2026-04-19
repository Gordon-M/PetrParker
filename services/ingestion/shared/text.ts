export function decodeHtmlEntities(value: string): string {
  return value
    .replaceAll('&nbsp;', ' ')
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&apos;', "'")
    .replaceAll('&reg;', '®')
    .replaceAll('&mdash;', '-')
    .replaceAll('&ndash;', '-')
    .replaceAll('&rsquo;', "'")
    .replaceAll('&lsquo;', "'")
    .replaceAll('&rdquo;', '"')
    .replaceAll('&ldquo;', '"')
    .replaceAll('&ntilde;', 'ñ')
    .replaceAll('&aacute;', 'á')
    .replaceAll('&eacute;', 'é')
    .replaceAll('&iacute;', 'í')
    .replaceAll('&oacute;', 'ó')
    .replaceAll('&uacute;', 'ú')
    .replace(/&#x0*d;?/gi, ' ')
    .replace(/&#x0*a;?/gi, ' ')
    .replace(/&#13;?/gi, ' ')
    .replace(/&#10;?/gi, ' ');
}

export function stripTags(value: string): string {
  return value.replace(/<[^>]+>/g, ' ');
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function slugify(value: string): string {
  return normalizeWhitespace(value)
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
