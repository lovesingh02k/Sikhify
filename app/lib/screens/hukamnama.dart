import 'package:flutter/material.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/banidb.dart';
import '../widgets/audio_bar.dart';
import '../widgets/gurbani_pages.dart';
import '../widgets/gurbani_view.dart';
import '../widgets/reading_settings.dart';
import '../widgets/share_gurbani.dart';

const _months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
String longDate(DateTime d) => '${d.day} ${tr(_months[d.month - 1])} ${d.year}';

/// The daily Hukamnama from Sri Harmandir Sahib, Amritsar, with the SGPC's recordings.
/// Earlier days can be opened from the calendar (from 1 January 2025).
class HukamnamaScreen extends StatefulWidget {
  const HukamnamaScreen({super.key, this.embedded = true});

  /// In the bottom navigation (no back button) or pushed from Home.
  final bool embedded;

  @override
  State<HukamnamaScreen> createState() => _HukamnamaScreenState();
}

class _HukamnamaScreenState extends State<HukamnamaScreen> {
  DateTime _date = BaniDb.todayInIndia();
  late Future<Hukamnama> _h = BaniDb.instance.hukamnama(_date);

  bool get _isToday => _date == BaniDb.todayInIndia();

  void _open(DateTime d) => setState(() {
        _date = d;
        _h = BaniDb.instance.hukamnama(d);
      });

  Future<void> _pickDate() async {
    final today = BaniDb.todayInIndia();
    final d = await showDatePicker(context: context, initialDate: _date, firstDate: DateTime(2025, 1, 1), lastDate: today, helpText: 'Hukamnama for…');
    if (d != null) _open(d);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        automaticallyImplyLeading: !widget.embedded,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(tr('Hukamnama')),
          Text(_isToday ? '${tr('Today')} · ${longDate(_date)}' : longDate(_date), style: TextStyle(fontSize: 12, fontWeight: FontWeight.w500, color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ]),
        actions: [
          IconButton(tooltip: 'Choose a date', icon: const Icon(Icons.calendar_month_rounded), onPressed: _pickDate),
          const BookViewButton(),
          IconButton(tooltip: 'Text size and meanings', icon: const Icon(Icons.text_fields_rounded), onPressed: () => showReadingSettings(context)),
        ],
      ),
      body: FutureBuilder<Hukamnama>(
        future: _h,
        builder: (context, snap) {
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => _open(_date));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final h = snap.data!;
          return RefreshIndicator(
            onRefresh: () async => _open(_date),
            child: GurbaniBody(
              title: 'ਹੁਕਮਨਾਮਾ · ${h.writer ?? 'Sri Harmandir Sahib'}',
              lines: h.lines,
              header: Padding(
                padding: const EdgeInsets.only(top: 8, bottom: 10),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  // Early in the Indian morning the day's Hukamnama may not be out yet: the latest one is shown, so say so.
                  if (h.date != _date)
                    Padding(
                      padding: const EdgeInsets.only(bottom: 8),
                      child: Text('Showing the Hukamnama of ${longDate(h.date)} — the one for ${longDate(_date)} isn’t published yet.',
                          style: TextStyle(color: Theme.of(context).colorScheme.primary, fontWeight: FontWeight.w600)),
                    ),
                  Text([if (h.writer != null) h.writer!, if (h.raag != null) h.raag!, if (h.ang != null) 'Ang ${h.ang}'].join(' · '),
                      style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 10),
                  if (h.audioUrl != null) AudioBar(url: h.audioUrl!, label: 'Hukamnama — recitation', credit: 'SGPC recording', title: 'Hukamnama · ${longDate(h.date)}', subtitle: 'Sri Harmandir Sahib'),
                  if (h.kathaUrl != null) ...[const SizedBox(height: 8), AudioBar(url: h.kathaUrl!, label: 'Katha — explanation', credit: 'SGPC recording', title: 'Hukamnama Katha · ${longDate(h.date)}', subtitle: 'Sri Harmandir Sahib')],
                ]),
              ),
              footer: Padding(
                padding: const EdgeInsets.only(top: 18),
                child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Text(h.source, style: TextStyle(fontSize: 12, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  const SizedBox(height: 12),
                  Wrap(spacing: 8, runSpacing: 8, children: [
                    OutlinedButton.icon(onPressed: () => _open(h.date.subtract(const Duration(days: 1))), icon: const Icon(Icons.chevron_left), label: Text(tr('Previous day'))),
                    if (!_isToday) OutlinedButton.icon(onPressed: () => _open(BaniDb.todayInIndia()), icon: const Icon(Icons.today), label: Text(tr('Today'))),
                    FilledButton.tonalIcon(
                      onPressed: () => shareGurbani(context, heading: 'Hukamnama — ${longDate(h.date)}\nSri Harmandir Sahib, Amritsar', lines: h.lines),
                      icon: const Icon(Icons.share_outlined),
                      label: Text(tr('Share')),
                    ),
                  ]),
                ]),
              ),
            ),
          );
        },
      ),
    );
  }
}
