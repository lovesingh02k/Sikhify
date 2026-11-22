import 'package:flutter/material.dart';

import '../services/contribute.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../services/site_api.dart';
import '../theme.dart';

/// "Help improve Sikhify": add something new, suggest an idea, or report a mistake.
/// Everything goes to the Sikhify team for review; nothing is published automatically.
class ContributeScreen extends StatelessWidget {
  const ContributeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    Widget tile(Widget icon, String title, String sub, Widget Function() screen) => Card(
          child: ListTile(
            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            leading: CircleAvatar(backgroundColor: Brand.gold.withValues(alpha: 0.18), child: icon),
            title: Text(title, style: const TextStyle(fontWeight: FontWeight.w800)),
            subtitle: Text(sub),
            trailing: const Icon(Icons.chevron_right_rounded),
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => screen())),
          ),
        );
    Widget head(String text) => Padding(padding: const EdgeInsets.fromLTRB(4, 18, 4, 8), child: Text(text, style: sectionTitle(context)));
    return Scaffold(
      appBar: AppBar(title: Text(tr('Help improve Sikhify'))),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 4, 16, 32), children: [
        Text(tr('Add what is missing, share an idea, or tell us about a mistake. The Sikhify team checks everything before it appears in the app and on sikhify.in.'),
            style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant, height: 1.5)),
        head(tr('Add')),
        tile(const GurdwaraIcon(size: 22, color: Brand.goldDark), tr('Add a Gurdwara'), tr('A Gurdwara that isn’t listed yet'), () => const GurdwaraSuggestScreen()),
        tile(const Icon(Icons.add_circle_outline_rounded, color: Brand.goldDark), tr('Add something else'), tr('An event, Sikh personality, Kirtani, book, website, app or organisation'), () => const AddContentScreen()),
        head(tr('Suggest')),
        tile(const Icon(Icons.lightbulb_outline_rounded, color: Brand.goldDark), tr('Suggest an idea'), tr('A new feature, or something that could work better'), () => const SuggestScreen()),
        head(tr('Report')),
        tile(const Icon(Icons.flag_outlined, color: Brand.goldDark), tr('Report a mistake'), tr('Wrong information, a broken link, or a problem in the app'), () => const ReportScreen()),
      ]),
    );
  }
}

/* --------------------------------------------------------------- shared form parts */

/// A text field that shows the website's message for it when the submission is refused.
class _Field extends StatelessWidget {
  const _Field(this.controller, this.label, {this.error, this.help, this.lines = 1, this.required = false, this.keyboard, this.hint});
  final TextEditingController controller;
  final String label;
  final String? error, help, hint;
  final int lines;
  final bool required;
  final TextInputType? keyboard;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: TextField(
          controller: controller,
          minLines: lines,
          maxLines: lines == 1 ? 1 : lines + 4,
          keyboardType: keyboard ?? (lines > 1 ? TextInputType.multiline : TextInputType.text),
          textCapitalization: keyboard == null ? TextCapitalization.sentences : TextCapitalization.none,
          decoration: InputDecoration(
            labelText: required ? '$label *' : label,
            hintText: hint,
            helperText: help,
            helperMaxLines: 3,
            errorText: error,
            errorMaxLines: 3,
            alignLabelWithHint: lines > 1,
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
          ),
        ),
      );
}

/// Optional name and email, so the team can reply (kept on the phone for next time).
class _Contact extends StatelessWidget {
  const _Contact(this.name, this.email, this.errors);
  final TextEditingController name, email;
  final Map<String, String> errors;

  @override
  Widget build(BuildContext context) => Card(
        margin: const EdgeInsets.only(bottom: 14),
        child: ExpansionTile(
          initiallyExpanded: email.text.isNotEmpty || errors.containsKey('guestEmail'),
          shape: const Border(),
          leading: const Icon(Icons.mail_outline_rounded),
          title: Text(tr('Your name and email (optional)'), style: const TextStyle(fontWeight: FontWeight.w700)),
          subtitle: Text(tr('Only so we can reply. Never shown to anyone.')),
          childrenPadding: const EdgeInsets.fromLTRB(14, 4, 14, 0),
          children: [
            _Field(name, tr('Your name')),
            _Field(email, tr('Email'), keyboard: TextInputType.emailAddress, error: errors['guestEmail']),
          ],
        ),
      );
}

