import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:webview_flutter_android/webview_flutter_android.dart';

import '../../core/device/device_info.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import '../../data/models/episode.dart';
import '../../data/models/stream_source.dart';
import '../../data/services/continue_watching.dart';
import '../../shared/widgets/content_row.dart';
import '../../shared/widgets/loading.dart';
import '../auth/auth_controller.dart';
import 'tv_remote_handler.dart';
import 'custom_player.dart';
import 'watch_controller.dart';

/// Injected into every embed page once loaded. Neutralises the popup-ad vectors
/// these servers use: `window.open`, programmatic `target=_blank` links, and
/// blocking dialogs.
const String _kAntiPopupJs = '''
(function(){
  try { window.open = function(){ return null; }; } catch(e){}
  try { window.alert = function(){}; window.confirm = function(){return true;}; } catch(e){}
  document.addEventListener('click', function(e){
    var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"]') : null;
    if (a) { a.removeAttribute('target'); }
  }, true);
  try {
    new MutationObserver(function(){
      document.querySelectorAll('a[target="_blank"]').forEach(function(a){ a.removeAttribute('target'); });
    }).observe(document.documentElement, { childList: true, subtree: true });
  } catch(e){}
})();
''';

/// Categories the website groups servers under.
String categoryOf(StreamSource s) {
  final lang = s.language.toLowerCase();
  final cat = (s.category ?? '').toLowerCase();
  if (lang.contains('hindi') || cat == 'hindi') return 'Hindi Dub';
  if (lang.contains('english') || lang == 'dub' || cat == 'dub') {
    return 'English Dub';
  }
  if (cat == 'raw' || lang == 'raw') return 'Raw';
  return 'Subbed';
}

/// Map real provider names → neutral display names.
/// Real names kept as comments so devs know the mapping.
const _providerDisplayNames = <String, String>{
  'HiAnime': 'Provider 1', // HiAnime
  'AniNeko': 'Provider 2', // AniNeko
  'VidSrc': 'Provider 3', // VidSrc
  '9anime': 'Provider 4', // 9anime
  'Animelok': 'Provider 5', // Animelok
  'DesiDubAnime': 'Provider 6', // DesiDub
  'DesiDub': 'Provider 6', // DesiDub
  'AnimeHindiDubbed': 'Provider 7', // AnimeHindiDubbed
  'AnimeHindiDubbed-WP': 'Provider 7', // AnimeHindiDubbed
  'AHD (AnimeHindiDubbed)': 'Provider 7', // AnimeHindiDubbed (legacy)
  'Toonstream': 'Provider 8', // Toonstream
  'WatchAnimeWorld': 'Provider 9', // WatchAnimeWorld
  'Aniwaves': 'Provider 10', // Aniwaves
  'Animen': 'Provider 11', // Animen
  'AnimixStream': 'Provider 12', // AnimixStream
  'AnimePahe': 'Provider 13', // AnimePahe
};

/// Neutralize a raw provider name to "Provider N" display name.
String _neutralizeProvider(String raw) {
  // Direct match
  final direct = _providerDisplayNames[raw];
  if (direct != null) return direct;
  // Prefix match for compound names like "Miruro (kiwi)"
  for (final key in _providerDisplayNames.keys) {
    if (raw.startsWith(key)) return _providerDisplayNames[key]!;
  }
  return 'Provider';
}

/// provider -> category -> sources, mirroring the website's groupedSources.
Map<String, Map<String, List<StreamSource>>> groupSources(
  List<StreamSource> sources,
) {
  final out = <String, Map<String, List<StreamSource>>>{};
  for (final s in sources) {
    final prov = _neutralizeProvider(s.provider);
    out.putIfAbsent(prov, () => {}).putIfAbsent(categoryOf(s), () => []).add(s);
  }
  return out;
}

String sourceLabel(StreamSource s, int index) {
  final n = s.name?.trim();
  if (n != null && n.isNotEmpty) return n;
  final q = s.quality;
  if (q.isNotEmpty && q.toLowerCase() != 'auto') return q;
  return s.isEmbed ? 'Server ${index + 1}' : 'File ${index + 1}';
}

/// Wraps an interactive cell so that on TV it shows the app's focus treatment —
/// a red ring + soft glow + a slight scale-up — and is activatable by the D-pad
/// center / Enter key (via [ActivateIntent]). On phone / tablet it degrades to a
/// plain [InkWell], so touch ripples and behaviour stay exactly as before.
///
/// Mirrors the focus pattern used by [AnimeCard].
class _TvFocusable extends StatefulWidget {
  const _TvFocusable({
    required this.onTap,
    required this.builder,
    this.borderRadius = 8,
    this.autofocus = false,
    this.stretch = false,
    this.onKey,
    this.focusNode,
  });

  final VoidCallback? onTap;
  final Widget Function(bool focused) builder;
  final double borderRadius;
  final bool autofocus;
  final bool stretch;
  final FocusOnKeyEventCallback? onKey;
  final FocusNode? focusNode;

  @override
  State<_TvFocusable> createState() => _TvFocusableState();
}

class _TvFocusableState extends State<_TvFocusable> {
  bool _focused = false;
  FocusNode? _localFocusNode;

  FocusNode get _effectiveFocusNode =>
      widget.focusNode ??
      (_localFocusNode ??= FocusNode(debugLabel: 'tvFocusable'));

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.onKeyEvent = (node, event) {
      if (widget.onKey != null) {
        return widget.onKey!(node, event);
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void didUpdateWidget(_TvFocusable oldWidget) {
    super.didUpdateWidget(oldWidget);
    _effectiveFocusNode.onKeyEvent = (node, event) {
      if (widget.onKey != null) {
        return widget.onKey!(node, event);
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void dispose() {
    _localFocusNode?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!DeviceInfo.isTv(context)) {
      return InkWell(
        borderRadius: BorderRadius.circular(widget.borderRadius),
        onTap: widget.onTap,
        child: widget.builder(false),
      );
    }
    final enabled = widget.onTap != null;
    return FocusableActionDetector(
      focusNode: _effectiveFocusNode,
      enabled: enabled,
      autofocus: widget.autofocus && enabled,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onTap?.call();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onTap,
        borderRadius: BorderRadius.circular(widget.borderRadius),
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: widget.stretch
              ? SizedBox(
                  width: double.infinity,
                  child: AnimatedContainer(
                    clipBehavior: Clip.antiAlias,
                    duration: const Duration(milliseconds: 150),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(
                        widget.borderRadius + 2,
                      ),
                      border: Border.all(
                        color: _focused
                            ? Colors.white.withValues(alpha: 0.8)
                            : Colors.transparent,
                        width: 2.5,
                      ),
                      boxShadow: _focused
                          ? [
                              BoxShadow(
                                color: Colors.white.withValues(alpha: 0.15),
                                blurRadius: 16,
                                spreadRadius: 1,
                              ),
                            ]
                          : null,
                    ),
                    child: widget.builder(_focused),
                  ),
                )
              : AnimatedContainer(
                  clipBehavior: Clip.antiAlias,
                  duration: const Duration(milliseconds: 150),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(
                      widget.borderRadius + 2,
                    ),
                    border: Border.all(
                      color: _focused
                          ? Colors.white.withValues(alpha: 0.8)
                          : Colors.transparent,
                      width: 2.5,
                    ),
                    boxShadow: _focused
                        ? [
                            BoxShadow(
                              color: Colors.white.withValues(alpha: 0.15),
                              blurRadius: 16,
                              spreadRadius: 1,
                            ),
                          ]
                        : null,
                  ),
                  child: widget.builder(_focused),
                ),
        ),
      ),
    );
  }
}

