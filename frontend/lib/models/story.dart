import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// A single admin-posted story (e.g. a latest trip highlight).
/// Self-contained in-app model — swap [sampleStories] for a backend feed later.
class Story {
  final int id;

  /// Name shown under the story thumbnail (the bus admin / operator).
  final String author;

  /// Short caption shown over the full-screen story.
  final String title;

  /// Longer line describing the trip / update.
  final String subtitle;

  /// Optional network image for the story background; falls back to [gradient].
  final String? imageUrl;

  /// Gradient used for the thumbnail ring and as an image fallback.
  final List<Color> gradient;

  /// Whether the current user has already viewed this story.
  final bool seen;

  const Story({
    required this.id,
    required this.author,
    required this.title,
    required this.subtitle,
    this.imageUrl,
    required this.gradient,
    this.seen = false,
  });
}

/// Seed stories so the top bar looks alive on first launch.
/// These represent the latest trips posted by bus admins.
List<Story> sampleStories() => const [
      Story(
        id: 1,
        author: 'Goa Express',
        title: 'Weekend in Goa',
        subtitle: 'Beach hopping · 3 days · Departs Aug 14',
        gradient: [Color(0xFFFFC61A), Color(0xFFE53935)],
      ),
      Story(
        id: 2,
        author: 'Highland Tours',
        title: 'Himalayan Trek',
        subtitle: 'Snow peaks · 7 days · Departs Sep 2',
        gradient: [Color(0xFF1A1A1A), Color(0xFF4A4A4A)],
      ),
      Story(
        id: 3,
        author: 'City Rovers',
        title: 'Paris Getaway',
        subtitle: 'City lights · 5 days · Departs Oct 10',
        gradient: [Color(0xFFE53935), Color(0xFF1A1A1A)],
        seen: true,
      ),
      Story(
        id: 4,
        author: 'Coastline Co.',
        title: 'Pacific Coast Drive',
        subtitle: 'Ocean roads · 6 days · Departs Nov 5',
        gradient: [Color(0xFFFFC61A), Color(0xFFB71C1C)],
      ),
      Story(
        id: 5,
        author: 'Desert Lines',
        title: 'Dunes at Dawn',
        subtitle: 'Golden sands · 4 days · Departs Dec 1',
        gradient: [AppColors.red, AppColors.yellow],
        seen: true,
      ),
    ];
