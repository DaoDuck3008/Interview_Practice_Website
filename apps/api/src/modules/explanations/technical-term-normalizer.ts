export function normalizeTechnicalTerm(value: string) {
  return value
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase('vi')
    .replace(/[\u200B-\u200D\uFEFF]/g, '')
    .replace(/[–—_]/g, '-')
    .replace(/\s*-\s*/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^[.,;:!?()[\]{}'"`]+|[.,;:!?()[\]{}'"`]+$/g, '');
}

export function normalizeSourceText(value: string) {
  return normalizeTechnicalTerm(value.replace(/[`*_~#>]/g, ' '));
}
