// filters/normalizer.js
// Normaliza reglas: elimina duplicados, convierte a minúsculas, etc.

export class FilterNormalizer {
  normalizeLine(line) {
    let normalized = line.toLowerCase();
    // Eliminar espacios alrededor de ##
    normalized = normalized.replace(/\s*##\s*/, '##');
    return normalized;
  }

  normalizeArray(lines) {
    const set = new Set();
    for (const line of lines) {
      const n = this.normalizeLine(line);
      if (n) set.add(n);
    }
    return [...set];
  }
}