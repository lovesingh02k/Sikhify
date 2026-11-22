import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/site_api.dart';
import '../theme.dart';
import '../widgets/gurbani_view.dart';
import '../services/quiz.dart';
import 'contribute.dart';
import 'quiz.dart';
import 'media.dart' show YouTubeButton, openVideo;

void _push(BuildContext context, Widget w) => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => w));
Future<void> openWeb(String url) => launchUrl(Uri.parse(url.startsWith('/') ? '${SiteApi.base}$url' : url), mode: LaunchMode.externalApplication);
Map<String, dynamic> _m(Object? o) => o is Map ? o.cast<String, dynamic>() : const {};

/* =========================================================================================
   Sikh History
   ========================================================================================= */
class HistoryScreen extends StatefulWidget {
  const HistoryScreen({super.key});
  @override
  State<HistoryScreen> createState() => _HistoryScreenState();
}

class _HistoryScreenState extends State<HistoryScreen> {
  String? _cat;

  @override
  Widget build(BuildContext context) {
    final h = Library.instance.history;
    final i = I18n.instance;
    final cats = (h['categories'] as List).cast<String>();
    final events = (h['events'] as List).map((e) => i.history(_m(e))).where((e) => _cat == null || (e['categories'] as List).contains(_cat)).toList();
    final figures = (h['figures'] as List).map((f) => i.figure(_m(f))).toList();
    final empire = {..._m(h['empire']), ...?i.empire};
    return DefaultTabController(
      length: 3,
      child: Scaffold(
        appBar: AppBar(
          title: Text(tr('Sikh History')),
          bottom: TabBar(indicatorColor: Brand.gold, labelColor: Theme.of(context).colorScheme.primary, tabs: [Tab(text: tr('Timeline')), Tab(text: tr('People')), Tab(text: tr('Sikh Empire'))]),
        ),
        body: TabBarView(children: [
          ListView(padding: const EdgeInsets.fromLTRB(16, 12, 16, 24), children: [
            SizedBox(
              height: 40,
              child: ListView(scrollDirection: Axis.horizontal, children: [
                for (final c in [null, ...cats])
                  Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(tr(c ?? 'All')), selected: _cat == c, showCheckmark: false, onSelected: (_) => setState(() => _cat = c))),
              ]),
            ),
            const SizedBox(height: 12),
            for (final e in events) _TimelineTile(e: e),
          ]),
          ListView(padding: const EdgeInsets.all(16), children: [
            for (final f in figures)
              Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(14),
                    child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      Text('${f['name']}', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w800)),
                      Text([f['role'], f['era']].whereType<String>().join(' · '), style: const TextStyle(color: Brand.goldDark, fontWeight: FontWeight.w600)),
                      const SizedBox(height: 6),
                      Text('${f['summary'] ?? ''}', style: const TextStyle(height: 1.5)),
                    ]),
                  ),
                ),
              ),
          ]),
          ListView(padding: const EdgeInsets.all(16), children: [
            const Pic('assets/images/harmandir.webp', height: 170, radius: 18, width: double.infinity),
            const SizedBox(height: 14),
            Text('${empire['intro'] ?? ''}', style: const TextStyle(fontSize: 15, height: 1.6)),
            const SizedBox(height: 14),
            for (final f in (empire['facts'] as List? ?? const []))
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  SizedBox(width: 120, child: Text('${_m(f)['label']}', style: const TextStyle(fontWeight: FontWeight.w800))),
                  Expanded(child: Text('${_m(f)['value']}')),
                ]),
              ),
            if ((empire['places'] as List? ?? const []).isNotEmpty) ...[
              const SizedBox(height: 10),
              for (final p in empire['places'] as List)
                Card(child: ListTile(title: Text('${_m(p)['name'] ?? p}', style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: _m(p)['text'] != null ? Text('${_m(p)['text']}') : null)),
            ],
          ]),
        ]),
      ),
    );
  }
}

class _TimelineTile extends StatelessWidget {
  const _TimelineTile({required this.e});
  final Map<String, dynamic> e;

