import 'package:flutter/material.dart';
import 'package:video_player/video_player.dart';
import '../../theme/app_colors.dart';

/// Shared media widgets for agency-uploaded vehicle photos and videos.
///
/// Everything here renders what the agency actually uploaded to R2. When
/// nothing has been uploaded yet the widgets show an honest empty state rather
/// than stock photography — a borrowed picture of someone else's coach is
/// worse than no picture, because travellers read it as this agency's bus.

/// Stand-in for a vehicle photo that is missing or failed to load.
class VehicleImagePlaceholder extends StatelessWidget {
  const VehicleImagePlaceholder({
    super.key,
    this.height,
    this.label,
    this.icon = Icons.directions_bus_rounded,
  });

  final double? height;
  final String? label;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: height,
      width: double.infinity,
      color: Colors.grey.shade200,
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(icon, size: 44, color: Colors.grey.shade400),
          if (label != null) ...[
            const SizedBox(height: 8),
            Text(
              label!,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
            ),
          ],
        ],
      ),
    );
  }
}

/// A vehicle photo from R2, with a placeholder for both "no URL" and "failed
/// to load" so a broken link never leaves a blank box.
class VehicleImage extends StatelessWidget {
  const VehicleImage({
    super.key,
    required this.url,
    this.height,
    this.fit = BoxFit.cover,
    this.emptyLabel,
  });

  final String? url;
  final double? height;
  final BoxFit fit;
  final String? emptyLabel;

  @override
  Widget build(BuildContext context) {
    final value = url?.trim() ?? '';
    if (value.isEmpty) {
      return VehicleImagePlaceholder(height: height, label: emptyLabel);
    }

    return Image.network(
      value,
      height: height,
      width: double.infinity,
      fit: fit,
      errorBuilder: (_, _, _) =>
          VehicleImagePlaceholder(height: height, label: emptyLabel),
      loadingBuilder: (context, child, progress) {
        if (progress == null) return child;
        return Container(
          height: height,
          width: double.infinity,
          color: Colors.grey.shade200,
          alignment: Alignment.center,
          child: const SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(strokeWidth: 2.2),
          ),
        );
      },
    );
  }
}

/// Plays the videos an agency uploaded for a vehicle.
///
/// Renders nothing at all when the list is empty, so the "Video Tour" heading
/// can be hidden too instead of framing an empty box.
class VehicleVideoGallery extends StatefulWidget {
  const VehicleVideoGallery({super.key, required this.videoUrls});

  final List<String> videoUrls;

  @override
  State<VehicleVideoGallery> createState() => _VehicleVideoGalleryState();
}

class _VehicleVideoGalleryState extends State<VehicleVideoGallery> {
  int _index = 0;

  @override
  Widget build(BuildContext context) {
    final urls = widget.videoUrls.where((u) => u.trim().isNotEmpty).toList();
    if (urls.isEmpty) return const SizedBox.shrink();

    // Rebuilding the player when the index changes is what disposes the old
    // controller and loads the newly selected clip.
    final safeIndex = _index.clamp(0, urls.length - 1);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _VehicleVideoPlayer(
          key: ValueKey(urls[safeIndex]),
          url: urls[safeIndex],
        ),
        if (urls.length > 1) ...[
          const SizedBox(height: 10),
          SizedBox(
            height: 34,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: urls.length,
              separatorBuilder: (_, _) => const SizedBox(width: 8),
              itemBuilder: (context, i) {
                final selected = i == safeIndex;
                return ChoiceChip(
                  label: Text('Clip ${i + 1}'),
                  selected: selected,
                  onSelected: (_) => setState(() => _index = i),
                  labelStyle: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: selected ? Colors.white : AppColors.black,
                  ),
                  selectedColor: AppColors.red,
                  backgroundColor: Colors.grey.shade200,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                );
              },
            ),
          ),
        ],
      ],
    );
  }
}

class _VehicleVideoPlayer extends StatefulWidget {
  const _VehicleVideoPlayer({super.key, required this.url});

  final String url;

  @override
  State<_VehicleVideoPlayer> createState() => _VehicleVideoPlayerState();
}

class _VehicleVideoPlayerState extends State<_VehicleVideoPlayer> {
  VideoPlayerController? _controller;
  bool _ready = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    final controller = VideoPlayerController.networkUrl(
      Uri.parse(widget.url),
    );
    _controller = controller;
    try {
      await controller.initialize();
      if (!mounted) return;
      setState(() => _ready = true);
    } catch (e) {
      if (!mounted) return;
      // A corrupt or non-video file reaches here; say so rather than showing a
      // spinner for ever.
      setState(() => _error = 'This video could not be played.');
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlay() {
    final c = _controller;
    if (c == null || !_ready) return;
    setState(() => c.value.isPlaying ? c.pause() : c.play());
  }

  @override
  Widget build(BuildContext context) {
    final controller = _controller;

    if (_error != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: VehicleImagePlaceholder(
          height: 200,
          icon: Icons.videocam_off_rounded,
          label: _error,
        ),
      );
    }

    if (controller == null || !_ready) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(16),
        child: Container(
          height: 200,
          color: Colors.black,
          alignment: Alignment.center,
          child: const CircularProgressIndicator(
            strokeWidth: 2.4,
            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
          ),
        ),
      );
    }

    return ClipRRect(
      borderRadius: BorderRadius.circular(16),
      child: AspectRatio(
        aspectRatio: controller.value.aspectRatio,
        child: Stack(
          alignment: Alignment.center,
          children: [
            VideoPlayer(controller),
            // Tap anywhere to play or pause.
            Positioned.fill(
              child: GestureDetector(
                onTap: _togglePlay,
                behavior: HitTestBehavior.opaque,
                child: AnimatedOpacity(
                  opacity: controller.value.isPlaying ? 0 : 1,
                  duration: const Duration(milliseconds: 200),
                  child: Container(
                    color: Colors.black.withValues(alpha: 0.35),
                    alignment: Alignment.center,
                    child: CircleAvatar(
                      radius: 28,
                      backgroundColor: AppColors.red.withValues(alpha: 0.9),
                      child: const Icon(
                        Icons.play_arrow,
                        color: Colors.white,
                        size: 34,
                      ),
                    ),
                  ),
                ),
              ),
            ),
            Positioned(
              left: 0,
              right: 0,
              bottom: 0,
              child: VideoProgressIndicator(
                controller,
                allowScrubbing: true,
                colors: const VideoProgressColors(
                  playedColor: AppColors.red,
                  bufferedColor: Colors.white38,
                  backgroundColor: Colors.white24,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
