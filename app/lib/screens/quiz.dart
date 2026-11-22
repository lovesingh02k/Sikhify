import 'package:flutter/material.dart';
import 'package:share_plus/share_plus.dart';

import '../services/i18n.dart';
import '../services/links.dart';
import '../services/quiz.dart';
import '../services/reminders.dart';
import '../services/settings.dart';
import '../theme.dart';

/// Questions one at a time: answer, see if it was right, then the next. Used by the Daily Quiz
/// and by every quiz in the Kids section.
class QuizStepper extends StatefulWidget {
  const QuizStepper({super.key, required this.questions, required this.answers, required this.onAnswer, required this.finished});
  final List<QuizQuestion> questions;

  /// The option chosen for each question so far (null = not answered).
  final List<int?> answers;
  final void Function(int question, int option) onAnswer;

  /// What to show once every question is answered (the score).
  final Widget Function(BuildContext context, int score) finished;

  @override
  State<QuizStepper> createState() => _QuizStepperState();
}

class _QuizStepperState extends State<QuizStepper> {
  // Opens on the first unanswered question (e.g. after leaving half-way through).
  late int _at = _firstOpen();
  // The score shows once the last answer is in and "See my score" is tapped, or straight away
  // when a finished quiz is opened again.
  late bool _finished = widget.answers.every((a) => a != null);

  int _firstOpen() {
    final i = widget.answers.indexWhere((a) => a == null);
    return i < 0 ? widget.questions.length - 1 : i;
  }

  @override
  void didUpdateWidget(QuizStepper old) {
    super.didUpdateWidget(old);
    if (widget.answers.every((a) => a == null) && old.answers.any((a) => a != null)) {
      _at = 0; // played again
      _finished = false;
    }
  }

  @override
  Widget build(BuildContext context) {
    final n = widget.questions.length;
    if (n == 0) return const SizedBox.shrink();
    final score = [for (final (i, q) in widget.questions.indexed) if (widget.answers[i] == q.answer) 1].length;
    if (_finished) return widget.finished(context, score);
    final q = widget.questions[_at];
    final picked = widget.answers[_at];
    final scheme = Theme.of(context).colorScheme;
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      // Where we are: one dot per question, green or orange once answered.
      Row(children: [
        Text('${tr('Question')} ${_at + 1} / $n', style: const TextStyle(fontWeight: FontWeight.w800)),
        const Spacer(),
        for (final (i, a) in widget.answers.indexed)
          Container(
            width: i == _at ? 22 : 10,
            height: 10,
            margin: const EdgeInsets.only(left: 5),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(10),
              color: a == null ? (i == _at ? Brand.gold : scheme.outlineVariant) : (a == widget.questions[i].answer ? const Color(0xFF1F7A4C) : const Color(0xFFC2410C)),
            ),
          ),
      ]),
      const SizedBox(height: 14),
      Card(
        child: Padding(
          padding: const EdgeInsets.all(18),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Expanded(child: Text(q.question, style: const TextStyle(fontSize: 19, fontWeight: FontWeight.w800, height: 1.35))),
              IconButton(
                tooltip: tr('Ask a friend'),
                visualDensity: VisualDensity.compact,
                icon: const Icon(Icons.share_outlined),
                onPressed: () => SharePlus.instance.share(ShareParams(text: shareQuestionText(q))),
              ),
            ]),
            if (q.detail != null && q.detail!.isNotEmpty) ...[
              const SizedBox(height: 10),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(12)),
                child: Text(q.detail!, style: const TextStyle(fontSize: 15, height: 1.45, fontStyle: FontStyle.italic)),
              ),
            ],
            const SizedBox(height: 14),
            for (final (j, o) in q.options.indexed)
              Padding(
                padding: const EdgeInsets.only(bottom: 8),
                child: _Option(
                  letter: String.fromCharCode(65 + j),
                  text: o,
                  state: picked == null ? _OptionState.open : (j == q.answer ? _OptionState.right : (j == picked ? _OptionState.wrong : _OptionState.other)),
                  onTap: picked == null ? () => widget.onAnswer(_at, j) : null,
                ),
              ),
            if (picked != null) ...[
              const SizedBox(height: 4),
              Row(children: [
                Icon(picked == q.answer ? Icons.celebration_rounded : Icons.lightbulb_outline_rounded, color: picked == q.answer ? const Color(0xFF1F7A4C) : Brand.goldDark),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(picked == q.answer ? tr('Shabaash! That’s right.') : '${tr('Good try! The answer is')} ${q.options[q.answer]}.',
                      style: const TextStyle(fontWeight: FontWeight.w700)),
                ),
              ]),
            ],
          ]),
        ),
      ),
      const SizedBox(height: 12),
      if (picked != null)
        FilledButton.icon(
          style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(52), shape: const StadiumBorder()),
          onPressed: () => setState(() {
            final next = _firstOpenFrom(_at + 1);
            if (next == null) {
              _finished = true;
            } else {
              _at = next;
            }
          }),
          icon: Icon(_firstOpenFrom(_at + 1) != null ? Icons.arrow_forward_rounded : Icons.emoji_events_rounded),
          label: Text(_firstOpenFrom(_at + 1) != null ? tr('Next question') : tr('See my score')),
        ),
    ]);
  }

  /// The next unanswered question after [from] (wrapping round to any skipped earlier), or null when all are done.
  int? _firstOpenFrom(int from) {
    final n = widget.answers.length;
    for (var k = 0; k < n; k++) {
      final i = (from + k) % n;
      if (widget.answers[i] == null) return i;
    }
    return null;
  }
}

