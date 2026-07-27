import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/vehicle.dart';
import '../models/booking.dart';

class ApiService {
  // Use localhost for Chrome/Web development.
  // Can be changed to 10.0.2.2 for Android emulator or customized as needed.
  static const String baseUrl = 'http://localhost:3000/api';

  static final ApiService instance = ApiService._init();
  ApiService._init();

  // Helper for headers
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
      };

  // --- Vehicle API ---

  Future<List<Vehicle>> fetchVehicles({DateTime? date}) async {
    try {
      String url = '$baseUrl/vehicles';
      if (date != null) {
        final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
        url += '?date=$dateStr';
      }
      final response = await http.get(Uri.parse(url));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Vehicle.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load vehicles: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('ApiService Error fetchVehicles: $e');
      rethrow;
    }
  }

  Future<Vehicle> addVehicle(Vehicle vehicle) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/vehicles'),
        headers: _headers,
        body: json.encode(vehicle.toJson()),
      );
      if (response.statusCode == 201) {
        return Vehicle.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to add vehicle: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error addVehicle: $e');
      rethrow;
    }
  }

  Future<Vehicle> updateVehicle(Vehicle vehicle) async {
    try {
      final response = await http.put(
        Uri.parse('$baseUrl/vehicles/${vehicle.id}'),
        headers: _headers,
        body: json.encode(vehicle.toJson()),
      );
      if (response.statusCode == 200) {
        return Vehicle.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to update vehicle: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error updateVehicle: $e');
      rethrow;
    }
  }

  Future<void> deleteVehicle(int id) async {
    try {
      final response = await http.delete(Uri.parse('$baseUrl/vehicles/$id'));
      if (response.statusCode != 204) {
        throw Exception('Failed to delete vehicle: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error deleteVehicle: $e');
      rethrow;
    }
  }

  // --- Bookings API ---

  Future<List<Booking>> fetchBookings() async {
    try {
      final response = await http.get(Uri.parse('$baseUrl/bookings'));
      if (response.statusCode == 200) {
        final List<dynamic> data = json.decode(response.body);
        return data.map((json) => Booking.fromJson(json)).toList();
      } else {
        throw Exception('Failed to load bookings: ${response.statusCode}');
      }
    } catch (e) {
      debugPrint('ApiService Error fetchBookings: $e');
      rethrow;
    }
  }

  Future<Booking> createBooking(Booking booking) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/bookings'),
        headers: _headers,
        body: json.encode(booking.toJson()),
      );
      if (response.statusCode == 201) {
        return Booking.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to create booking: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error createBooking: $e');
      rethrow;
    }
  }

  Future<Booking> updateBookingStatus(int bookingId, String status) async {
    try {
      final response = await http.patch(
        Uri.parse('$baseUrl/bookings/$bookingId'),
        headers: _headers,
        body: json.encode({'status': status}),
      );
      if (response.statusCode == 200) {
        return Booking.fromJson(json.decode(response.body));
      } else {
        throw Exception('Failed to update booking status: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error updateBookingStatus: $e');
      rethrow;
    }
  }

  Future<void> cancelBooking(int id) async {
    try {
      final response = await http.delete(Uri.parse('$baseUrl/bookings/$id'));
      if (response.statusCode != 204) {
        throw Exception('Failed to cancel booking: ${response.body}');
      }
    } catch (e) {
      debugPrint('ApiService Error cancelBooking: $e');
      rethrow;
    }
  }
}
