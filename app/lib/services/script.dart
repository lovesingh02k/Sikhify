/// Gurmukhi → Devanagari, for sharing Gurbani in Hindi script when BaniDB's own Devanagari
/// isn't available (e.g. a Hukamnama typed in by a Sikhify admin).
///
/// The two Unicode blocks are laid out in parallel (ਕ U+0A15 ↔ क U+0915), so most letters move
/// across by a fixed offset. The few Gurmukhi-only signs are handled on their own:
/// ੴ keeps its own sign, tippi ੰ becomes anusvara ं, and addak ੱ doubles the next consonant.
String toDevanagari(String gurmukhi) {
  final out = StringBuffer();
  final chars = gurmukhi.runes.toList();
  for (var i = 0; i < chars.length; i++) {
    final c = chars[i];
    if (c == 0x0A74) {
      out.write('ੴ'); // Ik Onkar keeps its own sign, as in BaniDB's Devanagari
    } else if (c == 0x0A70) {
      out.write('ं'); // tippi
    } else if (c == 0x0A71) {
      // addak: the following consonant is doubled (ਪੱਤ → पत्त).
      final next = i + 1 < chars.length ? chars[i + 1] : 0;
      if (next >= 0x0A15 && next <= 0x0A39) out.writeCharCode(next - 0x0100);
      if (next >= 0x0A15 && next <= 0x0A39) out.write('्');
    } else if (c == 0x0A75) {
      out.write('्य'); // yakash
    } else if (c == 0x0A72 || c == 0x0A73) {
      // iri ੲ / ura ੳ carry a vowel sign; together they make the independent vowel (ੲਿ → इ, ੳੁ → उ).
      final next = i + 1 < chars.length ? chars[i + 1] : 0;
      final vowel = _carried[(c, next)];
      if (vowel != null) {
        out.write(vowel);
        i++;
      } else {
        out.writeCharCode(c == 0x0A72 ? 0x0907 : 0x0909);
      }
    } else if (c >= 0x0A00 && c <= 0x0A6F) {
      out.writeCharCode(c - 0x0100);
    } else {
      out.writeCharCode(c); // dandas ॥ । are shared; spaces, digits and Latin stay as they are
    }
  }
  return out.toString();
}

const _carried = {
  (0x0A72, 0x0A3F): 'इ', (0x0A72, 0x0A40): 'ई', (0x0A72, 0x0A47): 'ए', (0x0A72, 0x0A48): 'ऐ',
  (0x0A73, 0x0A41): 'उ', (0x0A73, 0x0A42): 'ऊ', (0x0A73, 0x0A4B): 'ओ',
};