  @override
  Widget build(BuildContext context) {
    final details = (e['details'] as List? ?? const []).cast<String>();
    final people = (e['people'] as List? ?? const []).cast<String>();
    return IntrinsicHeight(
      child: Row(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
        SizedBox(
          width: 64,
          child: Column(children: [
            Text('${e['year']}', textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w800, color: Brand.goldDark)),
            const SizedBox(height: 4),
            Expanded(child: Container(width: 2, color: Brand.gold.withValues(alpha: 0.4))),
          ]),
        ),
        Expanded(
          child: Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: ExpansionTile(
                shape: const Border(),
                title: Text('${e['title']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text([e['location'], e['summary']].whereType<String>().join('\n'), maxLines: 3, overflow: TextOverflow.ellipsis),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  for (final d in details) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(d, style: const TextStyle(height: 1.5))),
                  if (people.isNotEmpty) Text(people.join(' · '), style: const TextStyle(color: Brand.goldDark, fontWeight: FontWeight.w600)),
                ],
              ),
            ),
          ),
        ),
      ]),
    );
  }
}

/* =========================================================================================
   Rehat Maryada and FAQ
   ========================================================================================= */
class RehatScreen extends StatelessWidget {
  const RehatScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final r = Library.instance.rehat;
    final sections = (r['sections'] as List).map((s) => I18n.instance.rehat(_m(s))).toList();
    final official = _m(r['official']);
    return Scaffold(
      appBar: AppBar(title: Text(tr('Rehat Maryada'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        const Text('A plain-language guide to the Sikh code of conduct. It explains; it does not replace the official text.', style: TextStyle(height: 1.5)),
        const SizedBox(height: 8),
        TextButton.icon(onPressed: () => openWeb('${official['url']}'), icon: const Icon(Icons.open_in_new_rounded, size: 18), label: Text(tr('Official text (SGPC)'))),
        const SizedBox(height: 6),
        for (final s in sections)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: ExpansionTile(
                shape: const Border(),
                leading: const KhandaBadge(size: 36),
                title: Text('${s['title']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                subtitle: Text('${s['summary'] ?? ''}'),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                children: [for (final p in (s['paragraphs'] as List? ?? const [])) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text('$p', style: const TextStyle(height: 1.55)))],
              ),
            ),
          ),
      ]),
    );
  }
}

class FaqScreen extends StatefulWidget {
  const FaqScreen({super.key});
  @override
  State<FaqScreen> createState() => _FaqScreenState();
}

class _FaqScreenState extends State<FaqScreen> {
  String? _cat;
  String _q = '';

  @override
  Widget build(BuildContext context) {
    final f = Library.instance.faq;
    final cats = (f['categories'] as List).cast<String>();
    final items = (f['items'] as List).map((x) => I18n.instance.faq(_m(x))).where((x) {
      if (_cat != null && x['category'] != _cat) return false;
      final q = _q.toLowerCase();
      return q.isEmpty || '${x['q']} ${x['a']}'.toLowerCase().contains(q);
    }).toList();
    return Scaffold(
      appBar: AppBar(title: Text(tr('FAQ'))),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        TextField(
          onChanged: (v) => setState(() => _q = v),
          decoration: InputDecoration(hintText: tr('Search questions'), prefixIcon: const Icon(Icons.search_rounded), filled: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none)),
        ),
        const SizedBox(height: 10),
        SizedBox(
          height: 40,
          child: ListView(scrollDirection: Axis.horizontal, children: [
            for (final c in [null, ...cats])
              Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(tr(c ?? 'All')), selected: _cat == c, showCheckmark: false, onSelected: (_) => setState(() => _cat = c))),
          ]),
        ),
        const SizedBox(height: 12),
        if (items.isEmpty) Padding(padding: const EdgeInsets.all(24), child: Text(tr('Nothing here yet.'), textAlign: TextAlign.center)),
        for (final x in items)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(
              clipBehavior: Clip.antiAlias,
              child: ExpansionTile(
                shape: const Border(),
                title: Text('${x['q']}', style: const TextStyle(fontWeight: FontWeight.w700)),
                childrenPadding: const EdgeInsets.fromLTRB(16, 0, 16, 14),
                expandedCrossAxisAlignment: CrossAxisAlignment.start,
                children: [Text('${x['a']}', style: const TextStyle(height: 1.55))],
              ),
            ),
          ),
      ]),
    );
  }
}

/* =========================================================================================
   The Ten Gurus
   ========================================================================================= */
