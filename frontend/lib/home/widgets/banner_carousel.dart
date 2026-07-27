import 'dart:async';
import 'package:flutter/material.dart';
import '../../theme/app_colors.dart';

/// One banner slide: a network image (served by the backend) with a bundled
/// asset as an offline fallback.
class BannerSlide {
  final String networkUrl;
  final String assetPath;
  const BannerSlide({required this.networkUrl, required this.assetPath});
}

/// Auto-rotating banner used at the top of the Explore screen. Fades between
/// slides, shows page dots, and darkens each image so foreground text stays
/// legible.
class BannerCarousel extends StatefulWidget {
  final List<BannerSlide> slides;
  final Duration interval;

  const BannerCarousel({
    super.key,
    required this.slides,
    this.interval = const Duration(seconds: 4),
  });

  @override
  State<BannerCarousel> createState() => _BannerCarouselState();
}

class _BannerCarouselState extends State<BannerCarousel> {
  final PageController _controller = PageController();
  Timer? _timer;
  int _index = 0;

  @override
  void initState() {
    super.initState();
    if (widget.slides.length > 1) {
      _timer = Timer.periodic(widget.interval, (_) => _advance());
    }
  }

  void _advance() {
    if (!mounted) return;
    final next = (_index + 1) % widget.slides.length;
    _controller.animateToPage(
      next,
      duration: const Duration(milliseconds: 600),
      curve: Curves.easeInOut,
    );
  }

  @override
  void dispose() {
    _timer?.cancel();
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        PageView.builder(
          controller: _controller,
          itemCount: widget.slides.length,
          onPageChanged: (i) => setState(() => _index = i),
          itemBuilder: (context, i) {
            final slide = widget.slides[i];
            return Image.network(
              slide.networkUrl,
              fit: BoxFit.cover,
              errorBuilder: (context, error, stackTrace) => Image.asset(
                slide.assetPath,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => Container(
                  color: AppColors.black,
                ),
              ),
            );
          },
        ),
        // Darkening gradient for text legibility
        IgnorePointer(
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topCenter,
                end: Alignment.bottomCenter,
                colors: [
                  Colors.black.withValues(alpha: 0.5),
                  Colors.black.withValues(alpha: 0.2),
                  Colors.black.withValues(alpha: 0.5),
                ],
              ),
            ),
          ),
        ),
        // Page dots
        if (widget.slides.length > 1)
          Positioned(
            bottom: 12,
            left: 0,
            right: 0,
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: List.generate(widget.slides.length, (i) {
                final active = i == _index;
                return AnimatedContainer(
                  duration: const Duration(milliseconds: 250),
                  margin: const EdgeInsets.symmetric(horizontal: 3),
                  width: active ? 20 : 7,
                  height: 7,
                  decoration: BoxDecoration(
                    color: active ? AppColors.yellow : Colors.white70,
                    borderRadius: BorderRadius.circular(4),
                  ),
                );
              }),
            ),
          ),
      ],
    );
  }
}