/// The send button, the "thank you" with the reference, and the error message: shared by every form.
mixin _Sending<T extends StatefulWidget> on State<T> {
  final guestName = TextEditingController(text: Settings.instance.name);
  final guestEmail = TextEditingController(text: Settings.instance.contactEmail);
  Map<String, String> errors = {};
  String? failure;
  String? reference;
  bool busy = false;

  Future<void> send(Future<String> Function() submit) async {
    if (busy) return;
    FocusScope.of(context).unfocus();
    setState(() {
      busy = true;
      failure = null;
      errors = {};
    });
    try {
      final ref = await submit();
      Settings.instance.contactEmail = guestEmail.text.trim();
      if (mounted) setState(() => reference = ref);
    } on ContributeError catch (e) {
      if (mounted) {
        setState(() {
          failure = e.message;
          errors = e.fields;
        });
      }
    } finally {
      if (mounted) setState(() => busy = false);
    }
  }

  @override
  void dispose() {
    guestName.dispose();
    guestEmail.dispose();
    super.dispose();
  }

  Widget contact() => _Contact(guestName, guestEmail, errors);

  /// The form, or the thank-you once it is sent.
  Widget page(String title, List<Widget> fields, {String? intro}) => Scaffold(
        appBar: AppBar(title: Text(title)),
        body: reference != null
            ? _Thanks(reference: reference!)
            : ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 40), children: [
                if (intro != null) Padding(padding: const EdgeInsets.only(bottom: 16), child: Text(intro, style: TextStyle(height: 1.5, color: Theme.of(context).colorScheme.onSurfaceVariant))),
                ...fields,
                contact(),
                if (failure != null)
                  Container(
                    margin: const EdgeInsets.only(bottom: 12),
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(color: const Color(0x22C2410C), borderRadius: BorderRadius.circular(12)),
                    child: Text(failure!, style: const TextStyle(color: Color(0xFFC2410C), fontWeight: FontWeight.w600)),
                  ),
                FilledButton.icon(
                  style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: const StadiumBorder()),
                  onPressed: busy ? null : submit,
                  icon: busy ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.send_rounded),
                  label: Text(busy ? tr('Sending…') : tr('Send')),
                ),
                const SizedBox(height: 10),
                Text(tr('Reviewed by the Sikhify team before anything is published.'), textAlign: TextAlign.center, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
      );

  /// Each form sends its own fields.
  void submit();
}

class _Thanks extends StatelessWidget {
  const _Thanks({required this.reference});
  final String reference;

  @override
  Widget build(BuildContext context) => Center(
        child: Padding(
          padding: const EdgeInsets.all(28),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            const Icon(Icons.check_circle_rounded, size: 72, color: Color(0xFF1F7A4C)),
            const SizedBox(height: 14),
            Text(tr('Thank you! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh.'), textAlign: TextAlign.center, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 10),
            Text(tr('The Sikhify team will check it soon.'), textAlign: TextAlign.center),
            if (reference.isNotEmpty) ...[
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
                decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.18), borderRadius: BorderRadius.circular(12)),
                child: Text('${tr('Reference')}: $reference', style: const TextStyle(fontWeight: FontWeight.w800, letterSpacing: 0.5)),
              ),
            ],
            const SizedBox(height: 22),
            FilledButton(onPressed: () => Navigator.of(context).pop(), child: Text(tr('Done'))),
          ]),
        ),
      );
}

/// Quick answers for "How do you know?", so nobody has to type it.
class _SourceChips extends StatelessWidget {
  const _SourceChips(this.controller);
  final TextEditingController controller;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 14),
        child: Wrap(spacing: 8, runSpacing: 4, children: [
          for (final s in ['I visited the Gurdwara', 'Gurdwara committee', 'Notice board at the Gurdwara', 'Their website / social media'])
            ActionChip(label: Text(tr(s)), onPressed: () => controller.text = tr(s)),
        ]),
      );
}

/* --------------------------------------------------------------- suggest / report */

class SuggestScreen extends StatefulWidget {
  const SuggestScreen({super.key});
  @override
  State<SuggestScreen> createState() => _SuggestScreenState();
}

class _SuggestScreenState extends State<SuggestScreen> with _Sending {
  final _message = TextEditingController();

  @override
  void submit() => send(() => Contribute.submission(kind: 'suggestion', message: _message.text.trim(), title: 'App suggestion', guestName: guestName.text, guestEmail: guestEmail.text));

  @override
  Widget build(BuildContext context) => page(tr('Suggest an idea'), [
        _Field(_message, tr('Your suggestion or feedback'), lines: 5, required: true, error: errors['message'], help: tr('An idea for a new feature, something hard to use, or anything else you’d like us to know.')),
      ]);
}