class GurusScreen extends StatelessWidget {
  const GurusScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final gurus = Library.instance.gurus.map(I18n.instance.guru).toList();
    return Scaffold(
      appBar: AppBar(title: Text(tr('The Ten Gurus'))),
      body: GridView.builder(
        padding: const EdgeInsets.all(16),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, mainAxisSpacing: 12, crossAxisSpacing: 12, childAspectRatio: 0.72),
        itemCount: gurus.length,
        itemBuilder: (context, i) {
          final g = gurus[i];
          return Card(
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => _push(context, GuruScreen(guru: g)),
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Expanded(
                  child: Stack(fit: StackFit.expand, children: [
                    if (g.art != null) Pic(g.art!, radius: 0) else Container(decoration: const BoxDecoration(gradient: Brand.nightGradient), padding: const EdgeInsets.all(40), child: Image.asset('assets/images/khanda.png')),
                    Positioned(
                      left: 8, top: 8,
                      child: CircleAvatar(radius: 14, backgroundColor: Brand.navy, child: Text('${g.number}', style: const TextStyle(color: Brand.gold, fontWeight: FontWeight.w800, fontSize: 13))),
                    ),
                  ]),
                ),
                Padding(
                  padding: const EdgeInsets.fromLTRB(10, 8, 10, 10),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(g.name, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                    Text(g.lifespan, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ]),
                ),
              ]),
            ),
          );
        },
      ),
    );
  }
}

class GuruScreen extends StatelessWidget {
  const GuruScreen({super.key, required this.guru});
  final Guru guru;

  @override
  Widget build(BuildContext context) {
    final g = guru;
    Widget list(String title, List<String> items) => items.isEmpty
        ? const SizedBox.shrink()
        : Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            const SizedBox(height: 18),
            Text(title, style: sectionTitle(context)),
            const SizedBox(height: 6),
            for (final x in items)
              Padding(
                padding: const EdgeInsets.only(top: 6),
                child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  const Padding(padding: EdgeInsets.only(top: 8), child: Icon(Icons.circle, size: 7, color: Brand.gold)),
                  const SizedBox(width: 10),
                  Expanded(child: Text(x, style: const TextStyle(height: 1.5))),
                ]),
              ),
          ]);
    return Scaffold(
      body: CustomScrollView(slivers: [
        SliverAppBar(
          pinned: true,
          expandedHeight: 320,
          foregroundColor: Colors.white,
          backgroundColor: Brand.navy,
          flexibleSpace: FlexibleSpaceBar(
            background: Stack(fit: StackFit.expand, children: [
              if (g.art != null) Pic(g.art!, radius: 0, alignment: const Alignment(0, -0.3)) else const DecoratedBox(decoration: BoxDecoration(gradient: Brand.nightGradient)),
              const DecoratedBox(decoration: BoxDecoration(gradient: LinearGradient(begin: Alignment.topCenter, end: Alignment.bottomCenter, colors: [Color(0x330B1A33), Color(0xEE0B1A33)]))),
              Positioned(
                left: 20, right: 20, bottom: 18,
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(g.name, style: serif(28, color: Colors.white)),
                  if (g.gurmukhi != g.name) Text(g.gurmukhi, style: const TextStyle(color: Brand.gold, fontSize: 18, fontWeight: FontWeight.w600)),
                  Text('${g.lifespan} · ${g.guruship}', style: const TextStyle(color: Colors.white70)),
                ]),
              ),
            ]),
          ),
        ),
        SliverPadding(
          padding: const EdgeInsets.fromLTRB(20, 18, 20, 32),
          sliver: SliverList.list(children: [
            Text(tr('Biography'), style: sectionTitle(context)),
            const SizedBox(height: 6),
            Text(g.bio, style: const TextStyle(fontSize: 15, height: 1.6)),
            if (g.birthplace.isNotEmpty) ...[const SizedBox(height: 8), Text('📍 ${g.birthplace}', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant))],
            list(tr('Contributions'), g.contributions),
            list(tr('Teachings'), g.teachings),
            list(tr('Life events'), g.events),
            if (g.art != null) ...[
              const SizedBox(height: 18),
              Text('The painting is a historical artistic depiction from a museum collection, made after the Guru’s lifetime — not a portrait from life.',
                  style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ],
          ]),
        ),
      ]),
    );
  }
}

/* =========================================================================================
   Kids — Learn Sikhi (as on sikhify.in/kids)
   ========================================================================================= */
