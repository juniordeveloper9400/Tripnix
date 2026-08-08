/// Whether a vehicle is available for booking on [date].
/// Checks against the vehicle's posted [availableDates] (YYYY-MM-DD).
bool vehicleAvailableOn(Vehicle vehicle, DateTime date) {
  final year = date.year.toString();
  final month = date.month.toString().padLeft(2, '0');
  final day = date.day.toString().padLeft(2, '0');
  final formatted = '$year-$month-$day';

  if (vehicle.availableDates.isNotEmpty) {
    return vehicle.availableDates.contains(formatted);
  }

  // Fallback if no dates set
  return true;
}

/// The first date on or after [from] that the vehicle is free, or null when it
/// has none — either because it posted no dates at all (so it is always free)
/// or because every date it posted has passed.
///
/// The showcase shows a bus that is busy on the chosen day rather than hiding
/// it, and needs this to say when it next comes free.
DateTime? nextAvailableDate(Vehicle vehicle, DateTime from) {
  if (vehicle.availableDates.isEmpty) return null;

  final floor = DateTime(from.year, from.month, from.day);
  final upcoming =
      vehicle.availableDates
          .map(DateTime.tryParse)
          .whereType<DateTime>()
          .where((d) => !d.isBefore(floor))
          .toList()
        ..sort();

  return upcoming.isEmpty ? null : upcoming.first;
}

class Vehicle {
  final int id;
  final String name;
  final String type; // 'Bus', 'Traveller' or 'Car'
  final String vehicleNumber;
  final String operatorName;
  final double pricePerDay;
  final int capacity;
  final List<String> availableDates;
  final List<String> features;
  final List<String> imageUrls;
  final List<String> videoUrls;
  final String description;
  final double rating;
  final int reviewsCount;
  final String instagramUrl;
  final String contactPhone;

  const Vehicle({
    required this.id,
    required this.name,
    required this.type,
    this.vehicleNumber = '',
    required this.operatorName,
    required this.pricePerDay,
    required this.capacity,
    required this.availableDates,
    required this.features,
    required this.imageUrls,
    required this.videoUrls,
    required this.description,
    required this.rating,
    required this.reviewsCount,
    this.instagramUrl = '',
    this.contactPhone = '',
  });

  factory Vehicle.fromJson(Map<String, dynamic> json) {
    return Vehicle(
      id: json['id'] as int,
      name: json['name'] as String,
      type: json['type'] as String,
      vehicleNumber: (json['vehicleNumber'] as String? ?? '').toUpperCase(),
      operatorName: json['operatorName'] as String? ?? "My Travels",
      pricePerDay: (json['pricePerDay'] as num? ?? 0).toDouble(),
      capacity: json['capacity'] as int? ?? 36,
      availableDates: (json['availableDates'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      features: (json['features'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      imageUrls: (json['imageUrls'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      videoUrls: (json['videoUrls'] as List<dynamic>?)?.map((e) => e as String).toList() ?? [],
      description: json['description'] as String? ?? "",
      rating: (json['rating'] as num? ?? 5.0).toDouble(),
      reviewsCount: json['reviewsCount'] as int? ?? 0,
      instagramUrl: json['instagramUrl'] as String? ?? '',
      contactPhone: json['contactPhone'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'type': type,
      'vehicleNumber': vehicleNumber,
      'operatorName': operatorName,
      'pricePerDay': pricePerDay,
      'capacity': capacity,
      'availableDates': availableDates,
      'features': features,
      'imageUrls': imageUrls,
      'videoUrls': videoUrls,
      'description': description,
      'rating': rating,
      'reviewsCount': reviewsCount,
      'instagramUrl': instagramUrl,
    };
  }
}
