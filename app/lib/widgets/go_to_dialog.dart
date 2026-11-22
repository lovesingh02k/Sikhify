import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

import '../services/i18n.dart';

/// Asks for a number from [min] to [max] (a page, an Ang); null when cancelled.
Future<int?> askNumber(BuildContext context, {required String title, required String label, required int min, required int max, int? current}) =>
    showDialog<int>(context: context, builder: (_) => _NumberDialog(title: title, label: label, min: min, max: max, current: current));

class _NumberDialog extends StatefulWidget {
  const _NumberDialog({required this.title, required this.label, required this.min, required this.max, this.current});
  final String title, label;
  final int min, max;
  final int? current;

  @override
  State<_NumberDialog> createState() => _NumberDialogState();
}

class _NumberDialogState extends State<_NumberDialog> {
  late final _text = TextEditingController(text: widget.current?.toString() ?? '')..selection = TextSelection(baseOffset: 0, extentOffset: (widget.current?.toString() ?? '').length);
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _go() {
    final n = int.tryParse(_text.text.trim());
    if (n == null || n < widget.min || n > widget.max) {
      setState(() => _error = tr('Enter a number from {min} to {max}').replaceAll('{min}', '${widget.min}').replaceAll('{max}', '${widget.max}'));
      return;
    }
    Navigator.of(context).pop(n);
  }

  @override
  Widget build(BuildContext context) => AlertDialog(
        title: Text(widget.title),
        content: TextField(
          controller: _text,
          autofocus: true,
          keyboardType: TextInputType.number,
          textInputAction: TextInputAction.go,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly, LengthLimitingTextInputFormatter(5)],
          onSubmitted: (_) => _go(),
          decoration: InputDecoration(
            labelText: widget.label,
            helperText: '${widget.min} – ${widget.max}',
            errorText: _error,
            border: const OutlineInputBorder(),
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.of(context).pop(), child: Text(tr('Cancel'))),
          FilledButton(onPressed: _go, child: Text(tr('Go'))),
        ],
      );
}
