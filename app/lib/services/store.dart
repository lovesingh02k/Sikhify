import 'site_api.dart';

/// The Sikh Store takes orders on WhatsApp (the website builds the same message in shared/store.js).
class Store {
  Store._();
  static const whatsapp = '919806249818';
  static const whatsappDisplay = '+91 98062 49818';
  static const type = 'product';
  static const maxQuantity = 20;

  /// 125000 → "₹1,25,000".
  static String price(num value) {
    final whole = value.abs().truncate().toString();
    final last3 = whole.length > 3 ? whole.substring(whole.length - 3) : whole;
    var rest = whole.length > 3 ? whole.substring(0, whole.length - 3) : '';
    final groups = <String>[];
    while (rest.length > 2) {
      groups.insert(0, rest.substring(rest.length - 2));
      rest = rest.substring(0, rest.length - 2);
    }
    if (rest.isNotEmpty) groups.insert(0, rest);
    final paise = value == value.truncate() ? '' : value.abs().toStringAsFixed(2).substring(whole.length);
    return '₹${[...groups, last3].join(',')}$paise';
  }

  static Uri _chat(String text) => Uri.parse('https://wa.me/$whatsapp?text=${Uri.encodeComponent(text)}');

  /// Opens a WhatsApp chat with this product's order already written.
  static Uri orderLink(Entry product, {String? option, int quantity = 1}) {
    final p = product.price;
    return _chat([
      'Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh 🙏',
      'I would like to order:',
      '',
      'Product: ${product.title}',
      if (option != null && option.isNotEmpty) 'Option: $option',
      'Quantity: $quantity',
      if (p != null) 'Price: ${price(p)} each',
      if (product.url.isNotEmpty) 'Link: ${SiteApi.base}${product.url}',
    ].join('\n'));
  }

  static Uri enquiryLink() => _chat('Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh 🙏\nI have a question about the Sikh Store.');
}

/// A store product's own fields.
extension ProductFields on Entry {
  num? get price => fields['price'] is num ? fields['price'] as num : null;

  /// The higher price shown crossed out, when there is one.
  num? get mrp {
    final m = fields['mrp'], p = price;
    return m is num && p != null && m > p ? m : null;
  }

  bool get inStock => fields['availability'] != 'Out of stock';
  List<String> get variants => ((fields['variants'] as List?) ?? const []).map((v) => '$v').toList();

  /// The main photo first, then the others, as full addresses.
  List<String> get pictures => {
        ?image,
        for (final p in (fields['photos'] as List?) ?? const []) '$p'.startsWith('/') ? '${SiteApi.base}$p' : '$p',
      }.toList();
}
