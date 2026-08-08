import 'dart:convert';
import 'package:flutter/material.dart';
import '../../agency/agency_session.dart';
import '../../models/agency_trip.dart';
import '../../theme/app_colors.dart';
import '../add_trip_status_screen.dart';
import '../status_story_viewer.dart';

/// Horizontal row of trips posted by agencies against their buses. Sits at the
/// very top of the Explore screen, in place of the old sample stories.
///
/// Each tile shows the trip place, its departure/arrival window and a status
/// pill driven by the bus behind it.
class TripsBar extends StatelessWidget {
  const TripsBar({
    super.key,
    required this.trips,
    required this.isLoading,
    required this.onTripAdded,
  });

  final List<AgencyTrip> trips;
  final bool isLoading;

  /// Called after the agency posts a new trip, so the feed can refresh.
  final Future<void> Function() onTripAdded;

  @override
  Widget build(BuildContext context) {
    if (isLoading) {
      return const SizedBox(
        height: 170,
        child: Center(
          child: SizedBox(
            width: 22,
            height: 22,
            child: CircularProgressIndicator(
              strokeWidth: 2.4,
              color: AppColors.red,
            ),
          ),
        ),
      );
    }

    // The signed-in agency's own statuses live *inside* the first tile rather
    // than as separate tiles of their own — the agency sees its own posts on
    // its own card, the way a story ring works, and the rest of the row is
    // other agencies.
    final own = AgencySession.instance.operatorName.trim().toLowerCase();
    final mine = own.isEmpty
        ? const <AgencyTrip>[]
        : (trips.where((t) => t.operatorName.trim().toLowerCase() == own).toList()
            ..sort((a, b) => a.compareByPosted(b)));
    final others = trips
        .where((t) => t.operatorName.trim().toLowerCase() != own)
        .toList();

    return SizedBox(
      height: 180,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        itemCount: others.length + 1,
        separatorBuilder: (context, index) => const SizedBox(width: 12),
        itemBuilder: (context, index) {
          if (index == 0) {
            return _AddStatusTile(onAdded: onTripAdded, mine: mine);
          }
          final trip = others[index - 1];
          return _TripTile(
            trip: trip,
            // Opens that agency's statuses and plays them in the order they
            // were posted, starting from the one tapped.
            onTap: () {
              final agency = trip.operatorName.trim().toLowerCase();
              final theirs =
                  trips
                      .where((t) => t.operatorName.trim().toLowerCase() == agency)
                      .toList()
                    ..sort((a, b) => a.compareByPosted(b));
              showStatusStory(
                context,
                theirs,
                initialIndex: theirs.indexWhere((t) => t.id == trip.id),
              );
            },
          );
        },
      ),
    );
  }
}

/// The viewing agency's own tile, first in the row.
///
/// It carries the agency's own posted statuses as well as the + to post a new
/// one: their trips are shown *here* rather than as separate tiles further
/// along the row, so the card reads as "your agency" the way a story ring does.
class _AddStatusTile extends StatelessWidget {
  const _AddStatusTile({required this.onAdded, required this.mine});

  final Future<void> Function() onAdded;

  /// This agency's own live statuses, oldest posted first — the order they
  /// play in. Empty until they post one from the admin portal or the + below.
  final List<AgencyTrip> mine;

  /// The status shown on the tile. The newest post is the one worth showing as
  /// the cover, even though playback starts from the oldest.
  AgencyTrip? get _featured => mine.isEmpty ? null : mine.last;

  Future<void> _open(BuildContext context) async {
    final posted = await Navigator.of(context).push<bool>(
      MaterialPageRoute(builder: (_) => const AddTripStatusScreen()),
    );
    if (posted == true) await onAdded();
  }

  /// Tapping the card plays the agency's own statuses from the first one
  /// posted through to the latest; with nothing posted it opens the form.
  void _openOwn(BuildContext context) {
    if (mine.isEmpty) {
      _open(context);
      return;
    }
    showStatusStory(context, mine);
  }

