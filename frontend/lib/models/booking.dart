class Booking {
  final int id;
  final int vehicleId;
  final String vehicleName;
  final String userName;
  final String userPhone;
  final DateTime startDate;
  final DateTime endDate;
  final double totalCost;
  final String status; // 'Pending', 'Confirmed', 'Cancelled'

  const Booking({
    required this.id,
    required this.vehicleId,
    required this.vehicleName,
    required this.userName,
    required this.userPhone,
    required this.startDate,
    required this.endDate,
    required this.totalCost,
    required this.status,
  });

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as int,
      vehicleId: json['vehicleId'] as int,
      vehicleName: json['vehicleName'] as String? ?? "Unknown Vehicle",
      userName: json['userName'] as String,
      userPhone: json['userPhone'] as String,
      startDate: DateTime.parse(json['startDate'] as String),
      endDate: DateTime.parse(json['endDate'] as String),
      totalCost: (json['totalCost'] as num).toDouble(),
      status: json['status'] as String? ?? "Pending",
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'vehicleId': vehicleId,
      'vehicleName': vehicleName,
      'userName': userName,
      'userPhone': userPhone,
      'startDate': startDate.toIso8601String().split('T')[0],
      'endDate': endDate.toIso8601String().split('T')[0],
      'totalCost': totalCost,
      'status': status,
    };
  }

  int get totalDays {
    final difference = endDate.difference(startDate).inDays;
    return difference <= 0 ? 1 : difference;
  }
}