enum _OptionState { open, right, wrong, other }

class _Option extends StatelessWidget {
  const _Option({required this.letter, required this.text, required this.state, this.onTap});
  final String letter, text;
  final _OptionState state;
  final VoidCallback? onTap;

  @override
  Widget build(BuildContext context) {
    const green = Color(0xFF1F7A4C), orange = Color(0xFFC2410C);
    final border = switch (state) { _OptionState.right => green, _OptionState.wrong => orange, _ => Theme.of(context).colorScheme.outlineVariant };
    final fill = switch (state) { _OptionState.right => green.withValues(alpha: 0.14), _OptionState.wrong => orange.withValues(alpha: 0.12), _ => Colors.transparent };
    return Material(
      color: fill,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14), side: BorderSide(color: border, width: state == _OptionState.open || state == _OptionState.other ? 1 : 2)),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
          child: Row(children: [
            CircleAvatar(
              radius: 14,
              backgroundColor: state == _OptionState.right ? green : (state == _OptionState.wrong ? orange : Brand.gold.withValues(alpha: 0.25)),
              child: state == _OptionState.right
                  ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                  : state == _OptionState.wrong
                      ? const Icon(Icons.close_rounded, size: 16, color: Colors.white)
                      : Text(letter, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 13, color: Brand.goldDark)),
            ),
            const SizedBox(width: 12),
            Expanded(child: Text(text, style: const TextStyle(fontSize: 15.5, fontWeight: FontWeight.w600))),
          ]),
        ),
      ),
    );
  }
}

/* --------------------------------------------------------------- the Daily Quiz */

/// Five questions a day, one at a time, with the score, the streak and the daily reminder.
class DailyQuizScreen extends StatefulWidget {
  const DailyQuizScreen({super.key});
  @override
  State<DailyQuizScreen> createState() => _DailyQuizScreenState();
}

class _DailyQuizScreenState extends State<DailyQuizScreen> {
  late final List<QuizQuestion> _questions = Quiz.today();
  late List<int?> _answers = Quiz.answers();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(tr('Daily Quiz'))),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 32), children: [
        Text(tr('5 new questions every day — on the Gurus, Sikh history, Gurbani and Sikh life.'), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        const SizedBox(height: 16),
        QuizStepper(
          questions: _questions,
          answers: _answers,
          onAnswer: (i, j) {
            Quiz.answer(i, j);
            setState(() => _answers = Quiz.answers());
          },
          finished: (context, score) => _Score(score: score, total: _questions.length, questions: _questions, answers: _answers),
        ),
      ]),
    );
  }
}

class _Score extends StatelessWidget {
  const _Score({required this.score, required this.total, required this.questions, required this.answers});
  final int score, total;
  final List<QuizQuestion> questions;
  final List<int?> answers;