  @override
  Widget build(BuildContext context) {
    final session = AgencySession.instance;
    final name = session.operatorName.isEmpty
        ? 'Your Agency'
        : session.operatorName;
    final initials = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((w) => w.isNotEmpty)
        .take(2)
        .map((w) => w[0].toUpperCase())
        .join();

    final featured = _featured;

    return GestureDetector(
      onTap: () => _openOwn(context),
      child: SizedBox(
        width: 148,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: 94,
              width: 148,
              child: Stack(
                clipBehavior: Clip.none,
                children: [
                  if (featured != null)
                    _OwnStatusCard(trip: featured, extraCount: mine.length - 1)
                  else
                  Container(
                    height: 94,
                    width: 148,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppColors.red.withValues(alpha: 0.3), width: 1.8),
                      gradient: LinearGradient(
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                        colors: [
                          Colors.white,
                          AppColors.red.withValues(alpha: 0.04),
                        ],
                      ),
                    ),
                    alignment: Alignment.center,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [AppColors.red, Color(0xFFFF5252)],
                            ),
                            shape: BoxShape.circle,
                            boxShadow: [
                              BoxShadow(
                                color: AppColors.red.withValues(alpha: 0.25),
                                blurRadius: 6,
                                offset: const Offset(0, 2),
                              ),
                            ],
                          ),
                          alignment: Alignment.center,
                          child: Text(
                            initials.isEmpty ? '?' : initials,
                            style: const TextStyle(
                              fontSize: 15,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                        ),
                        const SizedBox(height: 6),
                        Text(
                          'Add Status',
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: AppColors.black.withValues(alpha: 0.8),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // Its own tap target: with a status already showing behind
                  // it, tapping the card opens that status, so the + has to
                  // stay the way to post another.
                  Positioned(
                    right: 6,
                    bottom: 6,
                    child: GestureDetector(
                      onTap: () => _open(context),
                      child: Container(
                        width: 26,
                        height: 26,
                        decoration: BoxDecoration(
                          color: AppColors.red,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 2),
                          boxShadow: const [
                            BoxShadow(
                              color: Colors.black26,
                              blurRadius: 4,
                              offset: Offset(0, 1),
                            )
                          ],
                        ),
                        child: const Icon(
                          Icons.add,
                          color: Colors.white,
                          size: 16,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  featured == null
                      ? '+ Post a trip status'
                      : mine.length > 1
                      ? '${featured.place} · +${mine.length - 1} more'
                      : featured.place,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: 10.5,
                    fontWeight: FontWeight.w600,
                    color: featured == null ? AppColors.red : Colors.grey[600],
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _TripTile extends StatelessWidget {
  const _TripTile({required this.trip, required this.onTap});

  final AgencyTrip trip;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: SizedBox(
        width: 148,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              height: 94,
              width: 148,
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: trip.statusColor, width: 2),
              ),
              padding: const EdgeInsets.all(2.5),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(14),
                child: Stack(
                  fit: StackFit.expand,
                  children: [
                    _buildTileImage(trip.imageUrl),
                    // Scrim so the status pill and place stay readable.
                    const DecoratedBox(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [Colors.transparent, Colors.black87],
                          stops: [0.45, 1.0],
                        ),
                      ),
                    ),
                    Positioned(
                      top: 6,
                      left: 6,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 7,
                          vertical: 3,
                        ),
                        decoration: BoxDecoration(
                          color: trip.statusColor,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          trip.status.toUpperCase(),
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 8.5,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 0.4,
                          ),
                        ),
                      ),
                    ),
                    Positioned(
                      left: 8,
                      right: 8,
                      bottom: 7,
                      child: Row(
                        children: [
                          Icon(
                            trip.vehicleIcon,
                            size: 13,
                            color: Colors.white70,
                          ),
                          const SizedBox(width: 5),
                          Expanded(
                            child: Text(
                              trip.vehicleNumber.isEmpty
                                  ? trip.vehicleName
                                  : trip.vehicleNumber,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 9.5,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 6),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  trip.operatorName.isNotEmpty ? trip.operatorName : trip.place,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 12.5,
                    fontWeight: FontWeight.w800,
                    color: AppColors.black,
                  ),
                ),
                const SizedBox(height: 2),
                Row(
                  children: [
                    Icon(
                      // An available bus has no dates to show, so name the
                      // vehicle instead of rendering an empty "→".
                      trip.isAvailable ? trip.vehicleIcon : Icons.event,
                      size: 11,
                      color: Colors.grey[500],
                    ),
                    const SizedBox(width: 3),
                    Expanded(
                      child: Text(
                        trip.isAvailable
                            ? trip.vehicleName
                            : '${trip.departureLabel} → ${trip.arrivalLabel}',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(
                          fontSize: 10.5,
                          color: Colors.grey[600],
                        ),
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

}

/// The photo behind a status tile. Shared by the agency's own tile and every
/// other agency's, so both render an uploaded image the same way.
Widget _buildTileImage(String url) {
  if (url.isEmpty) return const _TripFallback();
  if (url.startsWith('data:image') || url.contains(';base64,')) {
    try {
      final base64Data = url.split(',').last;
      final bytes = base64Decode(base64Data);
      return Image.memory(
        bytes,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stack) => const _TripFallback(),
      );
    } catch (_) {
      return const _TripFallback();
    }
  }
  return Image.network(
    url,
    fit: BoxFit.cover,
    errorBuilder: (context, error, stack) => const _TripFallback(),
  );
}

class _TripFallback extends StatelessWidget {
  const _TripFallback();

  @override
  Widget build(BuildContext context) {
    return const DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [AppColors.black, Color(0xFF3A3A3A)],
        ),
      ),
      child: Center(
        child: Icon(Icons.landscape_outlined, color: Colors.white54, size: 26),
      ),
    );
  }
}

/// The agency's own status, drawn inside its tile.
///
/// Deliberately mirrors [_TripTile]'s look — same photo, scrim, status pill and
/// vehicle line — so the agency's own post reads as the same kind of thing as
/// everyone else's, just on its own card with the + still on it.
class _OwnStatusCard extends StatelessWidget {
  const _OwnStatusCard({required this.trip, required this.extraCount});

  final AgencyTrip trip;

  /// How many further statuses this agency has behind this one.
  final int extraCount;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 94,
      width: 148,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.red, width: 2),
      ),
      padding: const EdgeInsets.all(2.5),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(14),
        child: Stack(
          fit: StackFit.expand,
          children: [
            _buildTileImage(trip.imageUrl),
            const DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Colors.transparent, Colors.black87],
                  stops: [0.45, 1.0],
                ),
              ),
            ),
            Positioned(
              top: 6,
              left: 6,
              child: Container(
                padding: const EdgeInsets.symmetric(
                  horizontal: 7,
                  vertical: 3,
                ),
                decoration: BoxDecoration(
                  color: trip.statusColor,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: Text(
                  trip.status.toUpperCase(),
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8.5,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4,
                  ),
                ),
              ),
            ),
            // Only shown when there is something more to see, so the tile does
            // not imply hidden statuses that are not there.
            if (extraCount > 0)
              Positioned(
                top: 6,
                right: 6,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.55),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Text(
                    '+$extraCount',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 9,
                      fontWeight: FontWeight.w900,
                    ),
                  ),
                ),
              ),
            Positioned(
              // Clear of the + badge in the bottom-right corner.
              left: 8,
              right: 38,
              bottom: 7,
              child: Row(
                children: [
                  Icon(trip.vehicleIcon, size: 13, color: Colors.white70),
                  const SizedBox(width: 5),
                  Expanded(
                    child: Text(
                      trip.vehicleNumber.isEmpty
                          ? trip.vehicleName
                          : trip.vehicleNumber,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 9.5,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
