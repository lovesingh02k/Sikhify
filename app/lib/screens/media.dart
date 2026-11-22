import 'dart:async';

import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:youtube_player_iframe/youtube_player_iframe.dart';

import '../services/i18n.dart';
import '../services/site_api.dart';
import '../theme.dart';
import '../widgets/audio_bar.dart';
import '../widgets/gurbani_view.dart';

/// Kirtan and Katha: Ragis, Katha Vachaks and Dhadi Jathas with their videos (from sikhify.in).
class MediaScreen extends StatefulWidget {
  const MediaScreen({super.key});

  @override
  State<MediaScreen> createState() => _MediaScreenState();
}

class _MediaScreenState extends State<MediaScreen> {
  late Future<MediaCatalog> _data = SiteApi.instance.media();
  int _tab = 0;
  String? _category;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(children: [Image.asset('assets/images/khanda.png', width: 28, height: 28), const SizedBox(width: 8), Text(tr('Media'))]),
        actions: [IconButton(tooltip: 'Search', icon: const Icon(Icons.search_rounded, size: 28), onPressed: () => _search(context))],
      ),
      body: FutureBuilder<MediaCatalog>(
        future: _data,
        builder: (context, snap) {
          if (snap.hasError) return ErrorView(message: '${snap.error}', onRetry: () => setState(() => _data = SiteApi.instance.media()));
          if (!snap.hasData) return const Center(child: CircularProgressIndicator());
          final cat = snap.data!;
          final artists = cat.artists.where((a) => _category == null || a.category == _category).toList();
          return Column(children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
              child: Row(children: [
                for (final (i, label) in [(0, tr('Singers')), (1, tr('Videos')), (2, 'A-Z')])
                  Expanded(
                    child: Padding(
                      padding: EdgeInsets.only(right: i < 2 ? 8 : 0),
                      child: _Segment(label: label, selected: _tab == i, onTap: () => setState(() => _tab = i)),
                    ),
                  ),
              ]),
            ),
            SizedBox(
              height: 40,
              child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 16), children: [
                for (final c in [null, ...cat.categories])
                  Padding(
                    padding: const EdgeInsets.only(right: 8),
                    child: ChoiceChip(label: Text(c ?? tr('All')), selected: _category == c, showCheckmark: false, onSelected: (_) => setState(() => _category = c)),
                  ),
              ]),
            ),
            const SizedBox(height: 6),
            Expanded(
              child: switch (_tab) {
                0 => ListView.builder(padding: const EdgeInsets.fromLTRB(16, 4, 16, 24), itemCount: artists.length, itemBuilder: (_, i) => ArtistRow(artist: artists[i])),
                1 => _VideoGrid(videos: [for (final a in artists) ...a.videos]),
                _ => _AtoZ(artists: [...artists]..sort((a, b) => a.sortName.toLowerCase().compareTo(b.sortName.toLowerCase()))),
              },
            ),
          ]);
        },
      ),
    );
  }

  Future<void> _search(BuildContext context) async {
    final cat = await _data;
    if (!context.mounted) return;
    showSearch<void>(context: context, delegate: _MediaSearch(cat));
  }
}

class _Segment extends StatelessWidget {
  const _Segment({required this.label, required this.selected, required this.onTap});
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Material(
        color: selected ? Brand.navyDeep : (Theme.of(context).brightness == Brightness.dark ? const Color(0xFF16233F) : Brand.sand),
        borderRadius: BorderRadius.circular(12),
        child: InkWell(
          borderRadius: BorderRadius.circular(12),
          onTap: onTap,
          // A fixed height, so every segment lines up whatever the label's glyphs.
          child: SizedBox(
            height: 44,
            child: Center(
              child: Text(label, maxLines: 1, textAlign: TextAlign.center, style: TextStyle(fontWeight: FontWeight.w700, color: selected ? Colors.white : Theme.of(context).colorScheme.onSurface)),
            ),
          ),
        ),
      );
}

/// A round portrait stand-in: the artist's initials (Sikhify has no artist photos).
class ArtistAvatar extends StatelessWidget {
  const ArtistAvatar({super.key, required this.artist, this.size = 54});
  final Artist artist;
  final double size;

  static const _tones = [Color(0xFF13274A), Color(0xFF7A4B12), Color(0xFF1F5C4A), Color(0xFF5A2A4F), Color(0xFF2E4A7A), Color(0xFF6B3B1F)];

