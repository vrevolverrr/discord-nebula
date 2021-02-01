export function hash(string_to_hash: string): number {
    /**
     * @param {string} string_to_hash - The string to generate a hash code
     * @returns {number} - The hash code of given string
     */
    var hash = 0, i, chr;
    for (i = 0; i < string_to_hash.length; i++) {
      chr = string_to_hash.charCodeAt(i);
      hash = ((hash << 5) - hash) + chr;
      hash |= 0;
    }

    return hash;
}

export function validateColor(hexColor: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(hexColor);
}