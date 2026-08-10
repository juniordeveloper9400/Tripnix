import 'package:flutter/material.dart';
import '../../models/vehicle.dart';
import '../../theme/app_colors.dart';
import '../vehicle_detail_screen.dart';
import 'agency_contact_sheet.dart';
import 'vehicle_media.dart';
import 'vehicle_schedule_sheet.dart';

class VehicleCard extends StatelessWidget {
  const VehicleCard({
    super.key,
    required this.vehicle,
    this.onDelete,
    this.showDelete = false,
    this.availableOnSelectedDate = true,
    this.nextAvailable,
    this.onJumpToNextAvailable,
  });

  final Vehicle vehicle;
  final VoidCallback? onDelete;
  final bool showDelete;

  /// Whether this bus can be booked on the date the showcase is showing. A bus
  /// that cannot is dimmed rather than hidden, so an agency's newly added bus
  /// is never invisible just because its dates start later.
  final bool availableOnSelectedDate;

  /// The next day it *is* free, when known.
  final DateTime? nextAvailable;

  /// Moves the showcase to [nextAvailable]. Null when the bus is already free
  /// on the shown date, which is what makes the card open normally instead.
  final void Function(DateTime date)? onJumpToNextAvailable;

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  /// Phrased as what the bus *can* do rather than what it cannot — it is a
  /// normal listing with different dates, not an inactive one.
  String get _nextLabel => nextAvailable == null
      ? 'No upcoming dates'
      : 'Free from ${nextAvailable!.day} ${_months[nextAvailable!.month - 1]}';