  @override
  Widget build(BuildContext context) {
    final streak = Quiz.streak();
    final message = score == total ? tr('Perfect! Waheguru Ji Ka Khalsa, Waheguru Ji Ki Fateh!') : score >= total - 2 ? tr('Very good! Keep learning.') : tr('Good effort — you’ll know these next time.');
    return Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
      Container(
        padding: const EdgeInsets.all(22),
        decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(22)),
        child: Column(children: [
          const Icon(Icons.emoji_events_rounded, color: Brand.gold, size: 52),
          const SizedBox(height: 8),
          Text('$score / $total', style: serif(44, color: Colors.white)),
          const SizedBox(height: 6),
          Text(message, textAlign: TextAlign.center, style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w600)),
          if (streak > 0) ...[
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(30)),
              child: Text('🔥 ${tr('Streak')}: $streak ${streak == 1 ? tr('day') : tr('days')}', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w800)),
            ),
          ],
        ]),
      ),
      const SizedBox(height: 14),
      Text(tr('Come back tomorrow for 5 new questions.'), textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w700)),
      const SizedBox(height: 12),
      FilledButton.icon(
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: const StadiumBorder()),
        onPressed: () => SharePlus.instance.share(ShareParams(text: shareScoreText(score: score, questions: questions, answers: answers, streak: streak))),
        icon: const Icon(Icons.share_rounded),
        label: Text(tr('Share my score')),
      ),
      const SizedBox(height: 12),
      const QuizReminderSwitch(),
    ]);
  }
}

/// Turns the daily quiz notification on or off (asking Android for permission the first time).
class QuizReminderSwitch extends StatelessWidget {
  const QuizReminderSwitch({super.key});

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: Settings.instance,
        builder: (context, _) {
          final kind = Reminders.kinds.firstWhere((k) => k.key == 'quiz');
          final minutes = Settings.instance.reminder('quiz');
          final at = TimeOfDay(hour: (minutes ?? kind.defaultMinutes) ~/ 60, minute: (minutes ?? kind.defaultMinutes) % 60);
          return Card(
            child: SwitchListTile(
              secondary: const Icon(Icons.notifications_active_outlined, color: Brand.goldDark),
              title: Text(tr('Remind me every day'), style: const TextStyle(fontWeight: FontWeight.w700)),
              subtitle: Text(minutes == null ? tr('A notification when the new questions are ready') : '${tr('Every day at')} ${at.format(context)}'),
              value: minutes != null,
              onChanged: (on) async {
                if (on && !await Reminders.requestPermission()) {
                  if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(tr('Allow notifications for Sikhify in your phone settings.'))));
                  return;
                }
                await Reminders.set(kind, on ? kind.defaultMinutes : null);
              },
            ),
          );
        },
      );
}

/// The Daily Quiz on the Home screen: how far today's quiz has got, and the way in.
class DailyQuizCard extends StatefulWidget {
  const DailyQuizCard({super.key});
  @override
  State<DailyQuizCard> createState() => _DailyQuizCardState();
}

class _DailyQuizCardState extends State<DailyQuizCard> {
  @override
  Widget build(BuildContext context) {
    final answers = Quiz.answers();
    final done = answers.whereType<int>().length;
    final questions = done == Quiz.perDay ? Quiz.today() : null;
    final score = questions == null ? 0 : [for (final (i, q) in questions.indexed) if (answers[i] == q.answer) 1].length;
    return Card(
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: () async {
          await Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => const DailyQuizScreen()));
          if (mounted) setState(() {}); // show today's progress
        },
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(children: [
            Container(
              width: 52,
              height: 52,
              decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(16)),
              child: const Icon(Icons.quiz_rounded, color: Brand.gold, size: 28),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(tr('Daily Quiz'), style: const TextStyle(fontSize: 17, fontWeight: FontWeight.w800)),
                const SizedBox(height: 2),
                Text(
                  done == Quiz.perDay ? '${tr('Done for today')} · $score / ${Quiz.perDay}' : done == 0 ? tr('5 new questions are waiting') : '$done / ${Quiz.perDay} ${tr('answered')}',
                  style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
                ),
              ]),
            ),
            Icon(done == Quiz.perDay ? Icons.check_circle_rounded : Icons.play_circle_fill_rounded, color: done == Quiz.perDay ? const Color(0xFF1F7A4C) : Brand.gold, size: 34),
          ]),
        ),
      ),
    );
  }
}

