import 'dart:convert';
import 'package:flutter/material.dart';
import '../models/agency_trip.dart';
import '../theme/app_colors.dart';

/// Full detail for a posted trip: image, agency, place, the start/end date window
/// and the bus it runs on, with its live status.
void showTripDetailSheet(BuildContext context, AgencyTrip trip) {
  showModalBottomSheet<void>(
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
                  Row(
                    children: [
                      const Icon(Icons.business_center, color: AppColors.red, size: 20),
                      const SizedBox(width: 6),
                      Expanded(
                        child: Text(
                          trip.operatorName.isNotEmpty ? trip.operatorName : trip.place,
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
                      Icon(Icons.place_outlined, size: 14, color: Colors.grey[600]),
                      const SizedBox(width: 4),
                      Text(
                        'Destination: ${trip.place}',
                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.w600, color: Colors.grey[600]),
                      ),
                    ],
                  ),
                  if (trip.note.isNotEmpty) ...[
                    const SizedBox(height: 12),
                    Text(
                      trip.note,
                      style: const TextStyle(fontSize: 13.5, height: 1.5),
                    ),
                  ],
                  const SizedBox(height: 20),

                  // Start date / End date window
                  Row(
                    children: [
                      Expanded(
                        child: _DateBlock(
                          icon: Icons.calendar_month,
                          label: 'Start Date',
                          value: trip.departureLabel,
                        ),
                      ),
                      Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 8),
                        child: Column(
                          children: [
                            Icon(Icons.arrow_forward,
                                size: 18, color: Colors.grey[400]),
                            const SizedBox(height: 2),
                            Text(
                              '${trip.durationDays}d',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey[500],
                              ),
                            ),
                          ],
                        ),
                      ),
                      Expanded(
                        child: _DateBlock(
                          icon: Icons.event_available,
                          label: 'End Date',
                          value: trip.arrivalLabel,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

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

class _DateBlock extends StatelessWidget {
  const _DateBlock({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 12),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        children: [
          Icon(icon, size: 18, color: AppColors.red),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.w600,
              color: Colors.grey[600],
            ),
          ),
          const SizedBox(height: 3),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w900,
              color: AppColors.black,
            ),
          ),
        ],
      ),
    );
  }
}
