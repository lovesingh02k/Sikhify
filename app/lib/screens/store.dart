import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../services/i18n.dart';
import '../services/site_api.dart';
import '../services/store.dart';
import '../theme.dart';
import '../widgets/gurbani_view.dart' show ErrorView;

const _whatsappGreen = Color(0xFF0B7A53);

/// Opens WhatsApp, or says which number to message when it can't be opened.
Future<void> _openChat(BuildContext context, Uri link) async {
  final messenger = ScaffoldMessenger.of(context);
  final message = '${tr('Couldn’t open WhatsApp. Message us on')} ${Store.whatsappDisplay}';
  try {
    if (await launchUrl(link, mode: LaunchMode.externalApplication)) return;
  } catch (_) {}
  messenger.showSnackBar(SnackBar(content: Text(message)));
}

/// The products published on sikhify.in, filtered by category.
class StoreScreen extends StatefulWidget {
  const StoreScreen({super.key});

  @override
  State<StoreScreen> createState() => _StoreScreenState();
}

class _StoreScreenState extends State<StoreScreen> {
  final _items = <Entry>[];
  late Future<List<String>> _categories = SiteApi.instance.entryCategories(Store.type);
  String? _category;
  String? _error;
  bool _loading = true;
  int _page = 0, _pages = 1;

  @override
  void initState() {
    super.initState();
    _load(reset: true);
  }

  Future<void> _load({bool reset = false}) async {
    final category = _category;
    setState(() {
      _loading = true;
      _error = null;
      if (reset) {
        _items.clear();
        _page = 0;
      }
    });
    try {
      final next = await SiteApi.instance.entries(Store.type, category: category, page: _page + 1);
      if (!mounted || category != _category) return;
      setState(() {
        _items.addAll(next.items);
        _page = next.page;
        _pages = next.pages;
        _loading = false;
      });
    } catch (e) {
      if (!mounted || category != _category) return;
      setState(() {
        _error = '$e';
        _loading = false;
      });
    }
  }

  Future<void> _refresh() async {
    setState(() => _categories = SiteApi.instance.entryCategories(Store.type));
    await _load(reset: true);
  }

  void _choose(String? category) {
    _category = category;
    _load(reset: true);
  }

  @override
  Widget build(BuildContext context) {
    // Room for two lines of name and the price, at the phone's text size.
    final cardHeight = 150 + MediaQuery.textScalerOf(context).scale(104);
    return Scaffold(
      appBar: AppBar(title: Text(tr('Sikh Store'))),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
          Text(tr('Choose a product and order directly on WhatsApp.'), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
          const SizedBox(height: 10),
          FutureBuilder<List<String>>(
            future: _categories,
            builder: (context, s) => (s.data ?? const []).isEmpty
                ? const SizedBox.shrink()
                : Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: SizedBox(
                      height: 40,
                      child: ListView(scrollDirection: Axis.horizontal, children: [
                        for (final c in [null, ...s.data!])
                          Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(c ?? tr('All')), selected: _category == c, showCheckmark: false, onSelected: (_) => _choose(c))),
                      ]),
                    ),
                  ),
          ),
          if (_items.isNotEmpty)
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: _items.length,
              gridDelegate: SliverGridDelegateWithMaxCrossAxisExtent(maxCrossAxisExtent: 240, mainAxisExtent: cardHeight, mainAxisSpacing: 12, crossAxisSpacing: 12),
              itemBuilder: (context, i) => ProductCard(product: _items[i]),
            ),
          if (_error != null)
            ErrorView(message: _error!, onRetry: () => _load(reset: _items.isEmpty))
          else if (_loading)
            const Padding(padding: EdgeInsets.all(32), child: Center(child: CircularProgressIndicator()))
          else if (_items.isEmpty)
            _EmptyStore(filtered: _category != null)
          else if (_page < _pages)
            Padding(padding: const EdgeInsets.only(top: 14), child: OutlinedButton(onPressed: _load, child: Text(tr('Show more')))),
        ]),
      ),
    );
  }
}

class _EmptyStore extends StatelessWidget {
  const _EmptyStore({required this.filtered});
  final bool filtered;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.symmetric(vertical: 32, horizontal: 12),
        child: Column(children: [
          const Icon(Icons.storefront_rounded, size: 48, color: Brand.goldDark),
          const SizedBox(height: 10),
          Text(tr(filtered ? 'Nothing here yet.' : 'Products are being added'), textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
          const SizedBox(height: 14),
          TextButton.icon(onPressed: () => _openChat(context, Store.enquiryLink()), icon: const Icon(Icons.chat_rounded), label: Text(tr('Ask on WhatsApp'))),
        ]),
      );
}

class _Price extends StatelessWidget {
  const _Price({required this.product, this.size = 16});
  final Entry product;
  final double size;

  @override
  Widget build(BuildContext context) {
    final p = product.price, m = product.mrp;
    if (p == null) return const SizedBox.shrink();
    return Wrap(crossAxisAlignment: WrapCrossAlignment.center, spacing: 6, children: [
      Text(Store.price(p), style: TextStyle(fontSize: size, fontWeight: FontWeight.w800)),
      if (m != null)
        Text(Store.price(m), style: TextStyle(fontSize: size * 0.8, decoration: TextDecoration.lineThrough, color: Theme.of(context).colorScheme.onSurfaceVariant)),
    ]);
  }
}

class _NoPhoto extends StatelessWidget {
  const _NoPhoto();