  @override
  Widget build(BuildContext context) => Container(
        width: size, height: size,
        decoration: BoxDecoration(color: _tones[artist.id.hashCode.abs() % _tones.length], shape: BoxShape.circle, border: Border.all(color: Brand.gold.withValues(alpha: 0.7), width: 2)),
        alignment: Alignment.center,
        child: Text(artist.initials, style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800, fontSize: size * 0.34)),
      );
}

class ArtistRow extends StatelessWidget {
  const ArtistRow({super.key, required this.artist});
  final Artist artist;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsets.only(bottom: 10),
        child: Card(
          clipBehavior: Clip.antiAlias,
          child: InkWell(
            onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => ArtistScreen(artist: artist))),
            child: Padding(
              padding: const EdgeInsets.all(10),
              child: Row(children: [
                ArtistAvatar(artist: artist),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                    Text(artist.name, style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 15)),
                    Text([artist.category, '${artist.videos.length} video${artist.videos.length == 1 ? '' : 's'}'].join(' · '),
                        style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
                  ]),
                ),
                if (artist.videos.isNotEmpty)
                  IconButton.filled(
                    style: IconButton.styleFrom(backgroundColor: Brand.navyDeep, foregroundColor: Colors.white),
                    tooltip: 'Play',
                    onPressed: () => openVideo(context, artist.videos.first, artist),
                    icon: const Icon(Icons.play_arrow_rounded),
                  ),
              ]),
            ),
          ),
        ),
      );
}

class _VideoGrid extends StatelessWidget {
  const _VideoGrid({required this.videos});
  final List<Video> videos;

  @override
  Widget build(BuildContext context) => ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
        itemCount: videos.length,
        separatorBuilder: (_, _) => const SizedBox(height: 14),
        itemBuilder: (context, i) => VideoCard(video: videos[i]),
      );
}

class VideoCard extends StatelessWidget {
  const VideoCard({super.key, required this.video, this.artist});
  final Video video;
  final Artist? artist;

  @override
  Widget build(BuildContext context) => InkWell(
        borderRadius: BorderRadius.circular(16),
        onTap: () => openVideo(context, video, artist),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Stack(children: [
            AspectRatio(aspectRatio: 16 / 9, child: Pic(video.thumb, radius: 16)),
            Positioned.fill(child: Center(child: Container(padding: const EdgeInsets.all(10), decoration: const BoxDecoration(color: Colors.black45, shape: BoxShape.circle), child: const Icon(Icons.play_arrow_rounded, color: Colors.white, size: 34)))),
            if (video.duration.isNotEmpty)
              Positioned(
                right: 8, bottom: 8,
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                  decoration: BoxDecoration(color: Colors.black87, borderRadius: BorderRadius.circular(6)),
                  child: Text(video.duration, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                ),
              ),
          ]),
          const SizedBox(height: 8),
          Row(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(video.title, maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w700)),
                Text(video.artist, style: TextStyle(fontSize: 13, color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
            ),
            const SizedBox(width: 8),
            YouTubeButton(id: video.id),
          ]),
        ]),
      );
}

class _AtoZ extends StatelessWidget {
  const _AtoZ({required this.artists});
  final List<Artist> artists;

  @override
  Widget build(BuildContext context) {
    final rows = <Widget>[];
    String? letter;
    for (final a in artists) {
      final l = a.sortName.isEmpty ? '#' : a.sortName[0].toUpperCase();
      if (l != letter) {
        letter = l;
        rows.add(Padding(padding: const EdgeInsets.fromLTRB(4, 12, 4, 6), child: Text(l, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800, color: Brand.goldDark))));
      }
      rows.add(ArtistRow(artist: a));
    }
    return ListView(padding: const EdgeInsets.fromLTRB(16, 0, 16, 24), children: rows);
  }
}

class ArtistScreen extends StatelessWidget {
  const ArtistScreen({super.key, required this.artist});
  final Artist artist;