const _letters = [
  ('ੳ', 'Ura'), ('ਅ', 'Aira'), ('ੲ', 'Iri'), ('ਸ', 'Sassa'), ('ਹ', 'Haha'),
  ('ਕ', 'Kakka'), ('ਖ', 'Khakha'), ('ਗ', 'Gagga'), ('ਘ', 'Ghagga'), ('ਙ', 'Nganga'),
  ('ਚ', 'Chachcha'), ('ਛ', 'Chhachha'), ('ਜ', 'Jajja'), ('ਝ', 'Jhajja'), ('ਞ', 'Nyanya'),
  ('ਟ', 'Tainka'), ('ਠ', 'Thattha'), ('ਡ', 'Dadda'), ('ਢ', 'Dhadda'), ('ਣ', 'Nanna'),
  ('ਤ', 'Tatta'), ('ਥ', 'Thattha'), ('ਦ', 'Dadda'), ('ਧ', 'Dhadda'), ('ਨ', 'Nanna'),
  ('ਪ', 'Pappa'), ('ਫ', 'Phaphpha'), ('ਬ', 'Babba'), ('ਭ', 'Bhabba'), ('ਮ', 'Mamma'),
  ('ਯ', 'Yayya'), ('ਰ', 'Rara'), ('ਲ', 'Lalla'), ('ਵ', 'Vava'), ('ੜ', 'Rarra'),
];
const _rules = [
  ('ਨਾਮ ਜਪਣਾ', 'Naam Japna', 'Remember Waheguru — in prayer, in Simran, and all through the day.'),
  ('ਕਿਰਤ ਕਰਨੀ', 'Kirat Karni', 'Work hard and be honest — never cheat or take what isn’t yours.'),
  ('ਵੰਡ ਛਕਣਾ', 'Vand Chhakna', 'Share what you have with others, like the free Langar at every Gurdwara.'),
];
const _fiveKs = [
  ('ਕੇਸ', 'Kesh', 'Uncut hair, kept as Waheguru made it, and covered with a dastar or chunni.'),
  ('ਕੰਘਾ', 'Kanga', 'A small wooden comb to keep the hair clean and tidy.'),
  ('ਕੜਾ', 'Kara', 'A steel bracelet — a reminder to do good with our hands.'),
  ('ਕਛਹਿਰਾ', 'Kachhera', 'Cotton shorts worn as an undergarment, a reminder of self-control.'),
  ('ਕਿਰਪਾਨ', 'Kirpan', 'A small sword, a reminder to stand up for what is right and protect others.'),
];

class KidsScreen extends StatelessWidget {
  const KidsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final gurus = Library.instance.gurus.map(I18n.instance.guru).toList();
    Widget head(String emoji, String title, [String? sub]) => Padding(
          padding: const EdgeInsets.only(top: 22, bottom: 10),
          child: Row(children: [
            Container(width: 44, height: 44, alignment: Alignment.center, decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(14)), child: Text(emoji, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w800, color: Brand.goldDark))),
            const SizedBox(width: 12),
            Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: sectionTitle(context)), if (sub != null) Text(sub, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant))])),
          ]),
        );
    return Scaffold(
      appBar: AppBar(title: Text('${tr('Kids')} — ${tr('Learn Sikhi')}')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 32), children: [
        head('ੴ', tr('The Ten Gurus'), tr('Tap a Guru to read their story.')),
        SizedBox(
          height: 110,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: gurus.length,
            separatorBuilder: (_, _) => const SizedBox(width: 10),
            itemBuilder: (context, i) => GestureDetector(
              onTap: () => _push(context, GuruScreen(guru: gurus[i])),
              child: SizedBox(
                width: 84,
                child: Column(children: [
                  CircleAvatar(radius: 32, backgroundColor: Brand.navy, backgroundImage: gurus[i].art != null ? AssetImage(gurus[i].art!) : null,
                      child: gurus[i].art == null ? Text('${gurus[i].number}', style: const TextStyle(color: Brand.gold, fontWeight: FontWeight.w800, fontSize: 20)) : null),
                  const SizedBox(height: 6),
                  Text(gurus[i].name.replaceAll(' Ji', ''), maxLines: 2, textAlign: TextAlign.center, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600)),
                ]),
              ),
            ),
          ),
        ),
        head('ੳ', tr('Gurmukhi letters'), tr('Tap a letter to see its name.')),
        const _Letters(),
        head('★', tr('The three golden rules')),
        for (final (pa, en, text) in _rules) _KidsCard(pa: pa, title: en, text: text),
        head('ੲ', tr('The Five Ks')),
        for (final (pa, en, text) in _fiveKs) _KidsCard(pa: pa, title: en, text: text),
        head('?', tr('Quiz')),
        const DailyQuizCard(),
        const SizedBox(height: 12),
        KidsQuiz(questions: [for (final (q, o, a) in kidsBasics) (tr(q), o.map(tr).toList(), a)]),
        head('📖', tr('Stories & videos')),
        const _KidsStories(),
      ]),
    );
  }
}

