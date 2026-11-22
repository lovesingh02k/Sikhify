import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'site_api.dart';

/// A submission the website refused, with its message and the fields to fix (e.g. {'message': 'Too short'}).
class ContributeError implements Exception {
  const ContributeError(this.message, [this.fields = const {}]);
  final String message;
  final Map<String, String> fields;
  @override
  String toString() => message;
}

/// Sends what people add, suggest or report to sikhify.in. Nothing is published straight away:
/// the Sikhify team reviews every submission first. No account is needed; a name and email are optional.
class Contribute {
  Contribute._();
  static final _client = http.Client();

  /// New information or feedback (kinds: event, personality, kirtani, website, app, book, organization,
  /// suggestion, incorrect, correction). Returns the reference to quote, e.g. "S-7K2M9Q".
  static Future<String> submission({
    required String kind,
    String message = '',
    String source = '',
    String? targetUrl,
    String? title,
    Map<String, Object?>? data,
    String guestName = '',
    String guestEmail = '',
  }) async {
    final j = await _post('/api/submissions', {
      'kind': kind,
      'message': message,
      'source': source,
      'targetUrl': ?targetUrl,
      'title': ?title,
      'data': ?data,
      'guestName': guestName,
      'guestEmail': guestEmail,
    });
    return '${(j['submission'] as Map?)?['reference'] ?? ''}';
  }

  /// A new Gurdwara, or an update to one already listed (a phone number, a note, a correction).
  static Future<String> gurdwara({
    required bool update,
    int? gurdwaraId,
    String name = '',
    String country = '',
    String state = '',
    String city = '',
    String address = '',
    String phone = '',
    String website = '',
    String details = '',
    String source = '',
    String guestName = '',
    String guestEmail = '',
  }) async {
    final j = await _post('/api/gurdwaras/submissions', {
      'kind': update ? 'update' : 'new',
      'gurdwaraId': ?gurdwaraId,
      'name': name,
      'country': country,
      'state': state,
      'city': city,
      'address': address,
      'phone': phone,
      'website': website,
      'details': details,
      'source': source,
      'guestName': guestName,
      'guestEmail': guestEmail,
    });
    return '${j['reference'] ?? ''}';
  }

  static Future<Map<String, dynamic>> _post(String path, Map<String, Object?> body) async {
    final http.Response r;
    try {
      r = await _client
          .post(
            Uri.parse('${SiteApi.base}$path'),
            // The website accepts changes only with this header (it stops other websites posting for you).
            headers: {'Content-Type': 'application/json', 'Accept': 'application/json', 'X-Sikhify-Request': '1'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 20));
    } on TimeoutException {
      throw const ContributeError('The website took too long to answer. Please try again.');
    } catch (_) {
      throw const ContributeError('No internet connection. Connect and try again.');
    }
    Map<String, dynamic> j;
    try {
      j = (jsonDecode(utf8.decode(r.bodyBytes)) as Map).cast<String, dynamic>();
    } catch (_) {
      j = const {};
    }
    if (r.statusCode >= 200 && r.statusCode < 300) return j;
    final err = (j['error'] is Map) ? (j['error'] as Map).cast<String, dynamic>() : const <String, dynamic>{};
    final fields = (err['fields'] is Map) ? (err['fields'] as Map).map((k, v) => MapEntry('$k', '$v')) : <String, String>{};
    throw ContributeError('${err['message'] ?? 'Couldn’t send this (error ${r.statusCode}). Please try again.'}', fields);
  }
}
