import 'dart:async';
import 'dart:convert';

import 'package:flutter/material.dart';

import '../models/agency_trip.dart';
import '../theme/app_colors.dart';
import 'trip_detail_sheet.dart';

/// How long one status stays on screen before the next one plays.
const _statusDuration = Duration(seconds: 5);

/// Opens an agency's trip statuses full screen and plays them in order —
/// oldest posted first, then the next, the way WhatsApp and Instagram stories
/// do.
///
/// [statuses] is played in whatever order it is given; callers pass them
/// already sorted. [initialIndex] starts partway in, so tapping the third tile
/// in the bar opens on that status rather than restarting the sequence.
Future<void> showStatusStory(
  BuildContext context,
  List<AgencyTrip> statuses, {
  int initialIndex = 0,
}) {
  if (statuses.isEmpty) return Future<void>.value();
  return Navigator.of(context).push(
    PageRouteBuilder<void>(
      opaque: false,
      barrierColor: Colors.black,
      pageBuilder: (_, _, _) =>
          _StatusStoryViewer(statuses: statuses, initialIndex: initialIndex),
      transitionsBuilder: (_, animation, _, child) =>
          FadeTransition(opacity: animation, child: child),
    ),
  );
}

class _StatusStoryViewer extends StatefulWidget {
  const _StatusStoryViewer({required this.statuses, required this.initialIndex});

  final List<AgencyTrip> statuses;
  final int initialIndex;

  @override
  State<_StatusStoryViewer> createState() => _StatusStoryViewerState();
}

