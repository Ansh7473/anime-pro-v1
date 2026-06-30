import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../core/device/device_info.dart';
import '../../core/providers/providers.dart';
import '../../core/theme/app_colors.dart';
import '../../data/models/anime.dart';
import '../../shared/widgets/anime_card.dart';
import '../../shared/widgets/loading.dart';

/// Query for the search results provider: a free-text [query] plus an optional
/// [genre] filter. An empty query with no genre yields popular titles.
typedef SearchQuery = ({String query, String? genre});

/// AniList genres surfaced as quick filter chips.
const _genres = <String>[
  'Action',
  'Adventure',
  'Comedy',
  'Drama',
  'Fantasy',
  'Horror',
  'Mahou Shoujo',
  'Mecha',
  'Music',
  'Mystery',
  'Psychological',
  'Romance',
  'Sci-Fi',
  'Slice of Life',
  'Sports',
  'Supernatural',
  'Thriller',
];

/// Search results for a [SearchQuery]. With no query and no genre it returns
/// popular titles; otherwise it searches, optionally filtered by genre.
final searchResultsProvider =
    FutureProvider.autoDispose.family<List<Anime>, SearchQuery>((ref, q) {
  final api = ref.watch(apiServiceProvider);
  final query = q.query.trim();
  final genre = q.genre;
  if (query.isEmpty && genre == null) return api.topAnime();
  if (genre != null) return api.search(query, genre: genre);
  return api.search(query);
});

class SearchScreen extends ConsumerStatefulWidget {
  const SearchScreen({super.key});

  @override
  ConsumerState<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends ConsumerState<SearchScreen> {
  final _controller = TextEditingController();
  Timer? _debounce;
  String _query = '';
  String? _genre;

  final FocusNode _searchFocusNode = FocusNode(debugLabel: 'tvSearchField');
  final FocusScopeNode _genreScopeNode = FocusScopeNode(debugLabel: 'tvGenreFilters');
  final FocusScopeNode _resultsScopeNode = FocusScopeNode(debugLabel: 'tvSearchResults');

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    _searchFocusNode.dispose();
    _genreScopeNode.dispose();
    _resultsScopeNode.dispose();
    super.dispose();
  }

