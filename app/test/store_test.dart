import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:sikhify/screens/store.dart';
import 'package:sikhify/services/settings.dart';
import 'package:sikhify/services/site_api.dart';
import 'package:sikhify/services/store.dart';

Entry product(Map<String, dynamic> fields, {String image = ''}) => Entry.fromJson({
      'type': 'product',
      'slug': 'steel-kara',
      'title': 'Steel Kara & Box',
      'category': 'Kara',
      'imageUrl': image,
      'fields': fields,
      'url': '/sikh-store/steel-kara',
    });

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    SharedPreferences.setMockInitialValues({});
    await Settings.load();
  });

  test('prices use Indian digit grouping', () {
    expect(Store.price(499), '₹499');
    expect(Store.price(1250), '₹1,250');
    expect(Store.price(125000), '₹1,25,000');
    expect(Store.price(12345678), '₹1,23,45,678');
    expect(Store.price(99.5), '₹99.50');
  });

  test('the order opens a chat with the store number and the whole order written', () {
    final link = Store.orderLink(product({'price': 499}), option: 'Medium', quantity: 2);
    expect(link.host, 'wa.me');
    expect(link.path, '/919806249818');
    expect(link.toString(), isNot(contains('+')), reason: 'spaces must not turn into plus signs');
    final text = link.queryParameters['text']!;
    for (final line in ['Product: Steel Kara & Box', 'Option: Medium', 'Quantity: 2', 'Price: ₹499 each', 'Link: https://www.sikhify.in/sikh-store/steel-kara']) {
      expect(text, contains(line));
    }
    expect(Store.orderLink(product({'price': 499})).queryParameters['text'], isNot(contains('Option:')));
  });

  test('product fields: crossed-out price, stock, options and photos', () {
    final p = product({'price': 499, 'mrp': 599, 'availability': 'In stock', 'variants': ['Small', 'Medium'], 'photos': ['/uploads/a.webp', '/uploads/b.webp']}, image: '/uploads/a.webp');
    expect(p.mrp, 599);
    expect(p.inStock, isTrue);
    expect(p.variants, ['Small', 'Medium']);
    expect(p.pictures, ['https://www.sikhify.in/uploads/a.webp', 'https://www.sikhify.in/uploads/b.webp']);
    expect(product({'price': 499, 'mrp': 499}).mrp, isNull);
    expect(product({'availability': 'Out of stock'}).inStock, isFalse);
  });

  // A tall phone screen, so the whole page is built at once.
  void tallScreen(WidgetTester tester) {
    tester.view.physicalSize = const Size(400, 1600);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);
  }

  testWidgets('a product page offers its options, quantity and the order button', (tester) async {
    tallScreen(tester);
    await tester.pumpWidget(MaterialApp(home: ProductScreen(product: product({'price': 499, 'availability': 'In stock', 'variants': ['Small', 'Medium']}))));
    expect(find.text('₹499'), findsOneWidget);
    expect(find.text('Medium'), findsOneWidget);
    expect(find.text('Order on WhatsApp'), findsOneWidget);
    await tester.tap(find.byIcon(Icons.add_rounded));
    await tester.pump();
    expect(find.text('2'), findsOneWidget);
  });

  testWidgets('an out-of-stock product can only be asked about', (tester) async {
    tallScreen(tester);
    await tester.pumpWidget(MaterialApp(home: ProductScreen(product: product({'price': 499, 'availability': 'Out of stock', 'variants': ['Small']}))));
    expect(find.text('Ask on WhatsApp'), findsOneWidget);
    expect(find.text('Order on WhatsApp'), findsNothing);
    expect(find.text('Small'), findsNothing);
  });
}
