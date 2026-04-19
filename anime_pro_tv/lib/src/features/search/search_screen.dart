import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:speech_to_text/speech_to_text.dart' as stt;
import 'package:permission_handler/permission_handler.dart';
import 'package:glassmorphism/glassmorphism.dart';
import '../../services/api_service.dart';
import '../home/widgets/anime_grid_screen.dart';
import '../../core/tv_focusable.dart';

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  final TextEditingController _controller = TextEditingController();
  List<dynamic> _results = [];
  bool _isSearching = false;
  Timer? _debounce;

  // Voice Search State
  final stt.SpeechToText _speech = stt.SpeechToText();
  bool _isListening = false;
  String _lastWords = '';

  @override
  void initState() {
    super.initState();
    _initSpeech();
  }

  Future<void> _initSpeech() async {
    try {
      await _speech.initialize(
        onStatus: (status) {
          if (status == 'done' || status == 'notListening') {
            if (mounted) {
              setState(() => _isListening = false);
              if (_controller.text.isNotEmpty) {
                _performSearch(_controller.text);
              }
            }
          }
        },
        onError: (e) => setState(() => _isListening = false),
      );
    } catch (e) {
      debugPrint('Speech init error: $e');
    }
  }

  @override
  void dispose() {
    _debounce?.cancel();
    _controller.dispose();
    super.dispose();
  }

  Future<void> _toggleVoiceSearch() async {
    if (_isListening) {
      await _speech.stop();
      setState(() => _isListening = false);
      return;
    }

    final status = await Permission.microphone.request();
    if (status.isPermanentlyDenied) {
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Microphone permission is denied permanently.')));
      return;
    }

    if (!status.isGranted) return;

    final available = await _speech.initialize();
    if (available) {
      setState(() {
        _isListening = true;
        _lastWords = '';
      });
      _speech.listen(
        onResult: (val) => setState(() {
          _lastWords = val.recognizedWords;
          if (val.hasConfidenceRating && val.confidence > 0) {
             _controller.text = _lastWords;
          }
        }),
        listenFor: const Duration(seconds: 15),
        pauseFor: const Duration(seconds: 3),
      );
    }
  }

  void _onSearchChanged(String query) {
    if (_debounce?.isActive ?? false) _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 350), () {
      if (query.isNotEmpty) {
        _performSearch(query);
      } else {
        setState(() => _results = []);
      }
    });
  }

  Future<void> _performSearch(String query) async {
    if (query.isEmpty) return;
    setState(() => _isSearching = true);
    try {
      final api = context.read<ApiService>();
      final data = await api.search(query);
      if (!mounted) return;
      setState(() {
        _results = data;
        _isSearching = false;
      });
    } catch (e) {
      print('Search error: $e');
      if (!mounted) return;
      setState(() => _isSearching = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        AnimeGridScreen(
          title: 'SEARCH',
          isLoading: _isSearching,
          items: _results,
          header: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 16),
            child: Row(
              children: [
                Expanded(
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white10,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: TextField(
                      controller: _controller,
                      autofocus: true,
                      style: const TextStyle(color: Colors.white, fontSize: 18),
                      decoration: InputDecoration(
                        hintText: 'Type anime name...',
                        hintStyle: const TextStyle(color: Colors.white38),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                        prefixIcon: const Icon(Icons.search, color: Colors.white38),
                        suffixIcon: TVFocusable(
                          onTap: _toggleVoiceSearch,
                          child: Padding(
                            padding: const EdgeInsets.all(8.0),
                            child: Icon(
                              _isListening ? Icons.mic : Icons.mic_none_rounded,
                              color: _isListening ? Colors.red : Colors.white38,
                              size: 24,
                            ),
                          ),
                        ),
                      ),
                      onChanged: _onSearchChanged,
                      onSubmitted: _performSearch,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                TVFocusable(
                  onTap: () => _performSearch(_controller.text),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                    decoration: BoxDecoration(
                      color: Colors.red,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text('SEARCH', style: TextStyle(fontWeight: FontWeight.bold)),
                  ),
                ),
              ],
            ),
          ),
        ),
        if (_isListening) _buildListeningOverlay(),
      ],
    );
  }

  Widget _buildListeningOverlay() {
    return Positioned.fill(
      child: Center(
        child: GlassmorphicContainer(
          width: 400,
          height: 250,
          borderRadius: 24,
          blur: 15,
          alignment: Alignment.center,
          border: 2,
          linearGradient: LinearGradient(colors: [Colors.white.withOpacity(0.1), Colors.white.withOpacity(0.05)]),
          borderGradient: LinearGradient(colors: [Colors.red.withOpacity(0.5), Colors.transparent]),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.mic, size: 64, color: Colors.red),
              const SizedBox(height: 20),
              const Text('LISTENING...', style: TextStyle(fontSize: 24, fontWeight: FontWeight.w900, color: Colors.white)),
              const SizedBox(height: 10),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Text(
                  _lastWords.isEmpty ? 'Say something...' : _lastWords,
                  textAlign: TextAlign.center,
                  style: const TextStyle(color: Colors.white54),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