  @override
  Widget build(BuildContext context) => Scaffold(
        appBar: AppBar(title: Text(artist.name, maxLines: 1, overflow: TextOverflow.ellipsis)),
        body: ListView(padding: const EdgeInsets.fromLTRB(16, 8, 16, 24), children: [
          Row(children: [
            ArtistAvatar(artist: artist, size: 84),
            const SizedBox(width: 16),
            Expanded(
              child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                Text(artist.name, style: serif(24, color: Theme.of(context).colorScheme.onSurface)),
                const SizedBox(height: 4),
                Text([artist.category, if (artist.location.isNotEmpty) artist.location].join(' · '), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
              ]),
            ),
          ]),
          if (artist.description.isNotEmpty) ...[const SizedBox(height: 14), Text(artist.description, style: const TextStyle(height: 1.5))],
          const SizedBox(height: 18),
          Text('Videos', style: sectionTitle(context)),
          const SizedBox(height: 10),
          for (final v in artist.videos) Padding(padding: const EdgeInsets.only(bottom: 16), child: VideoCard(video: v, artist: artist)),
        ]),
      );
}

/// Opens a video in the YouTube app (or youtube.com when the app isn't installed).
void openOnYouTube(String id) => launchUrl(Uri.parse('https://www.youtube.com/watch?v=$id'), mode: LaunchMode.externalApplication);

/// The red "play on YouTube" button shown with every video. [compact] is the icon alone.
class YouTubeButton extends StatelessWidget {
  const YouTubeButton({super.key, required this.id, this.compact = false});
  final String id;
  final bool compact;
  static const red = Color(0xFFFF0000);

  @override
  Widget build(BuildContext context) => compact
      ? IconButton(
          tooltip: tr('Play on YouTube'),
          onPressed: () => openOnYouTube(id),
          icon: const Icon(Icons.smart_display_rounded, color: red, size: 30),
        )
      : FilledButton.icon(
          style: FilledButton.styleFrom(
            backgroundColor: red,
            foregroundColor: Colors.white,
            visualDensity: VisualDensity.compact,
            padding: const EdgeInsets.symmetric(horizontal: 12),
            shape: const StadiumBorder(),
          ),
          onPressed: () => openOnYouTube(id),
          icon: const Icon(Icons.smart_display_rounded, size: 18),
          label: const Text('YouTube', style: TextStyle(fontWeight: FontWeight.w700)),
        );
}

void openVideo(BuildContext context, Video video, [Artist? artist]) {
  Audio.player.pause(); // one sound at a time
  Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => VideoScreen(video: video, artist: artist)));
}

/// Plays a YouTube video inside the app.
class VideoScreen extends StatefulWidget {
  const VideoScreen({super.key, required this.video, this.artist});
  final Video video;
  final Artist? artist;

  @override
  State<VideoScreen> createState() => _VideoScreenState();
}

class _VideoScreenState extends State<VideoScreen> {
  late final YoutubePlayerController _yt = YoutubePlayerController.fromVideoId(
    videoId: widget.video.id,
    autoPlay: true,
    params: const YoutubePlayerParams(showFullscreenButton: true, strictRelatedVideos: true),
  );
  StreamSubscription<YoutubePlayerValue>? _sub;
  YoutubeError _error = YoutubeError.none;

  @override
  void initState() {
    super.initState();
    // Some owners turn off "Allow embedding" on YouTube; such a video can only play in YouTube itself.
    _sub = _yt.stream.listen((v) {
      if (mounted && v.error != YoutubeError.none && v.error != _error) setState(() => _error = v.error);
    });
  }

  void _openInYouTube() => openOnYouTube(widget.video.id);

  @override
  void dispose() {
    _sub?.cancel();
    _yt.close();
    super.dispose();
  }

