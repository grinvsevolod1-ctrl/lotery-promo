// ICAO 9303 transliteration — the scheme Belarusian and Russian passports
// (and therefore the names embossed on bank cards) use.
const MAP: Record<string, string> = {
  а: "A", б: "B", в: "V", г: "G", д: "D", е: "E", ё: "E", ж: "ZH", з: "Z", и: "I", й: "I",
  к: "K", л: "L", м: "M", н: "N", о: "O", п: "P", р: "R", с: "S", т: "T", у: "U", ф: "F",
  х: "KH", ц: "TS", ч: "CH", ш: "SH", щ: "SHCH", ъ: "IE", ы: "Y", ь: "", э: "E", ю: "IU",
  я: "IA", і: "I", ў: "U",
}

export function transliterate(value: string) {
  return Array.from(value)
    .map((char) => {
      const mapped = MAP[char.toLowerCase()]
      return mapped ?? char
    })
    .join("")
}

/** Cardholder as the bank prints it: Latin capitals, spaces, apostrophe, hyphen. */
export function toCardholder(value: string) {
  return transliterate(value)
    .toUpperCase()
    .replace(/[^A-Z' -]/g, "")
    .replace(/\s{2,}/g, " ")
    .slice(0, 60)
}