/// "I got 4/5 in today's Sikhify Daily Quiz ✅✅❌✅✅" with today's questions (no answers), so friends can try them.
String shareScoreText({required int score, required List<QuizQuestion> questions, required List<int?> answers, required int streak}) {
  final marks = [for (final (i, q) in questions.indexed) answers[i] == q.answer ? '✅' : '❌'].join();
  final out = StringBuffer('${tr('Sikhify Daily Quiz')} — $score/${questions.length} $marks');
  if (streak > 1) out.write('\n🔥 ${tr('Streak')}: $streak ${tr('days')}');
  out.write('\n\n${tr('Can you answer today’s questions?')}\n');
  for (final (i, q) in questions.indexed) {
    out.write('\n${i + 1}. ${q.question}');
    if (q.detail != null && q.detail!.isNotEmpty) out.write(' — ${q.detail}');
  }
  // The link opens these same questions in the friend's Sikhify app.
  out.write('\n\n${tr('Play these questions in the Sikhify app')}:\n${Links.quiz([for (final q in questions) q.id], score: score)}');
  return out.toString();
}

/// One question with its options, to ask someone (the answer isn't included).
String shareQuestionText(QuizQuestion q) {
  final out = StringBuffer('${tr('Can you answer this?')} 🤔\n\n${q.question}');
  if (q.detail != null && q.detail!.isNotEmpty) out.write('\n“${q.detail}”');
  out.write('\n');
  for (final (j, o) in q.options.indexed) {
    out.write('\n${String.fromCharCode(65 + j)}) $o');
  }
  out.write('\n\n${tr('Answer it in the Sikhify app')}:\n${Links.quiz([q.id])}');
  return out.toString();
}

/// A quiz someone shared: the same questions, played here, answered one at a time.
class FriendQuizScreen extends StatefulWidget {
  const FriendQuizScreen({super.key, required this.questions, this.friendScore});
  final List<QuizQuestion> questions;

  /// The score of the friend who shared it (when they finished it).
  final int? friendScore;

  @override
  State<FriendQuizScreen> createState() => _FriendQuizScreenState();
}

class _FriendQuizScreenState extends State<FriendQuizScreen> {
  late List<int?> _answers = List<int?>.filled(widget.questions.length, null);

  @override
  Widget build(BuildContext context) {
    final n = widget.questions.length;
    return Scaffold(
      appBar: AppBar(title: Text(tr('Quiz from a friend'))),
      body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 32), children: [
        Container(
          padding: const EdgeInsets.all(14),
          decoration: BoxDecoration(color: Brand.gold.withValues(alpha: 0.16), borderRadius: BorderRadius.circular(14)),
          child: Row(children: [
            const Icon(Icons.people_alt_rounded, color: Brand.goldDark),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                widget.friendScore != null ? '${tr('Your friend got')} ${widget.friendScore}/$n. ${tr('Can you beat them?')}' : tr('A friend sent you this question. Can you answer it?'),
                style: const TextStyle(fontWeight: FontWeight.w700),
              ),
            ),
          ]),
        ),
        const SizedBox(height: 16),
        QuizStepper(
          questions: widget.questions,
          answers: _answers,
          onAnswer: (i, j) => setState(() => _answers = [..._answers]..[i] = j),
          finished: (context, score) => Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
            Container(
              padding: const EdgeInsets.all(22),
              decoration: BoxDecoration(gradient: Brand.nightGradient, borderRadius: BorderRadius.circular(22)),
              child: Column(children: [
                const Icon(Icons.emoji_events_rounded, color: Brand.gold, size: 48),
                Text('$score / $n', style: serif(40, color: Colors.white)),
                if (widget.friendScore != null)
                  Text(
                    score > widget.friendScore! ? tr('You beat your friend!') : score == widget.friendScore! ? tr('A tie with your friend!') : tr('Your friend wins this time.'),
                    style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700),
                  ),
              ]),
            ),
            const SizedBox(height: 12),
            FilledButton.icon(
              style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: const StadiumBorder()),
              onPressed: () => SharePlus.instance.share(ShareParams(text: shareScoreText(score: score, questions: widget.questions, answers: _answers, streak: 0))),
              icon: const Icon(Icons.share_rounded),
              label: Text(tr('Share my score')),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              style: OutlinedButton.styleFrom(minimumSize: const Size.fromHeight(50), shape: const StadiumBorder()),
              onPressed: () => Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => const DailyQuizScreen())),
              icon: const Icon(Icons.quiz_rounded),
              label: Text(tr('Play today’s Daily Quiz')),
            ),
          ]),
        ),
      ]),
    );
  }
}