class _Letters extends StatefulWidget {
  const _Letters();
  @override
  State<_Letters> createState() => _LettersState();
}

class _LettersState extends State<_Letters> {
  int? _open;

  @override
  Widget build(BuildContext context) => GridView.count(
        crossAxisCount: 5,
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        mainAxisSpacing: 8,
        crossAxisSpacing: 8,
        children: [
          for (final (i, (ch, name)) in _letters.indexed)
            Material(
              color: _open == i ? Brand.gold.withValues(alpha: 0.25) : Theme.of(context).cardTheme.color,
              borderRadius: BorderRadius.circular(16),
              child: InkWell(
                borderRadius: BorderRadius.circular(16),
                onTap: () => setState(() => _open = _open == i ? null : i),
                child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                  Text(ch, style: const TextStyle(fontFamily: 'NotoSansGurmukhi', fontSize: 28, fontWeight: FontWeight.w600)),
                  Text(_open == i ? name : ' ', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.w700, color: Brand.goldDark)),
                ]),
              ),
            ),
        ],
      );
}

class _KidsCard extends StatelessWidget {
  const _KidsCard({required this.pa, required this.title, required this.text});
  final String pa, title, text;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Card(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(pa, style: const TextStyle(fontFamily: 'NotoSansGurmukhi', fontSize: 18, color: Brand.goldDark, fontWeight: FontWeight.w700)),
              Text(title, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 16)),
              const SizedBox(height: 4),
              Text(text, style: const TextStyle(height: 1.45)),
            ]),
          ),
        ),
      );
}

/// Pick an answer, see straight away if it's right, get a score.
class KidsQuiz extends StatefulWidget {
  const KidsQuiz({super.key, required this.questions, this.id = 'kids'});
  final List<(String, List<String>, int)> questions;
  final String id;
  @override
  State<KidsQuiz> createState() => _KidsQuizState();
}

/// A quiz answered one question at a time (not all at once), with the score and "Play again" at the end.
class _KidsQuizState extends State<KidsQuiz> {
  late final _questions = [for (final (i, (q, o, a)) in widget.questions.indexed) QuizQuestion('${widget.id}-$i', q, o, a)];
  late List<int?> _answers = List<int?>.filled(widget.questions.length, null);

  @override
  Widget build(BuildContext context) => QuizStepper(
        questions: _questions,
        answers: _answers,
        onAnswer: (i, j) => setState(() => _answers = [..._answers]..[i] = j),
        finished: (context, score) => Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(16)),
          child: Column(children: [
            const Icon(Icons.emoji_events_rounded, color: Brand.goldDark, size: 40),
            const SizedBox(height: 6),
            Text('${tr('You got')} $score / ${_questions.length}!', style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 18)),
            const SizedBox(height: 8),
            FilledButton.tonal(onPressed: () => setState(() => _answers = List<int?>.filled(_questions.length, null)), child: Text(tr('Play again'))),
          ]),
        ),
      );
}

class _KidsStories extends StatelessWidget {
  const _KidsStories();

  @override
  Widget build(BuildContext context) => FutureBuilder<EntryPage>(
        future: SiteApi.instance.entries('kids'),
        builder: (context, snap) {
          if (!snap.hasData) return snap.hasError ? Text('${snap.error}') : const LinearProgressIndicator(color: Brand.gold);
          final items = snap.data!.items;
          // Quizzes the Sikhify team publishes for children also go into the Daily Quiz.
          Quiz.saveSiteQuestions([
            for (final e in items)
              for (final (i, q) in ((e.fields['quiz'] as List?) ?? const []).indexed)
                if (q is Map && q['options'] is List && q['answer'] is num)
                  QuizQuestion('site-${e.slug}-$i', '${q['question']}', (q['options'] as List).map((o) => '$o').toList(), (q['answer'] as num).toInt()),
          ]);
          if (items.isEmpty) return const Text('New stories are on their way.');
          return Column(children: [for (final e in items) EntryCard(entry: e)]);
        },
      );
}

/* =========================================================================================
   Directory: Personalities, Organizations, Websites, Apps, Books, Heritage, Events, News, Blog, Downloads
   ========================================================================================= */
const _sectionIcons = {
  'personality': Icons.person_rounded, 'organization': Icons.groups_rounded, 'website': Icons.public_rounded, 'app': Icons.phone_android_rounded,
  'book': Icons.menu_book_rounded, 'heritage': Icons.account_balance_rounded, 'event': Icons.event_rounded, 'news': Icons.newspaper_rounded,
  'blog': Icons.article_rounded, 'download': Icons.download_rounded, 'kids': Icons.child_care_rounded,
};