class _StatusStoryViewerState extends State<_StatusStoryViewer>
    with SingleTickerProviderStateMixin {
  late final AnimationController _progress;
  late int _index;

  @override
  void initState() {
    super.initState();
    _index = widget.initialIndex.clamp(0, widget.statuses.length - 1);
    _progress = AnimationController(vsync: this, duration: _statusDuration)
      ..addStatusListener((status) {
        // One status finishing is what advances to the next, so the sequence
        // plays through on its own without the viewer having to tap.
        if (status == AnimationStatus.completed) _next();
      });
    _progress.forward();
  }

  @override
  void dispose() {
    _progress.dispose();
    super.dispose();
  }

  AgencyTrip get _current => widget.statuses[_index];

  void _next() {
    if (!mounted) return;
    if (_index >= widget.statuses.length - 1) {
      // Only close if this is still the visible route. The last status running
      // out while something else sits on top must not pop that instead.
      if (ModalRoute.of(context)?.isCurrent ?? false) {
        Navigator.of(context).maybePop();
      }
      return;
    }
    setState(() => _index++);
    _progress
      ..reset()
      ..forward();
  }

  void _previous() {
    if (_index == 0) {
      // Already on the first status: restart it rather than closing, so a
      // mis-tap on the left never drops the viewer out of the sequence.
      _progress
        ..reset()
        ..forward();
      return;
    }
    setState(() => _index--);
    _progress
      ..reset()
      ..forward();
  }

  /// Left third goes back, the rest goes forward — the gesture both apps use.
  void _onTapUp(TapUpDetails details, double width) {
    if (details.localPosition.dx < width / 3) {
      _previous();
    } else {
      _next();
    }
  }

  void _openDetails() {
    _progress.stop();
    showTripDetailSheet(context, _current).whenComplete(() {
      if (mounted) _progress.forward();
    });
  }

  @override
  Widget build(BuildContext context) {
    final width = MediaQuery.of(context).size.width;
    final trip = _current;

    return Scaffold(
      backgroundColor: Colors.black,
      body: GestureDetector(
        onTapUp: (d) => _onTapUp(d, width),
        // Holding pauses, so a viewer can read a status that is about to turn
        // over; releasing anywhere resumes.
        onLongPressStart: (_) => _progress.stop(),
        onLongPressEnd: (_) => _progress.forward(),
        onVerticalDragEnd: (d) {
          if ((d.primaryVelocity ?? 0) > 200) Navigator.of(context).maybePop();
        },
        child: Stack(
          fit: StackFit.expand,
          children: [
            _StoryImage(url: trip.imageUrl),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.black87, Colors.transparent, Colors.black87],
                  stops: [0.0, 0.35, 0.85],
                ),
              ),
            ),
            SafeArea(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _ProgressBars(
                    count: widget.statuses.length,
                    index: _index,
                    progress: _progress,
                  ),
                  _Header(
                    trip: trip,
                    position: '${_index + 1}/${widget.statuses.length}',
                    onClose: () => Navigator.of(context).maybePop(),
                  ),
                  const Spacer(),
                  _Caption(trip: trip, onDetails: _openDetails),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// One segment per status: filled behind the current one, animating on it, and
/// empty ahead of it — so the viewer can see how many are left.
class _ProgressBars extends StatelessWidget {
  const _ProgressBars({
    required this.count,
    required this.index,
    required this.progress,
  });

  final int count;
  final int index;
  final Animation<double> progress;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(10, 10, 10, 4),
      child: Row(
        children: List.generate(count, (i) {
          return Expanded(
            child: Padding(
              padding: EdgeInsets.only(right: i == count - 1 ? 0 : 4),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(2),
                child: SizedBox(
                  height: 3,
                  child: i == index
                      ? AnimatedBuilder(
                          animation: progress,
                          builder: (_, _) => LinearProgressIndicator(
                            value: progress.value,
                            backgroundColor: Colors.white24,
                            valueColor: const AlwaysStoppedAnimation(
                              Colors.white,
                            ),
                          ),
                        )
                      : ColoredBox(
                          color: i < index ? Colors.white : Colors.white24,
                        ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  const _Header({
    required this.trip,
    required this.position,
    required this.onClose,
  });

  final AgencyTrip trip;
  final String position;
  final VoidCallback onClose;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(14, 6, 8, 0),
      child: Row(
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                colors: [AppColors.red, Color(0xFFFF5252)],
              ),
              shape: BoxShape.circle,
            ),
            alignment: Alignment.center,
            child: Text(
              trip.operatorName.isEmpty
                  ? '?'
                  : trip.operatorName.trim()[0].toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontWeight: FontWeight.w900,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  trip.operatorName,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                Text(
                  '${trip.vehicleNumber.isEmpty ? trip.vehicleName : trip.vehicleNumber} · $position',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(color: Colors.white70, fontSize: 11),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onClose,
            icon: const Icon(Icons.close, color: Colors.white),
          ),
        ],
      ),
    );
  }
}

class _Caption extends StatelessWidget {
  const _Caption({required this.trip, required this.onDetails});

  final AgencyTrip trip;
  final VoidCallback onDetails;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(18, 0, 18, 28),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
            decoration: BoxDecoration(
              color: trip.statusColor,
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              trip.status.toUpperCase(),
              style: const TextStyle(
                color: Colors.white,
                fontSize: 10,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.5,
              ),
            ),
          ),
          const SizedBox(height: 10),
          Text(
            trip.place,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 26,
              fontWeight: FontWeight.w900,
              height: 1.1,
            ),
          ),
          const SizedBox(height: 6),
          Row(
            children: [
              const Icon(Icons.event, size: 14, color: Colors.white70),
              const SizedBox(width: 6),
              Text(
                '${trip.departureLabel} → ${trip.arrivalLabel} · '
                '${trip.durationDays} day${trip.durationDays == 1 ? '' : 's'}',
                style: const TextStyle(color: Colors.white70, fontSize: 12.5),
              ),
            ],
          ),
          if (trip.note.isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              trip.note,
              maxLines: 3,
              overflow: TextOverflow.ellipsis,
              style: const TextStyle(color: Colors.white, fontSize: 13),
            ),
          ],
          const SizedBox(height: 14),
          // Its own tap target: a tap anywhere else advances the story, so
          // reaching the full detail needs a button of its own.
          GestureDetector(
            onTap: onDetails,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                color: Colors.white.withValues(alpha: 0.16),
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: Colors.white30),
              ),
              child: const Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.info_outline, size: 15, color: Colors.white),
                  SizedBox(width: 7),
                  Text(
                    'View trip details',
                    style: TextStyle(
                      color: Colors.white,
                      fontSize: 12.5,
                      fontWeight: FontWeight.w700,
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

/// The status photo, filling the screen. Falls back to a plain panel so a
/// status posted without a picture still plays rather than showing a broken
/// image.
class _StoryImage extends StatelessWidget {
  const _StoryImage({required this.url});

  final String url;

  @override
  Widget build(BuildContext context) {
    if (url.isEmpty) return const _StoryFallback();

    if (url.startsWith('data:image') || url.contains(';base64,')) {
      try {
        return Image.memory(
          base64Decode(url.split(',').last),
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => const _StoryFallback(),
        );
      } catch (_) {
        return const _StoryFallback();
      }
    }

    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (_, _, _) => const _StoryFallback(),
    );
  }
}

class _StoryFallback extends StatelessWidget {
  const _StoryFallback();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF1F2937), Color(0xFF111827)],
        ),
      ),
      child: Center(
        child: Icon(Icons.directions_bus, size: 72, color: Colors.white24),
      ),
    );
  }
}