class WatchScreen extends ConsumerStatefulWidget {
  const WatchScreen({
    super.key,
    required this.animeId,
    required this.episode,
    this.anime,
  });

  final String animeId;
  final int episode;
  final Anime? anime;

  @override
  ConsumerState<WatchScreen> createState() => _WatchScreenState();
}

class _WatchScreenState extends ConsumerState<WatchScreen> {
  WebViewController? _web;
  StreamSource? _current;
  String _embedHost = '';
  bool _initializing = false;
  String? _error;

  bool _sidebarOpen = false; // Collapsed by default on TV
  bool _controlsVisible = true; // Visible by default
  bool _isFullscreen = false; // Spans 100% viewport width and height
  Timer? _controlsTimer;
  final FocusNode _playerFocusNode = FocusNode(debugLabel: 'tvPlayerFocus');
  final FocusNode _playButtonFocus = FocusNode(debugLabel: 'tvPlayBtnFocus');

  double _cursorX = 640.0;
  double _cursorY = 360.0;

  void _resetControlsTimer() {
    _controlsTimer?.cancel();
    if (!_controlsVisible) {
      setState(() => _controlsVisible = true);
    }
    _controlsTimer = Timer(const Duration(seconds: 4), () {
      if (mounted && !_sidebarOpen) {
        setState(() {
          _controlsVisible = false;
        });
        _playerFocusNode.requestFocus();
      }
    });
  }

  void _toggleFullscreen() {
    if (_isFullscreen) {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
        DeviceOrientation.portraitUp,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    } else {
      SystemChrome.setPreferredOrientations([
        DeviceOrientation.landscapeLeft,
        DeviceOrientation.landscapeRight,
      ]);
      SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    }
    setState(() => _isFullscreen = !_isFullscreen);
  }

  KeyEventResult _handlePlayerKeyEvent(FocusNode node, KeyEvent event) {
    if (event is KeyDownEvent || event is KeyRepeatEvent) {
      _resetControlsTimer();
      _playButtonFocus.requestFocus();
      return KeyEventResult.handled;
    }
    return KeyEventResult.ignored;
  }

