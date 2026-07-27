import 'package:flutter/material.dart';
import '../../models/story.dart';
import '../../theme/app_colors.dart';
import '../story_viewer_screen.dart';

/// Horizontal, Instagram-style row of square (rounded-edge) story thumbnails
/// posted by bus admins. Sits at the very top of the Explore screen.
class StoriesBar extends StatelessWidget {
  final List<Story> stories;

  const StoriesBar({super.key, required this.stories});

  void _open(BuildContext context, int index) {
    Navigator.of(context).push(
      PageRouteBuilder(
        opaque: true,
        transitionDuration: const Duration(milliseconds: 300),
        pageBuilder: (context, animation, secondaryAnimation) =>
            StoryViewerScreen(stories: stories, initialIndex: index),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 118,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: stories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) => _StoryTile(
          story: stories[index],
          onTap: () => _open(context, index),
        ),
      ),
    );
  }
}

class _StoryTile extends StatelessWidget {
  final Story story;
  final VoidCallback onTap;

  const _StoryTile({required this.story, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Gradient ring (dimmed once seen)
          Container(
            width: 74,
            height: 74,
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(20),
              gradient: story.seen
                  ? null
                  : LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: story.gradient,
                    ),
              color: story.seen ? Colors.grey.shade300 : null,
            ),
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(17),
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(15),
                child: DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: story.gradient,
                    ),
                  ),
                  child: Center(
                    child: story.imageUrl != null
                        ? Image.network(
                            story.imageUrl!,
                            width: double.infinity,
                            height: double.infinity,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.directions_bus,
                                    color: Colors.white, size: 26),
                          )
                        : const Icon(Icons.directions_bus,
                            color: Colors.white, size: 26),
                  ),
                ),
              ),
            ),
          ),
          const SizedBox(height: 6),
          SizedBox(
            width: 74,
            child: Text(
              story.author,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w600,
                color: story.seen ? Colors.grey : AppColors.black,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
