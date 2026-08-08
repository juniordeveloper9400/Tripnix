import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/agency_trip.dart';
import '../theme/app_colors.dart';

/// Full detail for a posted trip: image, agency, place, the start/end date window
/// and the bus it runs on, with its live status.
///
/// Returns when the sheet closes, so a caller that paused something to show it
/// — the story viewer pauses playback — knows when to resume.
Future<void> showTripDetailSheet(BuildContext context, AgencyTrip trip) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.transparent,
    builder: (_) => _TripDetailSheet(trip: trip),
  );
}

class _TripDetailSheet extends StatelessWidget {
  const _TripDetailSheet({required this.trip});

  final AgencyTrip trip;

  Widget _buildImage(String url) {
    if (url.isEmpty) return _fallback();
    if (url.startsWith('data:image') || url.contains(';base64,')) {
      try {
        final base64Data = url.split(',').last;
        final bytes = base64Decode(base64Data);
        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stack) => _fallback(),
        );
      } catch (_) {
        return _fallback();
      }
    }
    return Image.network(
      url,
      fit: BoxFit.cover,
      errorBuilder: (context, error, stack) => _fallback(),
    );
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.72,
      minChildSize: 0.45,
      maxChildSize: 0.95,
      builder: (context, controller) => Container(
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(26)),
        ),
        clipBehavior: Clip.antiAlias,
        child: ListView(
          controller: controller,
          padding: EdgeInsets.zero,
          children: [
            Stack(
              children: [
                SizedBox(
                  height: 220,
                  width: double.infinity,
                  child: _buildImage(trip.imageUrl),
                ),
                Positioned(
                  top: 12,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: Container(
                      width: 42,
                      height: 4,
                      decoration: BoxDecoration(
                        color: Colors.white70,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 16,
                  bottom: 14,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 5),
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
                        letterSpacing: 0.6,
                      ),
                    ),
                  ),
                ),
              ],
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 18, 20, 28),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  // Destination leads — it is what the trip is about.
                  Row(
                    children: [
                      const Icon(Icons.place, color: AppColors.red, size: 22),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          trip.isAvailable
                              ? 'No trip scheduled'
                              : trip.place,
                          style: const TextStyle(
                            fontSize: 21,
                            fontWeight: FontWeight.w900,
                            color: AppColors.black,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.storefront,
                          size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          trip.operatorName,
                          style: TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.w600,
                            color: Colors.grey[600],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // The same details the agency filled in on Add Trip Status.
                  if (!trip.isAvailable) ...[
                    const _SectionLabel('Trip Details'),
                    Container(
                      decoration: BoxDecoration(
                        color: AppColors.background,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        children: [
                          _DetailRow(
                            icon: Icons.place_outlined,
                            label: 'Destination',
                            value: trip.place,
                          ),
                          const _RowDivider(),
                          _DetailRow(
                            icon: Icons.calendar_month,
                            label: 'Start Date',
                            value: trip.departureFull,
                          ),
                          const _RowDivider(),
                          _DetailRow(
                            icon: Icons.event_available,
                            label: 'End Date',
                            value: trip.arrivalFull,
                          ),
                          const _RowDivider(),
                          _DetailRow(
                            icon: Icons.schedule,
                            label: 'Duration',
                            value:
                                '${trip.durationDays} day${trip.durationDays == 1 ? '' : 's'}',
                          ),
                          if (trip.note.isNotEmpty) ...[
                            const _RowDivider(),
                            _DetailRow(
                              icon: Icons.notes,
                              label: 'Note',
                              value: trip.note,
                            ),
                          ],
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ] else ...[
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.blue.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(14),
                        border:
                            Border.all(color: Colors.blue.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          Icon(Icons.event_available,
                              size: 18, color: Colors.blue.shade700),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'This bus has no trip on the books — it is free to book.',
                              style: TextStyle(
                                fontSize: 12.5,
                                height: 1.45,
                                color: Colors.blue.shade900,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 20),
                  ],

                  const _SectionLabel('Bus'),

                  // The bus this trip runs on
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppColors.background,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.grey.shade200),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 42,
                          height: 42,
                          decoration: BoxDecoration(
                            color: AppColors.red.withValues(alpha: 0.1),
                            borderRadius: BorderRadius.circular(12),
                          ),
                          child: Icon(trip.vehicleIcon,
                              color: AppColors.red, size: 22),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                trip.vehicleName,
                                style: const TextStyle(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              const SizedBox(height: 3),
                              Text(
                                [
                                  trip.vehicleNumber,
                                  trip.vehicleType,
                                  if (trip.seats != null) '${trip.seats} seats',
                                ].where((s) => s.isNotEmpty).join('  ·  '),
                                style: TextStyle(
                                  fontSize: 11.5,
                                  color: Colors.grey[600],
                                ),
                              ),
                            ],
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                              horizontal: 9, vertical: 4),
                          decoration: BoxDecoration(
                            color: (trip.busListed ? Colors.green : AppColors.red)
                                .withValues(alpha: 0.12),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            trip.busListed ? 'ACTIVE' : 'INACTIVE',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.w900,
                              color: trip.busListed
                                  ? Colors.green.shade800
                                  : AppColors.red,
                            ),
                          ),
                        ),
                      ],
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

  Widget _fallback() => const DecoratedBox(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [AppColors.black, Color(0xFF3A3A3A)],
          ),
        ),
        child: Center(
          child: Icon(Icons.landscape_outlined, color: Colors.white54, size: 46),
        ),
      );
}

/// Small heading above each block of the detail sheet.
class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);

  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Text(
        text,
        style: const TextStyle(fontSize: 13.5, fontWeight: FontWeight.w800),
      ),
    );
  }
}

/// One labelled field, mirroring what the agency typed on Add Trip Status.
class _DetailRow extends StatelessWidget {
  const _DetailRow({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 13),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 17, color: AppColors.red),
          const SizedBox(width: 12),
          SizedBox(
            width: 88,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 12,
                fontWeight: FontWeight.w600,
                color: Colors.grey[600],
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: const TextStyle(
                fontSize: 13.5,
                fontWeight: FontWeight.w700,
                color: AppColors.black,
                height: 1.35,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _RowDivider extends StatelessWidget {
  const _RowDivider();

  @override
  Widget build(BuildContext context) {
    return Divider(height: 1, thickness: 1, color: Colors.grey.shade200);
  }
}
