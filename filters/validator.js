// filters/validator.js
// Valida líneas de filtro (elimina comentarios, líneas vacías, etc.)

export class FilterValidator {
  validateLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('!')) return null;
    if (trimmed.startsWith('[')) return null;
    if (trimmed.length < 3) return null;
    return trimmed;
  }

  validateText(text) {
    const lines = text.split('\n');
    const valid = [];
    for (const line of lines) {
      const v = this.validateLine(line);
      if (v) valid.push(v);
    }
    return valid;
  }
}