  void _onChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 450), () {
      if (mounted) setState(() => _query = value);
    });
  }

  void _toggleGenre(String genre) {
    setState(() => _genre = _genre == genre ? null : genre);
  }

  @override
  Widget build(BuildContext context) {
    final key = (query: _query, genre: _genre);
    final results = ref.watch(searchResultsProvider(key));
    final isTv = DeviceInfo.isTv(context);
    final columns = DeviceInfo.gridColumns(context);
    final hPad = isTv ? 48.0 : 16.0;
    final isBrowsing = _query.trim().isEmpty && _genre == null;

    return Scaffold(
      body: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: EdgeInsets.fromLTRB(hPad, isTv ? 20 : 12, hPad, isTv ? 12 : 8),
              child: _SearchTextField(
                controller: _controller,
                onChanged: _onChanged,
                onSubmitted: (v) => setState(() => _query = v),
                isTv: isTv,
                focusNode: _searchFocusNode,
                nextFocusScope: _genreScopeNode,
              ),
            ),
            _GenreFilterRow(
              selected: _genre,
              onTap: _toggleGenre,
              isTv: isTv,
              focusScopeNode: _genreScopeNode,
              upFocusNode: _searchFocusNode,
              downFocusNode: _resultsScopeNode,
            ),
            Expanded(
              child: results.when(
                loading: () => const CenteredLoader(),
                error: (_, _) => ErrorRetry(
                  onRetry: () => ref.invalidate(searchResultsProvider(key)),
                ),
                data: (list) {
                  if (list.isEmpty) return const _EmptyResults();
                  return FocusScope(
                    node: _resultsScopeNode,
                    child: CustomScrollView(
                      slivers: [
                        SliverToBoxAdapter(
                          child: _SectionHeader(
                            title: isBrowsing
                                ? 'Popular'
                                : (_genre ?? 'Results'),
                            isTv: isTv,
                          ),
                        ),
                        SliverPadding(
                          padding:
                              EdgeInsets.fromLTRB(hPad, 4, hPad, isTv ? 32 : 16),
                          sliver: SliverGrid(
                            gridDelegate:
                                SliverGridDelegateWithFixedCrossAxisCount(
                              crossAxisCount: columns,
                              childAspectRatio: 0.56,
                              mainAxisSpacing: isTv ? 24 : 14,
                              crossAxisSpacing: isTv ? 20 : 12,
                            ),
                            delegate: SliverChildBuilderDelegate(
                              (_, i) => AnimeCard(
                                anime: list[i],
                                onKey: (node, event) {
                                  if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
                                    return KeyEventResult.ignored;
                                  }
                                  if (event.logicalKey == LogicalKeyboardKey.arrowUp && i < columns) {
                                    _genreScopeNode.requestDefaultFocus();
                                    return KeyEventResult.handled;
                                  }
                                  if (event.logicalKey == LogicalKeyboardKey.arrowLeft && (i % columns == 0)) {
                                    FocusNode? current = node;
                                    FocusScopeNode? railScope;
                                    while (current != null) {
                                      if (current is FocusScopeNode && current.debugLabel == 'tvContent') {
                                        final parentNode = current.parent;
                                        if (parentNode != null) {
                                          for (final child in parentNode.children) {
                                            if (child is FocusScopeNode && child.debugLabel == 'tvRail') {
                                              railScope = child;
                                              break;
                                            }
                                          }
                                        }
                                        break;
                                      }
                                      current = current.parent;
                                    }
                                    if (railScope != null) {
                                      railScope.requestFocus();
                                      return KeyEventResult.handled;
                                    }
                                  }
                                  return KeyEventResult.ignored;
                                },
                              ),
                              childCount: list.length,
                            ),
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Horizontal scrolling row of genre filter chips. The selected chip is filled
/// red; unselected chips use the card surface.
class _GenreFilterRow extends StatelessWidget {
  const _GenreFilterRow({
    required this.selected,
    required this.onTap,
    this.isTv = false,
    this.focusScopeNode,
    this.upFocusNode,
    this.downFocusNode,
  });

  final String? selected;
  final ValueChanged<String> onTap;
  final bool isTv;
  final FocusScopeNode? focusScopeNode;
  final FocusNode? upFocusNode;
  final FocusScopeNode? downFocusNode;

  @override
  Widget build(BuildContext context) {
    final hPad = isTv ? 48.0 : 16.0;
    final childList = ListView.separated(
      scrollDirection: Axis.horizontal,
      padding:
          EdgeInsets.symmetric(horizontal: hPad, vertical: isTv ? 8 : 6),
      itemCount: _genres.length,
      separatorBuilder: (_, _) => SizedBox(width: isTv ? 12 : 8),
      itemBuilder: (_, i) {
        final genre = _genres[i];
        final isSelected = genre == selected;
        return _GenreChip(
          label: genre,
          selected: isSelected,
          onTap: () => onTap(genre),
          isTv: isTv,
          autofocus: false,
          isFirst: i == 0,
          upFocusNode: upFocusNode,
          downFocusNode: downFocusNode,
        );
      },
    );

    if (focusScopeNode != null) {
      return SizedBox(
        height: isTv ? 60 : 44,
        child: FocusScope(
          node: focusScopeNode,
          child: childList,
        ),
      );
    }

    return SizedBox(
      height: isTv ? 60 : 44,
      child: childList,
    );
  }
}

class _GenreChip extends StatefulWidget {
  const _GenreChip({
    required this.label,
    required this.selected,
    required this.onTap,
    this.isTv = false,
    this.autofocus = false,
    this.isFirst = false,
    this.upFocusNode,
    this.downFocusNode,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;
  final bool isTv;
  final bool autofocus;
  final bool isFirst;
  final FocusNode? upFocusNode;
  final FocusScopeNode? downFocusNode;

  @override
  State<_GenreChip> createState() => _GenreChipState();
}

class _GenreChipState extends State<_GenreChip> {
  bool _focused = false;
  late final FocusNode _focusNode;

  @override
  void initState() {
    super.initState();
    _focusNode = FocusNode(debugLabel: 'genreChip_${widget.label}');
    _setupKeyEvent();
  }

  void _setupKeyEvent() {
    _focusNode.onKeyEvent = (node, event) {
      if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
        return KeyEventResult.ignored;
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowLeft && widget.isFirst) {
        FocusNode? current = node;
        FocusScopeNode? railScope;
        while (current != null) {
          if (current is FocusScopeNode && current.debugLabel == 'tvContent') {
            final parentNode = current.parent;
            if (parentNode != null) {
              for (final child in parentNode.children) {
                if (child is FocusScopeNode && child.debugLabel == 'tvRail') {
                  railScope = child;
                  break;
                }
              }
            }
            break;
          }
          current = current.parent;
        }
        if (railScope != null) {
          railScope.requestFocus();
          return KeyEventResult.handled;
        }
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowUp && widget.upFocusNode != null) {
        widget.upFocusNode!.requestFocus();
        return KeyEventResult.handled;
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowDown && widget.downFocusNode != null) {
        widget.downFocusNode!.requestDefaultFocus();
        return KeyEventResult.handled;
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void didUpdateWidget(_GenreChip oldWidget) {
    super.didUpdateWidget(oldWidget);
    _setupKeyEvent();
  }

  @override
  void dispose() {
    _focusNode.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final selected = widget.selected;
    final isTv = widget.isTv;
    return FocusableActionDetector(
      focusNode: _focusNode,
      autofocus: widget.autofocus,
      onFocusChange: (v) => setState(() => _focused = v),
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onTap();
            return null;
          },
        ),
      },
      child: GestureDetector(
        onTap: widget.onTap,
        child: AnimatedScale(
          scale: _focused ? 1.05 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            curve: Curves.easeOut,
            alignment: Alignment.center,
            padding: EdgeInsets.symmetric(horizontal: isTv ? 22 : 16),
            decoration: BoxDecoration(
              color: selected ? Colors.white.withValues(alpha: 0.15) : AppColors.card,
              borderRadius: BorderRadius.circular(isTv ? 26 : 20),
              border: Border.all(
                color: _focused
                    ? Colors.white.withValues(alpha: 0.95)
                    : (selected ? Colors.white.withValues(alpha: 0.5) : AppColors.cardHover),
                width: _focused ? 2.5 : 1.5,
              ),
              boxShadow: (selected || _focused)
                  ? [
                      BoxShadow(
                        color: Colors.white
                            .withValues(alpha: _focused ? 0.15 : 0.1),
                        blurRadius: _focused ? 18 : 14,
                        spreadRadius: 1,
                      )
                    ]
                  : null,
            ),
            child: Text(
              widget.label,
              style: TextStyle(
                fontSize: isTv ? 16 : 13,
                fontWeight: FontWeight.w600,
                color: (selected || _focused) ? AppColors.text : AppColors.textMuted,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// Red accent-bar section header, mirroring [ContentRow]'s title treatment.
class _SectionHeader extends StatelessWidget {
  const _SectionHeader({required this.title, this.isTv = false});

  final String title;
  final bool isTv;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.fromLTRB(
          isTv ? 48 : 16, isTv ? 14 : 8, isTv ? 48 : 16, isTv ? 14 : 10),
      child: Row(
        children: [
          Container(
            width: isTv ? 5 : 4,
            height: isTv ? 26 : 18,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          SizedBox(width: isTv ? 12 : 8),
          Text(
            title,
            style: TextStyle(
              fontSize: isTv ? 25 : 17,
              fontWeight: FontWeight.w700,
              color: AppColors.text,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }
}

/// Centered muted empty state shown when a search returns nothing.
class _EmptyResults extends StatelessWidget {
  const _EmptyResults();

  @override
  Widget build(BuildContext context) {
    return const Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.search_off_rounded,
              color: AppColors.textMuted, size: 48),
          SizedBox(height: 12),
          Text(
            'No results found',
            style: TextStyle(
              color: AppColors.textMuted,
              fontSize: 15,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchTextField extends StatefulWidget {
  const _SearchTextField({
    required this.controller,
    required this.onChanged,
    required this.onSubmitted,
    this.isTv = false,
    this.focusNode,
    this.nextFocusScope,
  });

  final TextEditingController controller;
  final ValueChanged<String> onChanged;
  final ValueChanged<String> onSubmitted;
  final bool isTv;
  final FocusNode? focusNode;
  final FocusScopeNode? nextFocusScope;

  @override
  State<_SearchTextField> createState() => _SearchTextFieldState();
}

class _SearchTextFieldState extends State<_SearchTextField> {
  FocusNode? _localFocusNode;
  FocusNode get _effectiveFocusNode => widget.focusNode ?? (_localFocusNode ??= FocusNode(debugLabel: 'tvSearchField_local'));
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.addListener(_onFocusChange);
    _setupKeyEvent();
  }

  void _onFocusChange() {
    setState(() => _focused = _effectiveFocusNode.hasFocus);
  }

  void _setupKeyEvent() {
    _effectiveFocusNode.onKeyEvent = (node, event) {
      debugPrint('SearchTextField focusNode onKeyEvent: ${event.logicalKey.keyLabel} (event type: ${event.runtimeType})');
      if (event is! KeyDownEvent && event is! KeyRepeatEvent) {
        return KeyEventResult.ignored;
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowLeft) {
        final text = widget.controller.text;
        final selection = widget.controller.selection;
        if (text.isEmpty || (selection.isCollapsed && selection.baseOffset <= 0) || selection.baseOffset == -1) {
          FocusNode? current = node;
          FocusScopeNode? railScope;
          while (current != null) {
            if (current is FocusScopeNode && current.debugLabel == 'tvContent') {
              final parentNode = current.parent;
              if (parentNode != null) {
                for (final child in parentNode.children) {
                  if (child is FocusScopeNode && child.debugLabel == 'tvRail') {
                    railScope = child;
                    break;
                  }
                }
              }
              break;
            }
            current = current.parent;
          }
          if (railScope != null) {
            railScope.requestFocus();
            return KeyEventResult.handled;
          }
        }
      }
      if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
        if (widget.nextFocusScope != null) {
          widget.nextFocusScope!.requestDefaultFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };
  }

  @override
  void didUpdateWidget(_SearchTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusNode != oldWidget.focusNode) {
      oldWidget.focusNode?.removeListener(_onFocusChange);
      _effectiveFocusNode.addListener(_onFocusChange);
    }
    _setupKeyEvent();
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_onFocusChange);
    _localFocusNode?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final isTv = widget.isTv;
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        color: AppColors.card,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _focused ? Colors.white : Colors.transparent,
          width: 2.2,
        ),
        boxShadow: _focused
            ? [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.15),
                  blurRadius: 10,
                  spreadRadius: 1,
                )
              ]
            : null,
      ),
      child: TextField(
        focusNode: _effectiveFocusNode,
        controller: widget.controller,
        onChanged: widget.onChanged,
        onSubmitted: widget.onSubmitted,
        style: TextStyle(
          fontSize: isTv ? 18 : 15,
          color: AppColors.text,
        ),
        textInputAction: TextInputAction.search,
        autofocus: isTv,
        decoration: InputDecoration(
          hintText: 'Search anime…',
          hintStyle: TextStyle(
            fontSize: isTv ? 18 : 15,
            color: AppColors.textMuted,
          ),
          contentPadding: EdgeInsets.symmetric(
            horizontal: 16,
            vertical: isTv ? 16 : 12,
          ),
          prefixIcon: Icon(
            Icons.search,
            color: _focused ? Colors.white : AppColors.textMuted,
            size: isTv ? 26 : 24,
          ),
          suffixIcon: widget.controller.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.clear),
                  onPressed: () {
                    widget.controller.clear();
                    widget.onChanged('');
                  },
                ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
        ),
      ),
    );
  }
}

extension FocusScopeNodeX on FocusScopeNode {
  void requestDefaultFocus() {
    if (focusedChild != null) {
      focusedChild!.requestFocus();
    } else if (children.isNotEmpty) {
      children.first.requestFocus();
    } else {
      requestFocus();
    }
  }
}