  @override
  Widget build(BuildContext context) {
    final busy = !availableOnSelectedDate;

    return Container(
      margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            spreadRadius: 2,
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: () {
            // Opening a bus that cannot be booked on the day being shown would
            // only lead to a dead end, so the tap moves the date instead.
            if (busy && nextAvailable != null && onJumpToNextAvailable != null) {
              onJumpToNextAvailable!(nextAvailable!);
              return;
            }
            Navigator.push(
              context,
              MaterialPageRoute(
                builder: (context) => VehicleDetailScreen(vehicle: vehicle),
              ),
            );
          },
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Vehicle Image Section with Hero and Badges
              Stack(
                children: [
                  // Every bus is shown in full colour, whether or not it is free
                  // on the day being browsed. Greying the busy ones made a
                  // perfectly good bus look broken or delisted; the date badge
                  // below carries that information instead.
                  Hero(
                    tag: 'vehicle_image_${vehicle.id}',
                    child: VehicleImage(
                      url: vehicle.imageUrls.isNotEmpty
                          ? vehicle.imageUrls.first
                          : null,
                      height: 180,
                      emptyLabel: 'No photo yet',
                    ),
                  ),
                  // Semi-transparent gradient overlay for badge readability
                  Positioned.fill(
                    child: Container(
                      decoration: BoxDecoration(
                        gradient: LinearGradient(
                          begin: Alignment.topCenter,
                          end: Alignment.bottomCenter,
                          colors: [
                            Colors.black.withValues(alpha: 0.3),
                            Colors.transparent,
                            Colors.transparent,
                            Colors.black.withValues(alpha: 0.5),
                          ],
                        ),
                      ),
                    ),
                  ),
                  // Vehicle Type Badge (Bus / Car)
                  // When the bus is free, in the same style as the card's other
                  // badges so it reads as one more detail about a normal
                  // listing rather than a warning on a disabled one.
                  if (busy)
                    Positioned(
                      top: 12,
                      right: 12,
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                          horizontal: 10,
                          vertical: 6,
                        ),
                        decoration: BoxDecoration(
                          color: AppColors.black.withValues(alpha: 0.7),
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(
                              Icons.event_available,
                              size: 13,
                              color: Colors.white,
                            ),
                            const SizedBox(width: 5),
                            Text(
                              _nextLabel,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 10.5,
                                fontWeight: FontWeight.w800,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  Positioned(
                    top: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: AppColors.red,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(
                            vehicle.type == 'Bus' ? Icons.directions_bus : Icons.directions_car,
                            size: 14,
                            color: Colors.white,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            vehicle.type.toUpperCase(),
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              letterSpacing: 0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Operator Badge
                  Positioned(
                    bottom: 12,
                    left: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: AppColors.black.withValues(alpha: 0.7),
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.business, size: 12, color: AppColors.yellow),
                          const SizedBox(width: 4),
                          Text(
                            vehicle.operatorName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  // Delete Button for Admin
                  if (showDelete && onDelete != null)
                    Positioned(
                      top: 10,
                      right: 10,
                      child: CircleAvatar(
                        backgroundColor: Colors.white,
                        radius: 18,
                        child: IconButton(
                          padding: EdgeInsets.zero,
                          icon: const Icon(Icons.delete, color: AppColors.red, size: 18),
                          onPressed: onDelete,
                        ),
                      ),
                    ),
                ],
              ),
              // Vehicle Details Section
              Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Expanded(
                          child: Text(
                            vehicle.name,
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.w800,
                              color: AppColors.black,
                            ),
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        // The score comes from the amenities the agency listed,
                        // so the word beside it says what the number means —
                        // a bare "4.2" reads as a review average, which it is
                        // not.
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.end,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Row(
                              children: [
                                const Icon(
                                  Icons.star,
                                  size: 16,
                                  color: AppColors.yellow,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  vehicle.rating.toStringAsFixed(1),
                                  style: const TextStyle(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                            if (vehicle.ratingLabel.isNotEmpty)
                              Text(
                                vehicle.ratingLabel,
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.grey[600],
                                ),
                              ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Seating Capacity and Features Summary
                    Row(
                      children: [
                        _SpecIcon(
                          icon: Icons.airline_seat_recline_normal,
                          label: '${vehicle.capacity} Seats',
                        ),
                        const SizedBox(width: 16),
                        _SpecIcon(
                          icon: Icons.verified_user_outlined,
                          label: 'Insured',
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),
                    const Divider(height: 1, color: Color(0xFFEEEEEE)),
                    const SizedBox(height: 12),
                    // Contact row — no pricing on the card. Tapping reveals the
                    // mobile number the agency gave when its account was made.
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Vehicle Number',
                                style: TextStyle(
                                  fontSize: 11,
                                  color: Colors.grey[600],
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                vehicle.vehicleNumber.isEmpty
                                    ? '—'
                                    : vehicle.vehicleNumber,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  fontSize: 15,
                                  fontWeight: FontWeight.w900,
                                  color: AppColors.black,
                                  letterSpacing: 0.4,
                                ),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(width: 10),
                        // Sits beside Contact so a traveller can check the bus
                        // is free before ringing the agency about it.
                        GestureDetector(
                          onTap: () => showVehicleScheduleSheet(
                            context,
                            vehicleId: vehicle.id,
                            vehicleName: vehicle.name,
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 14, vertical: 10),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: AppColors.black, width: 1.4),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.event_note,
                                    size: 15, color: AppColors.black),
                                SizedBox(width: 6),
                                Text(
                                  'Schedule',
                                  style: TextStyle(
                                    color: AppColors.black,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        GestureDetector(
                          onTap: () => showAgencyContactSheet(
                            context,
                            vehicle.operatorName,
                          ),
                          child: Container(
                            padding: const EdgeInsets.symmetric(
                                horizontal: 16, vertical: 10),
                            decoration: BoxDecoration(
                              color: AppColors.black,
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: const Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(Icons.call, size: 15, color: Colors.white),
                                SizedBox(width: 6),
                                Text(
                                  'Contact',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 13,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SpecIcon extends StatelessWidget {
  const _SpecIcon({required this.icon, required this.label});

  final IconData icon;
  final String label;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(icon, size: 16, color: Colors.grey[600]),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(
            color: Colors.grey[700],
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
        ),
      ],
    );
  }
}
