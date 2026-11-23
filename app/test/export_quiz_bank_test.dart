// Writes the website's copy of the Daily Quiz questions: `flutter test --tags export` (skipped otherwise).
@Tags(['export'])
library;

import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/services/i18n.dart';
import 'package:sikhify/services/library.dart';
import 'package:sikhify/services/quiz.dart';
import 'package:sikhify/services/settings.dart';

import 'quiz_bank_export.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('export the quiz bank for the website', () async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
    await Library.load();
    await I18n.instance.load();
    await Quiz.load();
    final bank = quizBankForWebsite();
    File(websiteBankPath).writeAsStringSync('${const JsonEncoder.withIndent(null).convert(bank)}\n');
    // ignore: avoid_print
    print('${(bank['questions'] as List).length} questions written to $websiteBankPath');
  });
}