  @override
  void initState() {
    super.initState();
    SystemChrome.setPreferredOrientations([
      DeviceOrientation.landscapeLeft,
      DeviceOrientation.landscapeRight,
      DeviceOrientation.portraitUp,
    ]);
    final a = widget.anime;
    final recorder = a != null
        ? ref.read(continueWatchingProvider.notifier)
        : null;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      if (recorder != null && a != null) {
        recorder.record(a, widget.episode);
      }
      final tv = DeviceInfo.isTv(context);
      if (tv) _resetControlsTimer();
    });
  }

  @override
  void dispose() {
    _controlsTimer?.cancel();
    _playerFocusNode.dispose();
    _playButtonFocus.dispose();
    _disposePlayers();
    SystemChrome.setPreferredOrientations(DeviceOrientation.values);
    super.dispose();
  }

  void _disposePlayers() {}

  WebViewController _buildEmbedController(String url) {
    _embedHost = Uri.tryParse(url)?.host ?? '';
    final controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setBackgroundColor(Colors.black)
      ..setUserAgent(
        'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onNavigationRequest: (request) {
            final host = Uri.tryParse(request.url)?.host ?? '';
            if (host.isEmpty || _sameSite(host, _embedHost)) {
              return NavigationDecision.navigate;
            }
            return NavigationDecision.prevent;
          },
          onPageFinished: (_) => _web?.runJavaScript(_kAntiPopupJs),
        ),
      )
      ..loadRequest(Uri.parse(url));

    final platform = controller.platform;
    if (platform is AndroidWebViewController) {
      platform.setMediaPlaybackRequiresUserGesture(false);
    }
    return controller;
  }

  static bool _sameSite(String a, String b) {
    String root(String h) {
      final parts = h.split('.');
      return parts.length >= 2 ? parts.sublist(parts.length - 2).join('.') : h;
    }

    return root(a) == root(b);
  }

  Map<String, String> _streamHeaders(StreamSource source) {
    const ua =
        'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 '
        '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
    final lower = source.url.toLowerCase();
    var referer = source.referer ?? '';
    if (referer.isEmpty) {
      if (lower.contains('desidub')) {
        referer = 'https://www.desidubanime.me/';
      } else if (lower.contains('animehindidubbed')) {
        referer = 'https://animehindidubbed.in/';
      } else {
        final u = Uri.tryParse(source.url);
        referer = (u != null && u.host.isNotEmpty)
            ? '${u.scheme}://${u.host}/'
            : 'https://animelok.xyz/';
      }
    }
    final origin = referer.endsWith('/')
        ? referer.substring(0, referer.length - 1)
        : referer;
    return {
      'User-Agent': ua,
      if (referer.isNotEmpty) 'Referer': referer,
      if (origin.isNotEmpty) 'Origin': origin,
      ...source.headers,
    };
  }

  Future<void> _select(StreamSource source) async {
    if (_current?.url == source.url || _initializing) return;
    setState(() {
      _initializing = true;
      _error = null;
      _current = source;
    });
    _disposePlayers();

    if (source.isEmbed) {
      _web = _buildEmbedController(source.url);
    }
    // For file sources, CustomPlayer manages its own controller.
    if (mounted) setState(() => _initializing = false);
  }

  void _goToEpisode(int n) {
    if (n == widget.episode || n < 1) return;
    context.pushReplacement('/watch/${widget.animeId}/$n', extra: widget.anime);
  }

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final lang = ref.watch(authProvider).profile?.language ?? 'sub';
    final asyncSources = ref.watch(
      watchSourcesProvider((animeId: widget.animeId, episode: widget.episode)),
    );
    final episodesAsync = ref.watch(episodesProvider(widget.animeId));
    final recs = ref.watch(recommendationsProvider(widget.animeId));

    final mq = MediaQuery.of(context);
    final playerHeight = (mq.size.width * 9 / 16).clamp(
      0.0,
      mq.size.height * 0.62,
    );

    final episodes = episodesAsync.valueOrNull ?? const <Episode>[];
    final maxEp = episodes.isNotEmpty
        ? episodes.map((e) => e.number).fold<int>(0, (a, b) => b > a ? b : a)
        : (widget.anime?.episodes ?? 0);

    final hPad = tv ? 48.0 : 12.0;

    // Mobile fullscreen embed player — fills screen in landscape.
    if (_isFullscreen && !tv) {
      return Scaffold(
        backgroundColor: Colors.black,
        resizeToAvoidBottomInset: false,
        body: Stack(
          children: [
            Positioned.fill(child: _player()),
            Positioned(
              top: 8,
              right: 8,
              child: IconButton(
                icon: const Icon(
                  Icons.fullscreen_exit_rounded,
                  color: Colors.white,
                ),
                onPressed: _toggleFullscreen,
              ),
            ),
          ],
        ),
      );
    }

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: tv
          ? null
          : AppBar(
              backgroundColor: Colors.black,
              elevation: 0,
              title: Text(
                widget.anime?.title ?? 'Watch',
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  fontSize: 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
      body: asyncSources.when(
        loading: () => const CenteredLoader(),
        error: (e, _) => ErrorRetry(
          message: 'No sources found.\n$e',
          onRetry: () => ref.invalidate(watchSourcesProvider),
        ),
        data: (sources) {
          if (sources.isEmpty) {
            return ErrorRetry(
              message: 'No playable sources for this episode yet.',
              onRetry: () => ref.invalidate(watchSourcesProvider),
            );
          }
          if (_current == null) {
            WidgetsBinding.instance.addPostFrameCallback((_) {
              final best = pickBestSource(sources, lang);
              if (best != null) _select(best);
            });
          }

          if (tv) {
            final playerPane = Container(
              color: Colors.black,
              child: Stack(
                children: [
                  Center(
                    child: _isFullscreen
                        ? SizedBox.expand(child: _player())
                        : AspectRatio(aspectRatio: 16 / 9, child: _player()),
                  ),
                  if (_current?.isEmbed == true && _controlsVisible) ...[
                    Positioned(
                      left: _cursorX - 12,
                      top: _cursorY - 12,
                      child: IgnorePointer(
                        child: Container(
                          width: 24,
                          height: 24,
                          decoration: BoxDecoration(
                            color: Colors.red.withValues(alpha: 0.4),
                            shape: BoxShape.circle,
                            border: Border.all(color: Colors.white, width: 2),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.5),
                                blurRadius: 6,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: Colors.red,
                                shape: BoxShape.circle,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      right: 24,
                      bottom: 24,
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          _buildFloatingActions(),
                          const SizedBox(width: 16),
                          _buildVirtualDpad(),
                        ],
                      ),
                    ),
                  ],
                  if (!_controlsVisible)
                    Focus(
                      focusNode: _playerFocusNode,
                      autofocus: true,
                      onKeyEvent: _handlePlayerKeyEvent,
                      child: const SizedBox.shrink(),
                    ),
                ],
              ),
            );

            return TvRemoteHandler(
              onBack: () => context.pop(),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Left: Player pane (dynamic 100% or 62% width)
                  Expanded(flex: _sidebarOpen ? 62 : 100, child: playerPane),
                  // Right: Scrollable Controls Sidebar (dynamic auto-collapse)
                  if (_sidebarOpen)
                    Expanded(
                      flex: 38,
                      child: Focus(
                        onFocusChange: (hasFocus) {
                          if (!hasFocus && mounted) {
                            setState(() => _sidebarOpen = false);
                          }
                        },
                        child: Container(
                          decoration: const BoxDecoration(
                            color: Color(0xFF101010),
                            border: Border(
                              left: BorderSide(color: Colors.white12, width: 1),
                            ),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Padding(
                                padding: const EdgeInsets.fromLTRB(
                                  24,
                                  24,
                                  24,
                                  8,
                                ),
                                child: Text(
                                  widget.anime?.title ?? 'Watch',
                                  maxLines: 2,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    fontSize: 22,
                                    fontWeight: FontWeight.w900,
                                    color: AppColors.text,
                                  ),
                                ),
                              ),
                              _EpisodeNavBar(
                                episode: widget.episode,
                                maxEp: maxEp,
                                onPrev: () => _goToEpisode(widget.episode - 1),
                                onNext: () => _goToEpisode(widget.episode + 1),
                              ),
                              Expanded(
                                child: ListView(
                                  padding: const EdgeInsets.fromLTRB(
                                    24,
                                    8,
                                    24,
                                    24,
                                  ),
                                  children: [
                                    _ServerPanel(
                                      sources: sources,
                                      current: _current,
                                      onSelect: _select,
                                    ),
                                    const SizedBox(height: 20),
                                    _EpisodesPanel(
                                      episodes: episodes,
                                      loading: episodesAsync.isLoading,
                                      maxEp: maxEp,
                                      currentEp: widget.episode,
                                      onSelect: _goToEpisode,
                                    ),
                                    const SizedBox(height: 16),
                                    recs.maybeWhen(
                                      data: (list) => list.isEmpty
                                          ? const SizedBox.shrink()
                                          : Padding(
                                              padding: const EdgeInsets.only(
                                                top: 8,
                                              ),
                                              child: ContentRow(
                                                title: 'Recommended',
                                                items: list,
                                              ),
                                            ),
                                      orElse: () => const SizedBox.shrink(),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                ],
              ),
            );
          }

          return Column(
            children: [
              SizedBox(
                height: playerHeight,
                width: double.infinity,
                child: Stack(
                  children: [
                    Positioned.fill(child: _player()),
                    if (_current?.isEmbed == true)
                      Positioned(
                        top: 4,
                        right: 4,
                        child: IconButton(
                          icon: const Icon(
                            Icons.fullscreen_rounded,
                            color: Colors.white,
                            size: 20,
                          ),
                          onPressed: _toggleFullscreen,
                        ),
                      ),
                  ],
                ),
              ),
              _EpisodeNavBar(
                episode: widget.episode,
                maxEp: maxEp,
                onPrev: () => _goToEpisode(widget.episode - 1),
                onNext: () => _goToEpisode(widget.episode + 1),
              ),
              Expanded(
                child: ListView(
                  padding: EdgeInsets.fromLTRB(hPad, tv ? 12 : 4, hPad, 28),
                  children: [
                    _ServerPanel(
                      sources: sources,
                      current: _current,
                      onSelect: _select,
                    ),
                    SizedBox(height: tv ? 20 : 14),
                    _EpisodesPanel(
                      episodes: episodes,
                      loading: episodesAsync.isLoading,
                      maxEp: maxEp,
                      currentEp: widget.episode,
                      onSelect: _goToEpisode,
                    ),
                    const SizedBox(height: 8),
                    recs.maybeWhen(
                      data: (list) => list.isEmpty
                          ? const SizedBox.shrink()
                          : Padding(
                              padding: const EdgeInsets.only(top: 8),
                              child: ContentRow(
                                title: 'Recommended',
                                items: list,
                              ),
                            ),
                      orElse: () => const SizedBox.shrink(),
                    ),
                  ],
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _player() {
    if (_initializing) {
      return const ColoredBox(color: Colors.black, child: CenteredLoader());
    }
    Widget content;
    if (_current?.isEmbed == true && _web != null) {
      content = Focus(
        canRequestFocus: DeviceInfo.isTv(context),
        descendantsAreFocusable: DeviceInfo.isTv(context),
        child: WebViewWidget(controller: _web!),
      );
    } else if (_current != null && !_current!.isEmbed) {
      content = CustomPlayer(
        url: _current!.url,
        headers: _streamHeaders(_current!),
        subtitles: _current!.subtitles,
        title: '${widget.anime?.title ?? 'Watch'} \u2022 Ep ${widget.episode}',
        onBack: () => context.pop(),
        onNext: widget.episode < (widget.anime?.episodes ?? 9999)
            ? () => _goToEpisode(widget.episode + 1)
            : null,
        onPrev: widget.episode > 1
            ? () => _goToEpisode(widget.episode - 1)
            : null,
      );
    } else if (_error != null) {
      content = ColoredBox(
        color: Colors.black,
        child: Center(
          child: Padding(
            padding: const EdgeInsets.all(24),
            child: Text(
              _error!,
              textAlign: TextAlign.center,
              style: const TextStyle(color: AppColors.textMuted),
            ),
          ),
        ),
      );
    } else {
      content = const ColoredBox(color: Colors.black);
    }
    // On TV, CustomPlayer handles its own D-pad controls.
    return content;
  }

  void _triggerVirtualClick() {
    if (_web == null) return;
    final js =
        '''
      (function() {
        var canvasW = 1280;
        var canvasH = 720;
        var x = ($_cursorX / canvasW) * window.innerWidth;
        var y = ($_cursorY / canvasH) * window.innerHeight;

        console.log("VIRTUAL CLICK: target at coordinate (" + x + ", " + y + ")");
        var el = document.elementFromPoint(x, y);
        if (el) {
          console.log("VIRTUAL CLICK: Found element " + el.tagName + " with class '" + el.className + "'");
          el.click();
          var ev = new MouseEvent('click', {
            clientX: x,
            clientY: y,
            bubbles: true,
            cancelable: true,
            view: window
          });
          el.dispatchEvent(ev);

          if (el.tagName === 'IFRAME') {
            console.log("VIRTUAL CLICK: Target is iframe, focusing and attempting inner click");
            el.focus();
            try {
              var innerEl = el.contentWindow.document.elementFromPoint(x, y);
              if (innerEl) {
                console.log("VIRTUAL CLICK: Found inner element " + innerEl.tagName + " inside iframe");
                innerEl.click();
                var innerEv = new MouseEvent('click', {
                  clientX: x,
                  clientY: y,
                  bubbles: true,
                  cancelable: true
                });
                innerEl.dispatchEvent(innerEv);
              }
            } catch(e) {
              console.log("VIRTUAL CLICK: Error accessing iframe document: " + e.message);
            }
          }
          return "clicked";
        }
        console.log("VIRTUAL CLICK: No element found at coordinate");
        return "not_found";
      })()
    ''';
    _web?.runJavaScript(js);
  }

  Widget _buildVirtualDpad() {
    return Container(
      width: 150,
      height: 150,
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        shape: BoxShape.circle,
        border: Border.all(color: Colors.white12, width: 1.5),
      ),
      child: Stack(
        children: [
          Positioned(
            top: 4,
            left: 50,
            child: _dpadBtn(
              icon: Icons.arrow_upward_rounded,
              onTap: () {
                _resetControlsTimer();
                setState(() {
                  _cursorY = (_cursorY - 20).clamp(0.0, 720.0);
                });
              },
            ),
          ),
          Positioned(
            bottom: 4,
            left: 50,
            child: _dpadBtn(
              icon: Icons.arrow_downward_rounded,
              onTap: () {
                _resetControlsTimer();
                setState(() {
                  _cursorY = (_cursorY + 20).clamp(0.0, 720.0);
                });
              },
            ),
          ),
          Positioned(
            top: 50,
            left: 4,
            child: _dpadBtn(
              icon: Icons.arrow_back_rounded,
              onTap: () {
                _resetControlsTimer();
                setState(() {
                  _cursorX = (_cursorX - 30).clamp(0.0, 1280.0);
                });
              },
            ),
          ),
          Positioned(
            top: 50,
            right: 4,
            child: _dpadBtn(
              icon: Icons.arrow_forward_rounded,
              onTap: () {
                _resetControlsTimer();
                setState(() {
                  _cursorX = (_cursorX + 30).clamp(0.0, 1280.0);
                });
              },
            ),
          ),
          Positioned(
            top: 50,
            left: 50,
            child: _dpadBtn(
              focusNode: _playButtonFocus,
              icon: Icons.circle,
              size: 20,
              onTap: () {
                _resetControlsTimer();
                _triggerVirtualClick();
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _dpadBtn({
    required IconData icon,
    required VoidCallback onTap,
    FocusNode? focusNode,
    double size = 24,
  }) {
    return _TvFocusable(
      onTap: onTap,
      focusNode: focusNode,
      borderRadius: 25,
      builder: (focused) => Container(
        width: 46,
        height: 46,
        decoration: BoxDecoration(
          color: focused ? Colors.white : Colors.transparent,
          shape: BoxShape.circle,
        ),
        child: Icon(
          icon,
          color: focused ? Colors.black : Colors.white,
          size: size,
        ),
      ),
    );
  }

  Widget _buildFloatingActions() {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        _tvWebButton(
          icon: _isFullscreen
              ? Icons.fullscreen_exit_rounded
              : Icons.fullscreen_rounded,
          tooltip: 'Fullscreen',
          onPressed: () {
            _resetControlsTimer();
            final wasFs = _isFullscreen;
            _toggleFullscreen();
            if (!wasFs) {
              setState(() => _sidebarOpen = false);
            }
          },
        ),
        const SizedBox(height: 12),
        _tvWebButton(
          icon: Icons.menu_rounded,
          tooltip: 'Toggle Sidebar',
          onPressed: () {
            _resetControlsTimer();
            setState(() {
              _sidebarOpen = !_sidebarOpen;
            });
          },
        ),
      ],
    );
  }

  Widget _tvWebButton({
    required IconData icon,
    required String tooltip,
    required VoidCallback onPressed,
  }) {
    return _TvFocusable(
      onTap: onPressed,
      borderRadius: 10,
      builder: (focused) => Container(
        width: 48,
        height: 48,
        alignment: Alignment.center,
        decoration: BoxDecoration(
          color: focused ? Colors.white : AppColors.card,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Icon(
          icon,
          color: focused ? Colors.black : Colors.white,
          size: 24,
        ),
      ),
    );
  }
}

/// Prev / current episode / next bar shown under the player.
class _EpisodeNavBar extends StatelessWidget {
  const _EpisodeNavBar({
    required this.episode,
    required this.maxEp,
    required this.onPrev,
    required this.onNext,
  });

  final int episode;
  final int maxEp;
  final VoidCallback onPrev;
  final VoidCallback onNext;

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final hasPrev = episode > 1;
    final hasNext = maxEp == 0 || episode < maxEp;
    return Container(
      color: Colors.black,
      padding: EdgeInsets.fromLTRB(
        tv ? 20 : 12,
        tv ? 12 : 8,
        tv ? 20 : 12,
        tv ? 14 : 10,
      ),
      child: Row(
        children: [
          _navBtn(
            context,
            Icons.skip_previous_rounded,
            'Prev',
            hasPrev ? onPrev : null,
          ),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              'Episode $episode',
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: tv ? 20 : 15,
                fontWeight: FontWeight.w700,
                color: AppColors.text,
              ),
            ),
          ),
          const SizedBox(width: 8),
          _navBtn(
            context,
            Icons.skip_next_rounded,
            'Next',
            hasNext ? onNext : null,
            trailing: true,
          ),
        ],
      ),
    );
  }

  Widget _navBtn(
    BuildContext context,
    IconData icon,
    String label,
    VoidCallback? onTap, {
    bool trailing = false,
  }) {
    final tv = DeviceInfo.isTv(context);
    if (tv) {
      final enabled = onTap != null;
      final fg = enabled
          ? AppColors.text
          : AppColors.textMuted.withValues(alpha: 0.4);
      final ic = Icon(icon, size: 24, color: fg);
      final tx = Text(
        label,
        style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700, color: fg),
      );
      final kids = trailing
          ? [tx, const SizedBox(width: 6), ic]
          : [ic, const SizedBox(width: 6), tx];
      return _TvFocusable(
        onTap: onTap,
        borderRadius: 10,
        builder: (focused) => Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: focused
                ? Colors.white.withValues(alpha: 0.15)
                : AppColors.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: focused ? Colors.white : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Row(mainAxisSize: MainAxisSize.min, children: kids),
        ),
      );
    }
    final children = trailing
        ? [Text(label), const SizedBox(width: 4), Icon(icon, size: 20)]
        : [Icon(icon, size: 20), const SizedBox(width: 4), Text(label)];
    return TextButton(
      onPressed: onTap,
      style: TextButton.styleFrom(
        foregroundColor: AppColors.text,
        disabledForegroundColor: AppColors.textMuted.withValues(alpha: 0.4),
        backgroundColor: AppColors.card,
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      ),
      child: Row(mainAxisSize: MainAxisSize.min, children: children),
    );
  }
}

/// Faithful port of the website's "Select Server" panel: a header with source /
/// provider stat badges, then a collapsible card per provider whose body groups
/// the servers by category (Subbed / English Dub / Hindi Dub / Raw).
class _ServerPanel extends StatefulWidget {
  const _ServerPanel({
    required this.sources,
    required this.current,
    required this.onSelect,
  });

  final List<StreamSource> sources;
  final StreamSource? current;
  final ValueChanged<StreamSource> onSelect;

  @override
  State<_ServerPanel> createState() => _ServerPanelState();
}

class _ServerPanelState extends State<_ServerPanel> {
  bool _collapsed = false;
  String? _open;

  /// URL of the chip that should grab focus first on TV: the selected source if
  /// present, else the very first source chip rendered.
  String? _autofocusUrl;

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final grouped = groupSources(widget.sources);
    final providers = grouped.keys.toList();
    // Default-open the provider that owns the current source, else the first.
    _open ??= providers.firstWhere(
      (p) => grouped[p]!.values.any(
        (list) => list.any((s) => s.url == widget.current?.url),
      ),
      orElse: () => providers.isNotEmpty ? providers.first : '',
    );

    // Resolve the TV autofocus target each build so it tracks the selection.
    _autofocusUrl = null;
    if (widget.current != null &&
        widget.sources.any((s) => s.url == widget.current!.url)) {
      _autofocusUrl = widget.current!.url;
    } else {
      outer:
      for (final p in providers) {
        for (final list in grouped[p]!.values) {
          if (list.isNotEmpty) {
            _autofocusUrl = list.first.url;
            break outer;
          }
        }
      }
    }

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgLite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.card),
      ),
      padding: EdgeInsets.all(tv ? 24 : 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _TvFocusable(
            stretch: true,
            borderRadius: 14,
            onTap: () => setState(() => _collapsed = !_collapsed),
            builder: (_) => Padding(
              padding: const EdgeInsets.symmetric(vertical: 4),
              child: Row(
                children: [
                  Container(
                    width: tv ? 40 : 38,
                    height: tv ? 40 : 38,
                    decoration: BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(
                      Icons.dns_rounded,
                      color: Colors.white,
                      size: tv ? 22 : 20,
                    ),
                  ),
                  SizedBox(width: tv ? 12 : 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Select Server',
                          style: TextStyle(
                            fontSize: tv ? 20 : 16,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                        if (tv) ...[
                          const SizedBox(height: 4),
                          Text(
                            '${widget.sources.length} sources  •  ${providers.length} providers',
                            style: const TextStyle(
                              fontSize: 13,
                              color: AppColors.textMuted,
                              fontWeight: FontWeight.w500,
                            ),
                          ),
                        ] else ...[
                          const SizedBox(height: 2),
                          Text(
                            'Choose your preferred streaming source',
                            style: TextStyle(
                              fontSize: 12,
                              color: AppColors.textMuted,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  if (!tv) ...[
                    _statBadge('${widget.sources.length}', 'Sources', tv),
                    const SizedBox(width: 8),
                    _statBadge('${providers.length}', 'Providers', tv),
                  ],
                  if (tv) ...[
                    const SizedBox(width: 12),
                    AnimatedRotation(
                      turns: _collapsed ? 0.0 : 0.25,
                      duration: const Duration(milliseconds: 200),
                      child: const Icon(
                        Icons.chevron_right_rounded,
                        color: Colors.white70,
                        size: 24,
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          if (!_collapsed) ...[
            SizedBox(height: tv ? 18 : 12),
            const Divider(height: 1, color: AppColors.card),
            SizedBox(height: tv ? 18 : 12),
            ...providers.map((p) => _providerCard(p, grouped[p]!, tv)),
          ],
        ],
      ),
    );
  }

  Widget _statBadge(String number, String label, bool tv) => Container(
    padding: EdgeInsets.symmetric(
      horizontal: tv ? 16 : 12,
      vertical: tv ? 9 : 6,
    ),
    decoration: BoxDecoration(
      color: AppColors.card,
      borderRadius: BorderRadius.circular(8),
    ),
    child: Column(
      children: [
        Text(
          number,
          style: TextStyle(
            fontSize: tv ? 22 : 17,
            fontWeight: FontWeight.w800,
            color: Colors.white,
            height: 1,
          ),
        ),
        const SizedBox(height: 2),
        Text(
          label.toUpperCase(),
          style: TextStyle(
            fontSize: tv ? 11 : 9,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.5,
            color: AppColors.textMuted,
          ),
        ),
      ],
    ),
  );

  Widget _providerCard(
    String provider,
    Map<String, List<StreamSource>> categories,
    bool tv,
  ) {
    final open = _open == provider;
    final total = categories.values.fold<int>(
      0,
      (sum, list) => sum + list.length,
    );
    return Container(
      margin: EdgeInsets.only(bottom: tv ? 14 : 10),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: open
              ? Colors.white.withValues(alpha: 0.25)
              : Colors.transparent,
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          _TvFocusable(
            stretch: true,
            borderRadius: 12,
            onTap: () => setState(() => _open = open ? null : provider),
            builder: (focused) => AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              decoration: BoxDecoration(
                color: focused
                    ? Colors.white.withValues(alpha: 0.1)
                    : Colors.transparent,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(
                  color: focused ? Colors.white : Colors.transparent,
                  width: 2,
                ),
              ),
              padding: EdgeInsets.symmetric(
                horizontal: tv ? 20 : 14,
                vertical: tv ? 16 : 12,
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.play_arrow_rounded,
                    color: Colors.white,
                    size: tv ? 20 : 16,
                  ),
                  SizedBox(width: tv ? 8 : 6),
                  Expanded(
                    child: Text(
                      provider.toUpperCase(),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: tv ? 16 : 13,
                        fontWeight: FontWeight.w800,
                        letterSpacing: 0.6,
                        color: AppColors.text,
                      ),
                    ),
                  ),
                  Text(
                    '$total sources',
                    style: TextStyle(
                      fontSize: tv ? 15 : 12,
                      fontWeight: FontWeight.w700,
                      color: AppColors.textMuted,
                    ),
                  ),
                  const SizedBox(width: 4),
                  AnimatedRotation(
                    turns: open ? 0.5 : 0,
                    duration: const Duration(milliseconds: 200),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: AppColors.textMuted,
                      size: tv ? 24 : 18,
                    ),
                  ),
                ],
              ),
            ),
          ),
          AnimatedCrossFade(
            duration: const Duration(milliseconds: 250),
            crossFadeState: open
                ? CrossFadeState.showFirst
                : CrossFadeState.showSecond,
            firstChild: Padding(
              padding: EdgeInsets.fromLTRB(
                tv ? 16 : 12,
                0,
                tv ? 16 : 12,
                tv ? 16 : 12,
              ),
              child: Column(
                children: categories.entries
                    .map((e) => _categoryGroup(e.key, e.value, tv))
                    .toList(),
              ),
            ),
            secondChild: const SizedBox(width: double.infinity),
          ),
        ],
      ),
    );
  }

  Widget _categoryGroup(String category, List<StreamSource> sources, bool tv) {
    return Container(
      width: double.infinity,
      margin: EdgeInsets.only(top: tv ? 12 : 8),
      padding: EdgeInsets.all(tv ? 14 : 10),
      decoration: BoxDecoration(
        color: AppColors.bgLite,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppColors.card),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: EdgeInsets.symmetric(
              horizontal: tv ? 11 : 9,
              vertical: tv ? 5 : 4,
            ),
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Container(
                  width: tv ? 8 : 6,
                  height: tv ? 8 : 6,
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    shape: BoxShape.circle,
                  ),
                ),
                SizedBox(width: tv ? 8 : 6),
                Flexible(
                  child: Text(
                    category.toUpperCase(),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: tv ? 13 : 10,
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.5,
                      color: Colors.white70,
                    ),
                  ),
                ),
              ],
            ),
          ),
          SizedBox(height: tv ? 12 : 10),
          Wrap(
            spacing: tv ? 12 : 8,
            runSpacing: tv ? 12 : 8,
            children: [
              for (var i = 0; i < sources.length; i++)
                _sourceChip(sources[i], i, tv),
            ],
          ),
        ],
      ),
    );
  }

  Widget _sourceChip(StreamSource s, int index, bool tv) {
    final active = s.url == widget.current?.url;
    return _TvFocusable(
      borderRadius: 8,
      autofocus: s.url == _autofocusUrl,
      onTap: () {
        widget.onSelect(s);
        if (tv) setState(() => _collapsed = true);
      },
      builder: (focused) => Container(
        padding: EdgeInsets.symmetric(
          horizontal: tv ? 16 : 12,
          vertical: tv ? 12 : 9,
        ),
        decoration: BoxDecoration(
          color: active
              ? Colors.white.withValues(alpha: 0.15)
              : (focused ? Colors.white.withValues(alpha: 0.08) : AppColors.bg),
          borderRadius: BorderRadius.circular(8),
          border: Border.all(
            color: focused
                ? Colors.white
                : (active ? Colors.white54 : AppColors.cardHover),
            width: focused ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              s.isEmbed ? Icons.public_rounded : Icons.hd_rounded,
              size: tv ? 18 : 14,
              color: active ? Colors.white : AppColors.textMuted,
            ),
            SizedBox(width: tv ? 8 : 6),
            Flexible(
              child: Text(
                sourceLabel(s, index),
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(
                  fontSize: tv ? 16 : 13,
                  fontWeight: FontWeight.w600,
                  color: active ? Colors.white : AppColors.text,
                ),
              ),
            ),
            if (s.quality.isNotEmpty && s.quality.toLowerCase() != 'auto') ...[
              SizedBox(width: tv ? 8 : 6),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.35),
                  borderRadius: BorderRadius.circular(5),
                ),
                child: Text(
                  s.quality.toUpperCase(),
                  style: TextStyle(
                    fontSize: tv ? 11 : 9,
                    fontWeight: FontWeight.w800,
                    color: Colors.white,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

/// Episodes panel: count, page-range selector, grid/list toggle, filter and the
/// episode number grid — mirroring the website's WatchSidebar.
class _EpisodesPanel extends StatefulWidget {
  const _EpisodesPanel({
    required this.episodes,
    required this.loading,
    required this.maxEp,
    required this.currentEp,
    required this.onSelect,
  });

  final List<Episode> episodes;
  final bool loading;
  final int maxEp;
  final int currentEp;
  final ValueChanged<int> onSelect;

  @override
  State<_EpisodesPanel> createState() => _EpisodesPanelState();
}

class _EpisodesPanelState extends State<_EpisodesPanel> {
  static const _perPage = 50;

  bool _gridView = true;
  String _filter = '';
  int _page = 0;

  final FocusNode _rangeFocus = FocusNode(debugLabel: 'episodesRange');
  final FocusNode _filterFocus = FocusNode(debugLabel: 'episodesFilter');
  bool _filterFocused = false;

  @override
  void initState() {
    super.initState();
    _filterFocus.addListener(_onFilterFocusChange);
    _filterFocus.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          final success = FocusTraversalGroup.of(
            node.context!,
          ).inDirection(node, TraversalDirection.down);
          if (success) return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          final success = FocusTraversalGroup.of(
            node.context!,
          ).inDirection(node, TraversalDirection.up);
          if (success) return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };
    _page = widget.currentEp > 0 ? (widget.currentEp - 1) ~/ _perPage : 0;
  }

  void _onFilterFocusChange() {
    setState(() => _filterFocused = _filterFocus.hasFocus);
  }

  @override
  void dispose() {
    _filterFocus.removeListener(_onFilterFocusChange);
    _filterFocus.dispose();
    _rangeFocus.dispose();
    super.dispose();
  }

  /// Effective episode list: backend metadata if available, else synthesised
  /// from the episode count so the grid still works.
  List<Episode> get _all {
    if (widget.episodes.isNotEmpty) return widget.episodes;
    return [for (var i = 1; i <= widget.maxEp; i++) Episode(number: i)];
  }

  @override
  Widget build(BuildContext context) {
    final tv = DeviceInfo.isTv(context);
    final all = _all;
    final totalPages = (all.length / _perPage).ceil();
    final start = _page * _perPage;
    final pageItems = all.skip(start).take(_perPage).toList();
    final q = _filter.trim().toLowerCase();
    final items = q.isEmpty
        ? pageItems
        : pageItems
              .where(
                (e) =>
                    e.number.toString().contains(q) ||
                    (e.title ?? '').toLowerCase().contains(q),
              )
              .toList();

    return Container(
      decoration: BoxDecoration(
        color: AppColors.bgLite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.card),
      ),
      padding: EdgeInsets.all(tv ? 24 : 14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Row(
            children: [
              Icon(
                Icons.playlist_play_rounded,
                color: Colors.white,
                size: tv ? 22 : 20,
              ),
              SizedBox(width: tv ? 8 : 8),
              Text(
                'Episodes',
                style: TextStyle(
                  fontSize: tv ? 20 : 16,
                  fontWeight: FontWeight.w700,
                ),
              ),
              SizedBox(width: tv ? 8 : 8),
              Container(
                padding: EdgeInsets.symmetric(
                  horizontal: tv ? 10 : 8,
                  vertical: tv ? 3 : 2,
                ),
                decoration: BoxDecoration(
                  color: AppColors.card,
                  borderRadius: BorderRadius.circular(999),
                ),
                child: Text(
                  '${all.length}',
                  style: TextStyle(
                    fontSize: tv ? 13 : 11,
                    fontWeight: FontWeight.w700,
                    color: AppColors.textMuted,
                  ),
                ),
              ),
              if (!tv) ...[
                const Spacer(),
                if (totalPages > 1) _rangeSelector(totalPages, all.length, tv),
                const SizedBox(width: 8),
                _viewToggle(tv),
              ],
            ],
          ),
          if (tv) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                if (totalPages > 1) ...[
                  _rangeSelector(totalPages, all.length, tv),
                  const SizedBox(width: 12),
                ],
                const Spacer(),
                _viewToggle(tv),
              ],
            ),
          ],
          SizedBox(height: tv ? 16 : 12),
          if (widget.loading && all.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 20),
              child: CenteredLoader(),
            )
          else if (all.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text(
                'No episodes listed.',
                style: TextStyle(color: AppColors.textMuted),
              ),
            )
          else ...[
            AnimatedContainer(
              duration: const Duration(milliseconds: 150),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: _filterFocused
                      ? Colors.white
                      : (tv ? AppColors.card : Colors.transparent),
                  width: 2.2,
                ),
                boxShadow: _filterFocused
                    ? [
                        BoxShadow(
                          color: Colors.white.withValues(alpha: 0.15),
                          blurRadius: 10,
                          spreadRadius: 1,
                        ),
                      ]
                    : null,
              ),
              child: TextField(
                focusNode: _filterFocus,
                onChanged: (v) => setState(() => _filter = v),
                style: TextStyle(fontSize: tv ? 17 : 14),
                decoration: InputDecoration(
                  isDense: true,
                  hintText: 'Filter episodes…',
                  prefixIcon: Icon(
                    Icons.search,
                    color: _filterFocused ? Colors.white : AppColors.textMuted,
                    size: tv ? 22 : 18,
                  ),
                  filled: true,
                  fillColor: AppColors.card,
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: tv ? 16 : 12,
                    vertical: tv ? 14 : 10,
                  ),
                  border: InputBorder.none,
                  enabledBorder: InputBorder.none,
                  focusedBorder: InputBorder.none,
                ),
              ),
            ),
            SizedBox(height: tv ? 16 : 12),
            _gridView ? _grid(items, tv) : _list(items, tv),
          ],
        ],
      ),
    );
  }

  Widget _rangeSelector(int totalPages, int total, bool tv) {
    final selector = DropdownButtonHideUnderline(
      child: DropdownButton<int>(
        value: _page,
        focusNode: tv ? _rangeFocus : null,
        focusColor: Colors.transparent,
        isDense: true,
        dropdownColor: AppColors.card,
        style: TextStyle(fontSize: tv ? 15 : 12, color: AppColors.text),
        icon: Icon(
          Icons.keyboard_arrow_down_rounded,
          size: tv ? 20 : 16,
          color: AppColors.textMuted,
        ),
        items: [
          for (var i = 0; i < totalPages; i++)
            DropdownMenuItem(
              value: i,
              child: Text(
                '${i * _perPage + 1}-${((i + 1) * _perPage).clamp(0, total)}',
              ),
            ),
        ],
        onChanged: (v) => setState(() => _page = v ?? 0),
      ),
    );

    if (!tv) {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        decoration: BoxDecoration(
          color: AppColors.card,
          borderRadius: BorderRadius.circular(8),
        ),
        child: selector,
      );
    }

    return AnimatedBuilder(
      animation: _rangeFocus,
      builder: (_, _) {
        final focused = _rangeFocus.hasFocus;
        return AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 2),
          decoration: BoxDecoration(
            color: AppColors.card,
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: focused ? Colors.white : Colors.transparent,
              width: 2.5,
            ),
            boxShadow: focused
                ? [
                    BoxShadow(
                      color: Colors.white.withValues(alpha: 0.15),
                      blurRadius: 16,
                      spreadRadius: 1,
                    ),
                  ]
                : null,
          ),
          child: selector,
        );
      },
    );
  }

  Widget _viewToggle(bool tv) {
    return Container(
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          _toggleBtn(Icons.grid_view_rounded, _gridView, tv, () {
            setState(() => _gridView = true);
          }),
          _toggleBtn(Icons.view_list_rounded, !_gridView, tv, () {
            setState(() => _gridView = false);
          }),
        ],
      ),
    );
  }

  Widget _toggleBtn(IconData icon, bool on, bool tv, VoidCallback onTap) =>
      _TvFocusable(
        borderRadius: 8,
        onTap: onTap,
        builder: (focused) => AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          width: tv ? 46 : 34,
          height: tv ? 40 : 30,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: focused
                ? Colors.white.withValues(alpha: 0.1)
                : (on
                      ? Colors.white.withValues(alpha: 0.2)
                      : Colors.transparent),
            borderRadius: BorderRadius.circular(8),
            border: Border.all(
              color: focused ? Colors.white : Colors.transparent,
              width: 1.5,
            ),
          ),
          child: Icon(
            icon,
            size: tv ? 22 : 16,
            color: (on || focused) ? Colors.white : AppColors.textMuted,
          ),
        ),
      );

  Widget _grid(List<Episode> items, bool tv) {
    return LayoutBuilder(
      builder: (context, c) {
        final cols = tv
            ? (c.maxWidth / 92).floor().clamp(6, 12)
            : (c.maxWidth / 64).floor().clamp(5, 10);
        return GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          clipBehavior: Clip.none,
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: cols,
            mainAxisSpacing: tv ? 12 : 8,
            crossAxisSpacing: tv ? 12 : 8,
            childAspectRatio: tv ? 1.6 : 1.7,
          ),
          itemCount: items.length,
          itemBuilder: (_, i) {
            final e = items[i];
            final current = e.number == widget.currentEp;
            return _TvFocusable(
              borderRadius: 8,
              onTap: () => widget.onSelect(e.number),
              builder: (focused) => AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: current
                      ? Colors.white.withValues(alpha: 0.2)
                      : (focused
                            ? Colors.white.withValues(alpha: 0.1)
                            : AppColors.card),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: focused
                        ? Colors.white
                        : (e.filler
                              ? Colors.orange.withValues(alpha: 0.4)
                              : Colors.transparent),
                    width: focused ? 2 : 1,
                  ),
                ),
                child: Text(
                  '${e.number}',
                  style: TextStyle(
                    fontSize: tv ? 18 : 13,
                    fontWeight: FontWeight.w700,
                    color: (current || focused)
                        ? Colors.white
                        : AppColors.textMuted,
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _list(List<Episode> items, bool tv) {
    return Column(
      children: [
        for (final e in items)
          Padding(
            padding: EdgeInsets.only(bottom: tv ? 8 : 6),
            child: _TvFocusable(
              borderRadius: 8,
              onTap: () => widget.onSelect(e.number),
              builder: (focused) => AnimatedContainer(
                duration: const Duration(milliseconds: 150),
                padding: EdgeInsets.symmetric(
                  horizontal: tv ? 14 : 10,
                  vertical: tv ? 13 : 10,
                ),
                decoration: BoxDecoration(
                  color: e.number == widget.currentEp
                      ? Colors.white.withValues(alpha: 0.15)
                      : (focused
                            ? Colors.white.withValues(alpha: 0.08)
                            : AppColors.card),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: focused
                        ? Colors.white
                        : (e.number == widget.currentEp
                              ? Colors.white30
                              : Colors.transparent),
                    width: focused ? 1.5 : 1.0,
                  ),
                ),
                child: Row(
                  children: [
                    SizedBox(
                      width: tv ? 38 : 30,
                      child: Text(
                        '${e.number}',
                        textAlign: TextAlign.center,
                        style: TextStyle(
                          fontSize: tv ? 16 : 13,
                          fontWeight: FontWeight.w700,
                          color: (focused || e.number == widget.currentEp)
                              ? Colors.white
                              : AppColors.textMuted,
                        ),
                      ),
                    ),
                    SizedBox(width: tv ? 10 : 8),
                    Expanded(
                      child: Text(
                        e.title ?? 'Episode ${e.number}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: tv ? 16 : 13,
                          color: AppColors.text,
                        ),
                      ),
                    ),
                    if (e.filler)
                      Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 6,
                          vertical: 2,
                        ),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(4),
                          border: Border.all(
                            color: Colors.orange.withValues(alpha: 0.5),
                          ),
                        ),
                        child: const Text(
                          'FILLER',
                          style: TextStyle(
                            fontSize: 8,
                            fontWeight: FontWeight.w800,
                            color: Colors.orange,
                          ),
                        ),
                      ),
                    if (e.number == widget.currentEp)
                      Padding(
                        padding: const EdgeInsets.only(left: 6),
                        child: Icon(
                          Icons.play_arrow_rounded,
                          size: tv ? 20 : 16,
                          color: Colors.white,
                        ),
                      ),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }
}