/// Report a mistake. Opened from a page (Gurdwara, festival, directory record) it already knows which one.
class ReportScreen extends StatefulWidget {
  const ReportScreen({super.key, this.targetUrl, this.targetName});
  final String? targetUrl;
  final String? targetName;
  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> with _Sending {
  late final _target = TextEditingController(text: widget.targetUrl ?? '');
  final _message = TextEditingController();
  final _source = TextEditingController();

  @override
  void submit() => send(() => Contribute.submission(
        kind: 'incorrect',
        targetUrl: _target.text.trim(),
        title: widget.targetName,
        message: _message.text.trim(),
        source: _source.text.trim(),
        guestName: guestName.text,
        guestEmail: guestEmail.text,
      ));

  @override
  Widget build(BuildContext context) => page(tr('Report a mistake'), intro: widget.targetName == null ? null : '${tr('About')}: ${widget.targetName}', [
        if (widget.targetUrl == null) _Field(_target, tr('Which page, Gurdwara or Bani?'), required: true, error: errors['targetUrl'], help: tr('Its name, or the sikhify.in link.')),
        _Field(_message, tr('What’s wrong, and what should it say?'), lines: 4, required: true, error: errors['message']),
        _Field(_source, tr('Where is the correct information from? (optional)'), error: errors['source']),
      ]);
}

/* --------------------------------------------------------------- Gurdwaras */

/// Suggest a Gurdwara that isn't listed.
class GurdwaraSuggestScreen extends StatefulWidget {
  const GurdwaraSuggestScreen({super.key});
  @override
  State<GurdwaraSuggestScreen> createState() => _GurdwaraSuggestScreenState();
}

class _GurdwaraSuggestScreenState extends State<GurdwaraSuggestScreen> with _Sending {
  final _name = TextEditingController(), _country = TextEditingController(text: 'India'), _state = TextEditingController(), _city = TextEditingController();
  final _address = TextEditingController(), _phone = TextEditingController(), _website = TextEditingController(), _details = TextEditingController(), _source = TextEditingController();

  @override
  void submit() => send(() => Contribute.gurdwara(
        update: false,
        name: _name.text.trim(),
        country: _country.text.trim(),
        state: _state.text.trim(),
        city: _city.text.trim(),
        address: _address.text.trim(),
        phone: _phone.text.trim(),
        website: _website.text.trim(),
        details: _details.text.trim(),
        source: _source.text.trim(),
        guestName: guestName.text,
        guestEmail: guestEmail.text,
      ));

  @override
  Widget build(BuildContext context) => page(tr('Add a Gurdwara'), [
        _Field(_name, tr('Gurdwara name'), required: true, error: errors['name']),
        _Field(_country, tr('Country'), required: true, error: errors['country']),
        _Field(_state, tr('State'), required: true, error: errors['state']),
        _Field(_city, tr('City'), required: true, error: errors['city']),
        _Field(_address, tr('Address'), lines: 2, error: errors['address']),
        _Field(_phone, tr('Phone number'), keyboard: TextInputType.phone, error: errors['phone']),
        _Field(_website, tr('Website'), keyboard: TextInputType.url, hint: 'https://', error: errors['website']),
        _Field(_details, tr('Anything else (timings, Langar, history…)'), lines: 3, error: errors['details']),
        _Field(_source, tr('How do you know?'), required: true, error: errors['source']),
        _SourceChips(_source),
      ]);
}

/// Add a phone number or a note to a listed Gurdwara (or correct it). Reviewed before it shows.
class GurdwaraUpdateScreen extends StatefulWidget {
  const GurdwaraUpdateScreen({super.key, required this.gurdwara});
  final Gurdwara gurdwara;
  @override
  State<GurdwaraUpdateScreen> createState() => _GurdwaraUpdateScreenState();
}

class _GurdwaraUpdateScreenState extends State<GurdwaraUpdateScreen> with _Sending {
  final _phone = TextEditingController(), _website = TextEditingController(), _note = TextEditingController(), _source = TextEditingController();

  @override
  void submit() {
    final phone = _phone.text.trim(), note = _note.text.trim();
    // The website needs a few words about the change; a phone number alone says enough.
    final details = [if (phone.isNotEmpty) 'Phone number: $phone', if (_website.text.trim().isNotEmpty) 'Website: ${_website.text.trim()}', if (note.isNotEmpty) note].join('\n');
    if (details.isEmpty) {
      setState(() => errors = {'details': tr('Add a phone number or a note')});
      return;
    }
    send(() => Contribute.gurdwara(
          update: true,
          gurdwaraId: widget.gurdwara.id,
          name: widget.gurdwara.name,
          phone: phone,
          website: _website.text.trim(),
          details: details.length < 10 ? '$details (from the app)' : details,
          source: _source.text.trim(),
          guestName: guestName.text,
          guestEmail: guestEmail.text,
        ));
  }