  Widget _unavailable(BuildContext context) {
    final blocked = _error == YoutubeError.notEmbeddable || _error == YoutubeError.sameAsNotEmbeddable || _error == YoutubeError.sameAsNotEmbeddable2;
    final gone = _error == YoutubeError.videoNotFound || _error == YoutubeError.cannotFindVideo;
    return AspectRatio(
      aspectRatio: 16 / 9,
      child: Stack(fit: StackFit.expand, children: [
        Pic(widget.video.thumb, radius: 0),
        Container(color: Colors.black.withValues(alpha: 0.72)),
        Padding(
          padding: const EdgeInsets.all(20),
          child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
            Text(
              gone
                  ? tr('This video is no longer on YouTube.')
                  : blocked
                      ? tr('This video can only be played on YouTube.')
                      : tr('This video could not be played here.'),
              textAlign: TextAlign.center,
              style: const TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.w700),
            ),
            if (!gone) ...[
              const SizedBox(height: 14),
              FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: const Color(0xFFFF0000), foregroundColor: Colors.white),
                onPressed: _openInYouTube,
                icon: const Icon(Icons.play_arrow_rounded),
                label: Text(tr('Watch on YouTube')),
              ),
            ],
          ]),
        ),
      ]),
    );
  }

  @override
  Widget build(BuildContext context) {
    final v = widget.video;
    final more = (widget.artist?.videos ?? const <Video>[]).where((x) => x.id != v.id).toList();
    return Scaffold(
      appBar: AppBar(title: Text(v.artist, maxLines: 1, overflow: TextOverflow.ellipsis)),
      body: ListView(children: [
        if (_error == YoutubeError.none) YoutubePlayer(controller: _yt) else _unavailable(context),
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 0),
          child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(v.title, style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w800)),
            const SizedBox(height: 4),
            Text([v.artist, if (v.channel.isNotEmpty) v.channel, if (v.duration.isNotEmpty) v.duration].join(' · '), style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: FilledButton.icon(
                style: FilledButton.styleFrom(backgroundColor: YouTubeButton.red, foregroundColor: Colors.white, minimumSize: const Size.fromHeight(48), shape: const StadiumBorder()),
                onPressed: _openInYouTube,
                icon: const Icon(Icons.smart_display_rounded),
                label: Text(tr('Play on YouTube'), style: const TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            const SizedBox(height: 8),
            if (more.isNotEmpty) ...[
              const SizedBox(height: 8),
              Text('More from ${v.artist}', style: sectionTitle(context)),
              const SizedBox(height: 10),
              for (final m in more)
                Padding(
                  padding: const EdgeInsets.only(bottom: 12),
                  child: InkWell(
                    onTap: () => Navigator.of(context).pushReplacement(MaterialPageRoute<void>(builder: (_) => VideoScreen(video: m, artist: widget.artist))),
                    child: Row(children: [
                      SizedBox(width: 140, child: AspectRatio(aspectRatio: 16 / 9, child: Pic(m.thumb, radius: 10))),
                      const SizedBox(width: 12),
                      Expanded(child: Text(m.title, maxLines: 3, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600))),
                      YouTubeButton(id: m.id, compact: true),
                    ]),
                  ),
                ),
            ],
            const SizedBox(height: 24),
          ]),
        ),
      ]),
    );
  }
}

class _MediaSearch extends SearchDelegate<void> {
  _MediaSearch(this.cat) : super(searchFieldLabel: 'Search singers and videos');
  final MediaCatalog cat;

  @override
  List<Widget> buildActions(BuildContext context) => [if (query.isNotEmpty) IconButton(onPressed: () => query = '', icon: const Icon(Icons.clear))];

  @override
  Widget buildLeading(BuildContext context) => BackButton(onPressed: () => close(context, null));

  @override
  Widget buildResults(BuildContext context) => buildSuggestions(context);

  @override
  Widget buildSuggestions(BuildContext context) {
    final q = query.toLowerCase().trim();
    if (q.isEmpty) return const SizedBox.shrink();
    final artists = cat.artists.where((a) => '${a.name} ${a.location} ${a.category}'.toLowerCase().contains(q)).toList();
    final videos = [for (final a in cat.artists) ...a.videos.where((v) => v.title.toLowerCase().contains(q)).map((v) => (v, a))];
    return ListView(padding: const EdgeInsets.all(16), children: [
      for (final a in artists) ArtistRow(artist: a),
      for (final (v, a) in videos)
        ListTile(
          contentPadding: EdgeInsets.zero,
          leading: SizedBox(width: 96, child: AspectRatio(aspectRatio: 16 / 9, child: Pic(v.thumb, radius: 8))),
          title: Text(v.title, maxLines: 2, overflow: TextOverflow.ellipsis),
          subtitle: Text(a.name),
          trailing: YouTubeButton(id: v.id, compact: true),
          onTap: () => openVideo(context, v, a),
        ),
      if (artists.isEmpty && videos.isEmpty) const Padding(padding: EdgeInsets.all(24), child: Text('Nothing found.', textAlign: TextAlign.center)),
    ]);
  }
}
