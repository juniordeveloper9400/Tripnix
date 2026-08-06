import 'package:flutter/material.dart';

/// A trip an agency has posted against one of its buses. These fill the story
/// bar at the top of the showcase.
///
/// Distinct from the older in-app [Trip] model, which backs the standalone
/// trips screens — this one comes from `/api/trips`.
class AgencyTrip {
  final int id;
  final String operatorName;
  final int vehicleId;
  final String vehicleName;
  final String vehicleNumber;
  final String vehicleType;
  final int? seats;

  /// Where the trip goes.
  final String place;

  /// YYYY-MM-DD.
  final String departureDate;
  final String arrivalDate;
  final int durationDays;

  final String imageUrl;
  final String note;

  /// 'On Trip' | 'Upcoming' | 'Available' | 'Completed', derived by the API
  /// from the bus's trips. 'Available' means nothing is scheduled.
  final String status;

  /// True when this row is a bus with no trip on the books.
  bool get isAvailable => status == 'Available';

  /// Whether the bus behind this trip still has an active subscription.
  final bool busListed;

  const AgencyTrip({
    required this.id,
    required this.operatorName,
    required this.vehicleId,
    required this.vehicleName,
    required this.vehicleNumber,
    required this.vehicleType,
    required this.place,
    required this.departureDate,
    required this.arrivalDate,
    required this.durationDays,
    required this.imageUrl,
    required this.note,
    required this.status,
    required this.busListed,
    this.seats,
  });

  factory AgencyTrip.fromJson(Map<String, dynamic> json) {
    return AgencyTrip(
      id: json['id'] as int,
      operatorName: json['operatorName'] as String? ?? '',
      vehicleId: json['vehicleId'] as int? ?? 0,
      vehicleName: json['vehicleName'] as String? ?? '',
      vehicleNumber: (json['vehicleNumber'] as String? ?? '').toUpperCase(),
      vehicleType: json['vehicleType'] as String? ?? 'Bus',
      seats: json['seats'] as int?,
      place: json['place'] as String? ?? '',
      departureDate: json['departureDate'] as String? ?? '',
      arrivalDate: json['arrivalDate'] as String? ?? '',
      durationDays: json['durationDays'] as int? ?? 1,
      imageUrl: json['imageUrl'] as String? ?? '',
      note: json['note'] as String? ?? '',
      status: json['status'] as String? ?? 'Scheduled',
      busListed: json['busListed'] as bool? ?? false,
    );
  }

  /// Colour used for the status pill and the story ring.
  Color get statusColor {
    switch (status) {
      case 'On Trip':
        return const Color(0xFF10B981);
      case 'Available':
        return const Color(0xFF3B82F6);
      case 'Completed':
        return const Color(0xFF9CA3AF);
      default:
        return const Color(0xFFE53935);
    }
  }

  IconData get vehicleIcon {
    switch (vehicleType) {
      case 'Car':
        return Icons.directions_car;
      case 'Traveller':
        return Icons.airport_shuttle;
      default:
        return Icons.directions_bus;
    }
  }

  static const _months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ];

  static String _short(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return iso;
    return '${d.day} ${_months[d.month - 1]}';
  }

  String get departureLabel => _short(departureDate);
  String get arrivalLabel => _short(arrivalDate);

  /// Full form with the year, for the detail view — "5 Aug 2026".
  static String _full(String iso) {
    final d = DateTime.tryParse(iso);
    if (d == null) return '—';
    return '${d.day} ${_months[d.month - 1]} ${d.year}';
  }

  String get departureFull => _full(departureDate);
  String get arrivalFull => _full(arrivalDate);

  /// e.g. "12 Aug → 15 Aug · 4 days"
  String get dateRangeLabel =>
      '$departureLabel → $arrivalLabel · $durationDays day${durationDays == 1 ? '' : 's'}';
}