  @override
  Widget build(BuildContext context) => page(tr('Add a number or note'), intro: '${widget.gurdwara.name}\n${widget.gurdwara.place}', [
        _Field(_phone, tr('Phone number'), keyboard: TextInputType.phone, error: errors['phone']),
        _Field(_website, tr('Website'), keyboard: TextInputType.url, hint: 'https://', error: errors['website']),
        _Field(_note, tr('Note'), lines: 4, error: errors['details'], help: tr('Timings, Langar, parking, a correction — anything that helps visitors.')),
        _Field(_source, tr('How do you know?'), required: true, error: errors['source']),
        _SourceChips(_source),
      ]);
}

/* --------------------------------------------------------------- other directory content */

const _addKinds = [
  ('event', 'An event', Icons.event_rounded),
  ('personality', 'A Sikh personality', Icons.person_rounded),
  ('kirtani', 'A Kirtani / Jatha / Katha Vachak', Icons.music_note_rounded),
  ('book', 'A book or research resource', Icons.menu_book_rounded),
  ('website', 'A Sikh website', Icons.public_rounded),
  ('app', 'A Sikh app', Icons.phone_android_rounded),
  ('organization', 'An organisation', Icons.groups_rounded),
];

/// Add an event, personality, Kirtani, book, website, app or organisation. The form's fields come from the
/// website's own content types (bundled with the app), so they match what the website checks.
class AddContentScreen extends StatefulWidget {
  const AddContentScreen({super.key});
  @override
  State<AddContentScreen> createState() => _AddContentScreenState();
}

class _AddContentScreenState extends State<AddContentScreen> with _Sending {
  String? _kind;
  final _fields = <String, TextEditingController>{};
  final _source = TextEditingController(), _note = TextEditingController();

  TextEditingController _c(String name) => _fields.putIfAbsent(name, TextEditingController.new);

  /// The fields a person can fill in on a phone (pictures, video lists and quizzes are left to the website).
  List<Map<String, dynamic>> get _schema {
    if (_kind == 'kirtani') {
      return [
        {'name': 'name', 'label': 'Name', 'kind': 'text', 'required': true},
        {'name': 'category', 'label': 'Category (e.g. Kirtan, Katha, Dhadi)', 'kind': 'text', 'required': true},
        {'name': 'location', 'label': 'Based in (city, country)', 'kind': 'text'},
        {'name': 'description', 'label': 'Short description', 'kind': 'textarea', 'required': true},
        {'name': 'videos', 'label': 'YouTube links (one per line)', 'kind': 'textarea'},
      ];
    }
    final type = (Library.instance.contentTypes[_kind] as Map?)?.cast<String, dynamic>();
    final own = ((type?['fields'] ?? []) as List).map((f) => (f as Map).cast<String, dynamic>());
    return [
      {'name': 'title', 'label': 'Name / title', 'kind': 'text', 'required': true},
      {'name': 'summary', 'label': 'Short summary', 'kind': 'textarea'},
      for (final f in own)
        if (const {'text', 'textarea', 'url', 'date', 'time', 'select', 'email'}.contains(f['kind'])) f,
    ];
  }

  @override
  void submit() {
    final data = <String, Object?>{for (final f in _schema) f['name'] as String: _c(f['name'] as String).text.trim()};
    send(() => Contribute.submission(kind: _kind!, data: data, source: _source.text.trim(), message: _note.text.trim(), guestName: guestName.text, guestEmail: guestEmail.text));
  }

  @override
  void dispose() {
    for (final c in _fields.values) {
      c.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (_kind == null) {
      return Scaffold(
        appBar: AppBar(title: Text(tr('Add something else'))),
        body: ListView(padding: const EdgeInsets.all(16), children: [
          for (final (key, label, icon) in _addKinds)
            Card(child: ListTile(leading: Icon(icon, color: Brand.goldDark), title: Text(tr(label), style: const TextStyle(fontWeight: FontWeight.w700)), trailing: const Icon(Icons.chevron_right_rounded), onTap: () => setState(() => _kind = key))),
        ]),
      );
    }
    final label = _addKinds.firstWhere((k) => k.$1 == _kind).$2;
    return PopScope(
      canPop: reference != null,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) setState(() => _kind = null); // back goes to the list of kinds first
      },
      child: page(tr(label), [
        for (final f in _schema)
          _Field(
            _c(f['name'] as String),
            tr('${f['label']}'),
            required: f['required'] == true,
            lines: f['kind'] == 'textarea' ? 3 : 1,
            keyboard: switch (f['kind']) { 'url' => TextInputType.url, 'email' => TextInputType.emailAddress, 'date' || 'time' => TextInputType.datetime, _ => null },
            hint: switch (f['kind']) { 'url' => 'https://', 'date' => 'YYYY-MM-DD', 'time' => 'HH:MM', _ => null },
            help: f['help'] as String?,
            error: errors[f['name']],
          ),
        _Field(_source, tr('Where did you get this information?'), required: true, error: errors['source'], help: tr('A link to an official website or announcement, or a book with its page number.')),
        _Field(_note, tr('Note for the reviewers (optional)'), lines: 2),
      ]),
    );
  }
}
