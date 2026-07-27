import 'package:flutter/material.dart';
import '../models/story.dart';

/// Instagram-style full-screen viewer with segmented progress bars,
/// auto-advance, and tap-left / tap-right navigation.
class StoryViewerScreen extends StatefulWidget {
  final List<Story> stories;
  final int initialIndex;

  const StoryViewerScreen({
    super.key,
    required this.stories,
    this.initialIndex = 0,
  });

  @override
  State<StoryViewerScreen> createState() => _StoryViewerScreenState();
}

class _StoryViewerScreenState extends State<StoryViewerScreen>
    with SingleTickerProviderStateMixin {
  static const _storyDuration = Duration(seconds: 5);

  late final PageController _pageController;
  late final AnimationController _progress;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex;
    _pageController = PageController(initialPage: _index);
    _progress = AnimationController(vsync: this, duration: _storyDuration)
      ..addStatusListener((status) {
        if (status == AnimationStatus.completed) _next();
      });
    _start();
  }

  void _start() {
    _progress
      ..reset()
      ..forward();
  }

  void _next() {
    if (_index < widget.stories.length - 1) {
      setState(() => _index++);
      _pageController.animateToPage(
        _index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _start();
    } else {
      Navigator.of(context).pop();
    }
  }

  void _previous() {
    if (_index > 0) {
      setState(() => _index--);
      _pageController.animateToPage(
        _index,
        duration: const Duration(milliseconds: 300),
        curve: Curves.easeInOut,
      );
      _start();
    } else {
      _start();
    }
  }

  @override
  void dispose() {
    _progress.dispose();
    _pageController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapDown: (details) {
          if (details.globalPosition.dx < width / 3) {
            _previous();
          } else {
            _next();
          }
        },
        onLongPressStart: (_) => _progress.stop(),
        onLongPressEnd: (_) => _progress.forward(),
        child: Stack(
          children: [
            // Story pages
            PageView.builder(
              controller: _pageController,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: widget.stories.length,
              itemBuilder: (context, i) => _StoryPage(story: widget.stories[i]),
            ),

            // Segmented progress bars
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(8, 10, 8, 0),
                child: Row(
                  children: List.generate(widget.stories.length, (i) {
                    return Expanded(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 2),
                        child: _SegmentBar(
                          animation: _progress,
                          filled: i < _index,
                          active: i == _index,
                        ),
                      ),
                    );
                  }),
                ),
              ),
            ),

            // Header: author + close button
            SafeArea(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(16, 24, 8, 0),
                child: Row(
                  children: [
                    Container(
                      width: 34,
                      height: 34,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(10),
                        gradient: LinearGradient(
                          colors: widget.stories[_index].gradient,
                        ),
                      ),
                      child: const Icon(Icons.directions_bus,
                          color: Colors.white, size: 18),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        widget.stories[_index].author,
                        style: const TextStyle(
                          color: Colors.white,
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                    ),
                    IconButton(
                      icon: const Icon(Icons.close, color: Colors.white),
                      onPressed: () => Navigator.of(context).pop(),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// A single filling progress segment.
class _SegmentBar extends StatelessWidget {
  final Animation<double> animation;
  final bool filled;
  final bool active;

  const _SegmentBar({
    required this.animation,
    required this.filled,
    required this.active,
  });

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(2),
      child: SizedBox(
        height: 3,
        child: AnimatedBuilder(
          animation: animation,
          builder: (context, _) {
            final value = filled ? 1.0 : (active ? animation.value : 0.0);
            return LinearProgressIndicator(
              value: value,
              backgroundColor: Colors.white24,
              valueColor: const AlwaysStoppedAnimation(Colors.white),
            );
          },
        ),
      ),
    );
  }
}

/// The full-screen content for one story.
class _StoryPage extends StatelessWidget {
  final Story story;

  const _StoryPage({required this.story});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: story.gradient,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          if (story.imageUrl != null)
            Image.network(
              story.imageUrl!,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => const SizedBox(),
            ),
          // Bottom gradient scrim for text legibility
          Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.center,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.transparent,
                  Colors.black.withValues(alpha: 0.55),
                ],
              ),
            ),
          ),
          Align(
            alignment: Alignment.bottomLeft,
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 48),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    story.title,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 26,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    story.subtitle,
                    style: const TextStyle(
                      color: Colors.white70,
                      fontSize: 15,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