  @override
  Widget build(BuildContext context) => const DecoratedBox(
        decoration: BoxDecoration(gradient: Brand.nightGradient),
        child: Center(child: Icon(Icons.storefront_rounded, color: Brand.gold, size: 44)),
      );
}

class ProductCard extends StatelessWidget {
  const ProductCard({super.key, required this.product});
  final Entry product;

  @override
  Widget build(BuildContext context) {
    final p = product;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ProductScreen(product: p))),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          SizedBox(
            height: 150,
            width: double.infinity,
            child: Stack(fit: StackFit.expand, children: [
              if (p.image != null) Pic(p.image!, radius: 0) else const _NoPhoto(),
              if (!p.inStock) const Positioned(left: 8, top: 8, child: _OutOfStock()),
            ]),
          ),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(10, 8, 10, 8),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                if (p.category.isNotEmpty) Text(p.category, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, color: Brand.goldDark, fontWeight: FontWeight.w700)),
                Text(p.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700, height: 1.25)),
                const Spacer(),
                _Price(product: p),
              ]),
            ),
          ),
        ]),
      ),
    );
  }
}

class _OutOfStock extends StatelessWidget {
  const _OutOfStock();

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        decoration: BoxDecoration(color: Brand.navyDeep.withValues(alpha: 0.88), borderRadius: BorderRadius.circular(12)),
        child: Text(tr('Out of stock'), style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w700)),
      );
}

/// One product: its photos, price, size and quantity, and the WhatsApp order button.
class ProductScreen extends StatefulWidget {
  const ProductScreen({super.key, required this.product});
  final Entry product;

  @override
  State<ProductScreen> createState() => _ProductScreenState();
}

class _ProductScreenState extends State<ProductScreen> {
  late String? _option = widget.product.variants.firstOrNull;
  int _quantity = 1, _photo = 0;

  @override
  Widget build(BuildContext context) {
    final p = widget.product;
    final pictures = p.pictures;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Sikh Store'))),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
          child: FilledButton.icon(
            style: FilledButton.styleFrom(backgroundColor: _whatsappGreen, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(54)),
            onPressed: () => _openChat(context, p.inStock ? Store.orderLink(p, option: _option, quantity: _quantity) : Store.enquiryLink()),
            icon: const Icon(Icons.chat_rounded),
            label: Text(tr(p.inStock ? 'Order on WhatsApp' : 'Ask on WhatsApp')),
          ),
        ),
      ),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(18),
          child: AspectRatio(
            aspectRatio: 1,
            child: pictures.isEmpty
                ? const _NoPhoto()
                : PageView.builder(
                    itemCount: pictures.length,
                    onPageChanged: (i) => setState(() => _photo = i),
                    itemBuilder: (context, i) => Pic(pictures[i], radius: 0, fit: BoxFit.contain),
                  ),
          ),
        ),
        if (pictures.length > 1) ...[
          const SizedBox(height: 8),
          Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            for (var i = 0; i < pictures.length; i++)
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 3),
                width: i == _photo ? 18 : 7,
                height: 7,
                decoration: BoxDecoration(color: i == _photo ? Brand.gold : Brand.gold.withValues(alpha: 0.3), borderRadius: BorderRadius.circular(4)),
              ),
          ]),
        ],
        const SizedBox(height: 14),
        if (p.category.isNotEmpty) Text(p.category, style: const TextStyle(color: Brand.goldDark, fontWeight: FontWeight.w700)),
        Text(p.title, style: serif(25, color: Theme.of(context).colorScheme.onSurface)),
        const SizedBox(height: 8),
        _Price(product: p, size: 24),
        if (!p.inStock) ...[const SizedBox(height: 8), Text(tr('Out of stock'), style: TextStyle(color: Theme.of(context).colorScheme.error, fontWeight: FontWeight.w700))],
        if (p.summary.isNotEmpty) ...[const SizedBox(height: 10), Text(p.summary, style: const TextStyle(fontSize: 15, height: 1.5))],
        if (p.inStock && p.variants.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(tr('Size / option'), style: const TextStyle(fontWeight: FontWeight.w700)),
          const SizedBox(height: 6),
          Wrap(spacing: 8, runSpacing: 4, children: [
            for (final v in p.variants) ChoiceChip(label: Text(v), selected: _option == v, showCheckmark: false, onSelected: (_) => setState(() => _option = v)),
          ]),
        ],
        if (p.inStock) ...[
          const SizedBox(height: 16),
          Row(children: [
            Expanded(child: Text(tr('Quantity'), style: const TextStyle(fontWeight: FontWeight.w700))),
            IconButton.outlined(tooltip: tr('Less'), onPressed: _quantity > 1 ? () => setState(() => _quantity--) : null, icon: const Icon(Icons.remove_rounded)),
            SizedBox(width: 44, child: Text('$_quantity', textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800))),
            IconButton.outlined(tooltip: tr('More'), onPressed: _quantity < Store.maxQuantity ? () => setState(() => _quantity++) : null, icon: const Icon(Icons.add_rounded)),
          ]),
        ],
        const SizedBox(height: 12),
        Text('${tr('Price, delivery and payment are confirmed on WhatsApp:')} ${Store.whatsappDisplay}', style: TextStyle(fontSize: 13, height: 1.45, color: muted)),
        if (p.body.isNotEmpty) ...[
          const SizedBox(height: 18),
          Text(tr('Description'), style: sectionTitle(context)),
          const SizedBox(height: 6),
          Text(p.body, style: const TextStyle(fontSize: 15, height: 1.6)),
        ],
      ]),
    );
  }
}
