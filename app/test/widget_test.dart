import 'package:flutter_test/flutter_test.dart';
import 'package:sikhify/models.dart';

void main() {
  test('BaniDB verses keep Gurmukhi and meanings; Raag headings are marked', () {
    final line = GurbaniLine.fromBaniDb({
      'verse': {'unicode': 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥'},
      'transliteration': {'english': 'aadh sach jugaadh sach ||'},
      'translation': {
        'en': {'bdb': 'True In The Primal Beginning.'},
        'pu': {'ss': {'unicode': 'ਮੁੱਢ ਤੋਂ ਹੋਂਦ ਵਾਲਾ'}},
        'hi': {'ss': 'आरम्भ से~ अस्तित्व'},
      },
    });
    expect(line.gurmukhi, 'ਆਦਿ ਸਚੁ ਜੁਗਾਦਿ ਸਚੁ ॥');
    expect(line.english, 'True In The Primal Beginning.');
    expect(line.hindi, 'आरम्भ से, अस्तित्व');
    expect(line.header, isFalse);
    expect(GurbaniLine.fromBaniDb({'verse': {'unicode': 'ਮਾਝ ਮਹਲਾ ੫ ॥'}}).header, isTrue);
  });
}