class DirectoryScreen extends StatelessWidget {
  const DirectoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final types = Library.instance.contentTypes;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Directory'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        for (final MapEntry(key: k, value: raw) in types.entries)
          if (k != 'kids' && k != 'product')
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                child: ListTile(
                  contentPadding: const EdgeInsets.fromLTRB(14, 6, 12, 6),
                  leading: CircleAvatar(backgroundColor: Brand.navy, foregroundColor: Brand.gold, child: Icon(_sectionIcons[k] ?? Icons.folder_rounded)),
                  title: Text('${_m(raw)['plural']}', style: const TextStyle(fontWeight: FontWeight.w800)),
                  subtitle: Text('${_m(raw)['description']}', maxLines: 2, overflow: TextOverflow.ellipsis),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  onTap: () => _push(context, EntryListScreen(typeKey: k)),
                ),
              ),
            ),
      ]),
    );
  }
}

class EntryListScreen extends StatefulWidget {
  const EntryListScreen({super.key, required this.typeKey});
  final String typeKey;
  @override
  State<EntryListScreen> createState() => _EntryListScreenState();
}

class _EntryListScreenState extends State<EntryListScreen> {
  String? _cat;
  String _q = '';
  late Future<EntryPage> _page = _load();
  late final Future<List<String>> _cats = SiteApi.instance.entryCategories(_path);

  String get _path => '${_m(Library.instance.contentTypes[widget.typeKey])['path']}';
  Future<EntryPage> _load() => SiteApi.instance.entries(_path, q: _q, category: _cat);

  @override
  Widget build(BuildContext context) {
    final t = _m(Library.instance.contentTypes[widget.typeKey]);
    return Scaffold(
      appBar: AppBar(title: Text('${t['plural']}')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), children: [
        Text('${t['description']}', style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 10),
        TextField(
          onSubmitted: (v) => setState(() { _q = v; _page = _load(); }),
          textInputAction: TextInputAction.search,
          decoration: InputDecoration(hintText: tr('Search'), prefixIcon: const Icon(Icons.search_rounded), filled: true, border: OutlineInputBorder(borderRadius: BorderRadius.circular(16), borderSide: BorderSide.none)),
        ),
        const SizedBox(height: 10),
        FutureBuilder<List<String>>(
          future: _cats,
          builder: (context, s) => (s.data ?? const []).isEmpty
              ? const SizedBox.shrink()
              : SizedBox(
                  height: 40,
                  child: ListView(scrollDirection: Axis.horizontal, children: [
                    for (final c in [null, ...s.data!])
                      Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(c ?? tr('All')), selected: _cat == c, showCheckmark: false, onSelected: (_) => setState(() { _cat = c; _page = _load(); }))),
                  ]),
                ),
        ),
        const SizedBox(height: 12),
        FutureBuilder<EntryPage>(
          future: _page,
          builder: (context, snap) {
            if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _page = _load()));
            if (!snap.hasData) return const Padding(padding: EdgeInsets.all(40), child: Center(child: CircularProgressIndicator()));
            final items = snap.data!.items;
            if (items.isEmpty) return Padding(padding: const EdgeInsets.all(24), child: Text(tr('Nothing here yet.'), textAlign: TextAlign.center));
            return Column(children: [for (final e in items) EntryCard(entry: e)]);
          },
        ),
      ]),
    );
  }
}

class EntryCard extends StatelessWidget {
  const EntryCard({super.key, required this.entry});
  final Entry entry;

  @override
  Widget build(BuildContext context) {
    final e = entry;
    final meta = [if (e.category.isNotEmpty) e.category, if (e.place.isNotEmpty) e.place, if (e.date != null) '${e.date!.day}/${e.date!.month}/${e.date!.year}'];
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: Card(
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: () => _push(context, EntryScreen(entry: e)),
          child: Row(children: [
            SizedBox(
              width: 96, height: 96,
              child: e.image != null
                  ? Pic(e.image!, radius: 0)
                  : Container(decoration: const BoxDecoration(gradient: Brand.nightGradient), child: Icon(_sectionIcons[e.type] ?? Icons.folder_rounded, color: Brand.gold, size: 36)),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 10),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(e.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w800)),
                  if (meta.isNotEmpty) Text(meta.join(' · '), maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, color: Brand.goldDark, fontWeight: FontWeight.w600)),
                  if (e.summary.isNotEmpty) Text(e.summary, maxLines: 2, overflow: TextOverflow.ellipsis, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ]),
              ),
            ),
            const Icon(Icons.chevron_right_rounded),
            const SizedBox(width: 6),
          ]),
        ),
      ),
    );
  }
}

