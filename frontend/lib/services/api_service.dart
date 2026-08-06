import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../config/app_config.dart';
import '../models/vehicle.dart';
import '../models/booking.dart';
import '../models/agency_trip.dart';

class ApiService {
  // localhost:3000 during development, same-origin /api once deployed.
  // Can be changed to 10.0.2.2 for Android emulator or customized as needed.
  static String get baseUrl => AppConfig.apiBase;

  static final ApiService instance = ApiService._init();
  ApiService._init();

  // Helper for headers
  Map<String, String> get _headers => {
        'Content-Type': 'application/json',
      };

  // --- Vehicle API ---

  /// Fetches the showcase fleet. `listed=true` keeps unregistered agencies out
  /// of the traveller app — only agencies with an active platform membership
  /// and a paid vehicle listing are returned.
  Future<List<Vehicle>> fetchVehicles({DateTime? date}) async {
    try {
      String url = '$baseUrl/vehicles?listed=true';
      if (date != null) {
        final dateStr = '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
        url += '&date=$dateStr';
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

  /// Trips posted by agencies, for the story bar. `listed=true` keeps out
  /// trips whose bus has lapsed, and trips that have already finished.
  Future<List<AgencyTrip>> fetchTrips() async {
    final response = await http.get(Uri.parse('$baseUrl/trips?listed=true'));
    if (response.statusCode != 200) {
      throw Exception('Failed to load trips: ${response.statusCode}');
    }
    final data = json.decode(response.body) as List<dynamic>;
    return data
        .map((e) => AgencyTrip.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// The signed-in agency's own subscribed vehicles — the ones it can post a
  /// trip against.
  Future<List<Vehicle>> fetchMyListedVehicles(String operatorName) async {
    final response = await http.get(Uri.parse(
      '$baseUrl/vehicles?listed=true&operatorName=${Uri.encodeComponent(operatorName)}',
    ));
    if (response.statusCode != 200) {
      throw Exception('Failed to load your vehicles: ${response.statusCode}');
    }
    final data = json.decode(response.body) as List<dynamic>;
    return data.map((e) => Vehicle.fromJson(e as Map<String, dynamic>)).toList();
  }

  /// Posts a trip status from the app.
  Future<AgencyTrip> createTrip({
    required String operatorName,
    required int vehicleId,
    required String place,
    required String departureDate,
    required String arrivalDate,
    String imageUrl = '',
    String note = '',
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/trips'),
      headers: _headers,
      body: json.encode({
        'operatorName': operatorName,
        'vehicleId': vehicleId,
        'place': place,
        'departureDate': departureDate,
        'arrivalDate': arrivalDate,
        'imageUrl': imageUrl,
        'note': note,
      }),
    );
    final body = json.decode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 201) {
      throw Exception(body['error'] ?? 'Failed to post trip');
    }
    return AgencyTrip.fromJson(body);
  }

  // --- Agency Registration ---

  /// Registers a new travel agency and returns the portal credentials.
  /// The agency stays invisible to travellers until it pays the platform fee
  /// from the admin portal.
  Future<Map<String, dynamic>> registerAgency({
    required String operatorName,
    required String ownerName,
    required String phone,
    required String email,
    required String username,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: _headers,
      body: json.encode({
        'operatorName': operatorName,
        'ownerName': ownerName,
        'phone': phone,
        'email': email,
        'username': username,
        'password': password,
      }),
    );

    final body = json.decode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 201) {
      throw Exception(body['error'] ?? 'Registration failed');
    }
    return body;
  }

  /// Signs an agency owner in with their portal credentials.
  Future<Map<String, dynamic>> loginAgency({
    required String username,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: _headers,
      body: json.encode({'username': username, 'password': password}),
    );
    final body = json.decode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200) {
      throw Exception(body['error'] ?? 'Invalid username or password');
    }
    return body;
  }

  /// Current platform membership and vehicle listings for an agency.
  Future<Map<String, dynamic>> fetchSubscription(String operatorName) async {
    final response = await http.get(
      Uri.parse('$baseUrl/subscriptions?operatorName=${Uri.encodeComponent(operatorName)}'),
    );
    if (response.statusCode != 200) {
      throw Exception('Failed to load subscription: ${response.statusCode}');
    }
    return json.decode(response.body) as Map<String, dynamic>;
  }

  /// Pays or renews the yearly platform fee. This is a traveller-app action —
  /// the admin portal only displays the resulting status and expiry.
  Future<Map<String, dynamic>> payPlatformFee(String operatorName) async {
    final response = await http.post(
      Uri.parse('$baseUrl/subscriptions/platform'),
      headers: _headers,
      body: json.encode({'operatorName': operatorName}),
    );
    final body = json.decode(response.body) as Map<String, dynamic>;
    if (response.statusCode != 200 && response.statusCode != 201) {
      throw Exception(body['error'] ?? 'Payment failed');
    }
    return body;
  }

  /// Plan catalogue — platform fee and the seat-based listing tiers.
  Future<Map<String, dynamic>> fetchPlans() async {
    final response = await http.get(Uri.parse('$baseUrl/subscriptions/plans'));
    if (response.statusCode != 200) {
      throw Exception('Failed to load plans: ${response.statusCode}');
    }
    return json.decode(response.body) as Map<String, dynamic>;
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
