import 'package:flutter/material.dart';

import '../models.dart';
import '../services/i18n.dart';
import '../services/library.dart';
import '../services/settings.dart';
import '../theme.dart';
import 'reader.dart';

/// The daily Banis by time of day, each with a tick for today, and the streak of full mornings.
class NitnemScreen extends StatelessWidget {
  const NitnemScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final lib = Library.instance;
    final s = Settings.instance;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Nitnem'))),
      body: ListenableBuilder(
        listenable: s,
        builder: (context, _) {
          final morning = lib.nitnemTimes.firstWhere((t) => t.id == 'morning').baniIds;
          final all = lib.nitnemTimes.expand((t) => t.baniIds).toList();
          final done = s.doneToday().where(all.contains).length;
          final streak = s.streak(morning);
          return ListView(padding: const EdgeInsets.fromLTRB(16, 16, 16, 32), children: [
            _ProgressCard(done: done, total: all.length, streak: streak),
            for (final time in lib.nitnemTimes) ...[
              Padding(
                padding: const EdgeInsets.fromLTRB(4, 22, 4, 8),
                child: Row(children: [
                  Icon(_iconFor(time.id), color: Brand.goldDark),
                  const SizedBox(width: 8),
                  Text(tr(time.label), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w700)),
                  const SizedBox(width: 8),
                  Text(tr(time.sub), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
                ]),
              ),
              Card(
                child: Column(children: [
                  for (final id in time.baniIds)
                    if (lib.bani(id) case final b?) BaniTile(bani: b, done: s.isDone(id), onToggle: (v) => s.setDone(id, v)),
                ]),
              ),
            ],
            Padding(
              padding: const EdgeInsets.fromLTRB(4, 18, 4, 0),
              child: Text(I18n.instance.nitnemNote ?? lib.nitnemNote, style: TextStyle(fontSize: 13, height: 1.5, color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ),
          ]);
        },
      ),
    );
  }

  static IconData _iconFor(String id) => switch (id) {
        'morning' => Icons.wb_twilight_rounded,
        'evening' => Icons.wb_sunny_outlined,
        _ => Icons.nightlight_round,
      };
}

class _ProgressCard extends StatelessWidget {
  const _ProgressCard({required this.done, required this.total, required this.streak});
  final int done, total, streak;

  @override
  Widget build(BuildContext context) {
    return Card(
      color: Brand.navy,
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Row(children: [
          SizedBox(
            width: 64, height: 64,
            child: Stack(alignment: Alignment.center, children: [
              CircularProgressIndicator(value: total == 0 ? 0 : done / total, strokeWidth: 6, backgroundColor: Colors.white24, color: Brand.gold),
              Text('$done/$total', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)),
            ]),
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Text(tr(done == total ? 'Nitnem complete today' : 'Today’s Nitnem'), style: const TextStyle(color: Colors.white, fontSize: 17, fontWeight: FontWeight.w700)),
              const SizedBox(height: 4),
              Text(streak > 0 ? '🔥 $streak day${streak == 1 ? '' : 's'} in a row of morning Nitnem' : tr('Tick each Bani when you finish it.'),
                  style: const TextStyle(color: Colors.white70)),
            ]),
          ),
        ]),
      ),
    );
  }
}

/// A Bani in a list: opens the reader; the checkbox ticks it off for today.
class BaniTile extends StatelessWidget {
  const BaniTile({super.key, required this.bani, this.done, this.onToggle});
  final BaniInfo bani;
  final bool? done;
  final ValueChanged<bool>? onToggle;

  @override
  Widget build(BuildContext context) {
    return ListTile(
      contentPadding: const EdgeInsets.fromLTRB(16, 4, 8, 4),
      title: Text(bani.gurmukhiName.isNotEmpty ? bani.gurmukhiName : bani.name, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
      subtitle: Text([bani.name, if (bani.audio?.duration != null) '${bani.audio!.duration} audio'].join(' · ')),
      onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => BaniReader(bani: bani))),
      trailing: done == null
          ? const Icon(Icons.chevron_right)
          : Checkbox(value: done, onChanged: (v) => onToggle?.call(v ?? false), activeColor: Brand.goldDark, shape: const CircleBorder()),
    );
  }
}