/// One record: picture, summary, its section's details, the article/body, videos and photos, sources.
class EntryScreen extends StatelessWidget {
  const EntryScreen({super.key, required this.entry});
  final Entry entry;

  @override
  Widget build(BuildContext context) {
    final e = entry;
    final type = _m(Library.instance.contentTypes[e.type]);
    const hidden = {'videos', 'video_files', 'photos', 'quiz', 'downloadable', 'image_credit', 'map_url', 'country', 'state', 'district', 'city'};
    final facts = [
      for (final f in (type['fields'] as List? ?? const []))
        if (!hidden.contains(_m(f)['name']) && e.fields[_m(f)['name']] != null && '${e.fields[_m(f)['name']]}'.isNotEmpty)
          ('${_m(f)['label']}', e.fields[_m(f)['name']] is List ? (e.fields[_m(f)['name']] as List).join(', ') : '${e.fields[_m(f)['name']]}'),
    ];
    final videos = (e.fields['videos'] as List? ?? const []).cast<String>();
    final photos = (e.fields['photos'] as List? ?? const []).map((p) => '$p'.startsWith('/') ? '${SiteApi.base}$p' : '$p').toList();
    final quiz = (e.fields['quiz'] as List? ?? const []).map((q) => _m(q)).toList();
    final link = e.link;
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return Scaffold(
      appBar: AppBar(title: Text('${type['label'] ?? ''}')),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        if (e.image != null) ...[Pic(e.image!, height: 200, radius: 18, width: double.infinity), const SizedBox(height: 14)],
        Text(e.title, style: serif(26, color: Theme.of(context).colorScheme.onSurface)),
        if (e.category.isNotEmpty || e.place.isNotEmpty) Text([e.category, e.place].where((s) => s.isNotEmpty).join(' · '), style: const TextStyle(color: Brand.goldDark, fontWeight: FontWeight.w600)),
        if (e.summary.isNotEmpty) ...[const SizedBox(height: 10), Text(e.summary, style: const TextStyle(fontSize: 16, height: 1.5, fontWeight: FontWeight.w600))],
        if (link != null) ...[
          const SizedBox(height: 14),
          FilledButton.icon(style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50)), onPressed: () => openWeb(link.$2), icon: Icon(e.type == 'download' ? Icons.download_rounded : Icons.open_in_new_rounded), label: Text(link.$1)),
        ],
        if (facts.isNotEmpty) ...[
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(14),
              child: Column(children: [
                for (final (label, value) in facts)
                  Padding(
                    padding: const EdgeInsets.symmetric(vertical: 4),
                    child: Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
                      SizedBox(width: 120, child: Text(label, style: TextStyle(color: muted, fontWeight: FontWeight.w600))),
                      Expanded(child: value.startsWith('http') ? InkWell(onTap: () => openWeb(value), child: Text(value, style: const TextStyle(color: Brand.goldDark, decoration: TextDecoration.underline))) : Text(value)),
                    ]),
                  ),
              ]),
            ),
          ),
        ],
        if (e.body.isNotEmpty) ...[const SizedBox(height: 16), ArticleText(e.body)],
        if (quiz.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text(tr('Quiz'), style: sectionTitle(context)),
          const SizedBox(height: 8),
          KidsQuiz(id: 'site-${e.slug}', questions: [for (final q in quiz) ('${q['question']}', (q['options'] as List).cast<String>(), (q['answer'] as num).toInt())]),
        ],
        if (videos.isNotEmpty) ...[
          const SizedBox(height: 16),
          for (final id in videos)
            Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: Card(
                clipBehavior: Clip.antiAlias,
                child: ListTile(
                  leading: SizedBox(width: 90, child: AspectRatio(aspectRatio: 16 / 9, child: Pic('https://i.ytimg.com/vi/$id/hqdefault.jpg', radius: 6))),
                  title: const Text('Watch video'),
                  trailing: YouTubeButton(id: id, compact: true),
                  onTap: () => openVideo(context, Video.fromJson({'id': id, 'title': e.title}, artist: e.title)),
                ),
              ),
            ),
        ],
        if (photos.isNotEmpty) ...[
          const SizedBox(height: 16),
          for (final p in photos) Padding(padding: const EdgeInsets.only(bottom: 10), child: Pic(p, radius: 14)),
        ],
        if (e.source.isNotEmpty || e.references.isNotEmpty) ...[
          const SizedBox(height: 16),
          Text('Sources', style: sectionTitle(context)),
          if (e.source.isNotEmpty) Text(e.source, style: TextStyle(color: muted)),
          for (final (i, r) in e.references.indexed)
            InkWell(onTap: () => openWeb(e.referenceUrls[i]), child: Padding(padding: const EdgeInsets.symmetric(vertical: 4), child: Text('↗ $r', style: const TextStyle(color: Brand.goldDark)))),
        ],
        const SizedBox(height: 8),
        TextButton.icon(onPressed: () => openWeb(e.url), icon: const Icon(Icons.open_in_new_rounded, size: 18), label: Text(tr('Open on sikhify.in'))),
        TextButton.icon(
          onPressed: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ReportScreen(targetUrl: e.url.startsWith('http') ? e.url : '${SiteApi.base}${e.url}', targetName: e.title))),
          icon: const Icon(Icons.flag_outlined, size: 18),
          label: Text(tr('Report a mistake')),
        ),
      ]),
    );
  }
}

/// A blog article: paragraphs, "## Heading" lines and "![Caption](image)" lines (as on the site).
class ArticleText extends StatelessWidget {
  const ArticleText(this.text, {super.key});
  final String text;

  @override
  Widget build(BuildContext context) {
    final image = RegExp(r'^!\[([^\]]*)\]\((\S+)\)$');
    final blocks = <Widget>[];
    final para = <String>[];
    void flush() {
      if (para.isEmpty) return;
      blocks.add(Padding(padding: const EdgeInsets.only(bottom: 12), child: Text(para.join('\n'), style: const TextStyle(fontSize: 15, height: 1.65))));
      para.clear();
    }
    for (final raw in text.split('\n')) {
      final line = raw.trim();
      final img = image.firstMatch(line);
      if (line.isEmpty) {
        flush();
      } else if (img != null) {
        flush();
        final src = img.group(2)!.startsWith('/') ? '${SiteApi.base}${img.group(2)}' : img.group(2)!;
        blocks.add(Padding(
          padding: const EdgeInsets.only(bottom: 14),
          child: Column(children: [Pic(src, radius: 14), if (img.group(1)!.isNotEmpty) Padding(padding: const EdgeInsets.only(top: 6), child: Text(img.group(1)!, style: const TextStyle(fontSize: 13)))]),
        ));
      } else if (line.startsWith('## ')) {
        flush();
        blocks.add(Padding(padding: const EdgeInsets.only(top: 6, bottom: 8), child: Text(line.substring(3), style: sectionTitle(context))));
      } else {
        para.add(raw);
      }
    }
    flush();
    return Column(crossAxisAlignment: CrossAxisAlignment.start, children: blocks);
  }
}

/// Pages that need the website (an account, or a form reviewed by the team).
class WebsitePagesScreen extends StatelessWidget {
  const WebsitePagesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final pages = [
      (Icons.forum_rounded, tr('Community'), 'Share with the Sangat, groups and posts (needs an account)', '/community'),
      (Icons.edit_note_rounded, tr('Submit / update information'), 'Add or correct a Gurdwara or directory entry', '/submit'),
      (Icons.add_location_alt_rounded, 'Suggest a Gurdwara', 'Add a Gurdwara that isn’t listed yet', '/directory/gurdwaras/suggest'),
      (Icons.mail_rounded, tr('Contact us'), 'sikhify.in@gmail.com', '/contact'),
      (Icons.privacy_tip_rounded, tr('Privacy policy'), 'What Sikhify collects and why', '/privacy-policy'),
      (Icons.photo_library_rounded, tr('Image credits'), 'Sources and licences for every image', '/image-credits'),
      (Icons.map_rounded, 'Sitemap', 'Every page on sikhify.in', '/sitemap'),
    ];
    return Scaffold(
      appBar: AppBar(title: Text(tr('More from sikhify.in'))),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        for (final (icon, title, sub, path) in pages)
          Padding(
            padding: const EdgeInsets.only(bottom: 10),
            child: Card(child: ListTile(leading: Icon(icon), title: Text(title, style: const TextStyle(fontWeight: FontWeight.w700)), subtitle: Text(sub), trailing: const Icon(Icons.open_in_new_rounded), onTap: () => openWeb(path))),
          ),
      ]),
    );
  }
}

