import 'package:flutter/material.dart';

/// A single trip. Pure in-app model — no backend required.
class Trip {
  final int id;
  final String title;
  final String destination;
  final int days;
  final DateTime startDate;
  final String category;
  final double price;
  final List<Color> gradient;

  const Trip({
    required this.id,
    required this.title,
    required this.destination,
    required this.days,
    required this.startDate,
    required this.category,
    required this.price,
    required this.gradient,
  });

  String get dateLabel {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
    ];
    final end = startDate.add(Duration(days: days - 1));
    final startStr = '${months[startDate.month - 1]} ${startDate.day}';
    final endStr = '${months[end.month - 1]} ${end.day}';
    return '$startStr – $endStr';
  }
}

/// Trip categories used by the filter chips.
const List<String> kCategories = [
  'All',
  'Beach',
  'Mountain',
  'City',
  'Road Trip',
];

/// Palette of gradients assigned to new trips, keyed loosely by category.
/// All stay within the black / red / yellow theme.
const Map<String, List<Color>> kCategoryGradients = {
  'Beach': [Color(0xFFFFC61A), Color(0xFFE53935)], // yellow → red
  'Mountain': [Color(0xFF1A1A1A), Color(0xFF4A4A4A)], // black → grey
  'City': [Color(0xFFE53935), Color(0xFF1A1A1A)], // red → black
  'Road Trip': [Color(0xFFFFC61A), Color(0xFFB71C1C)], // yellow → dark red
  'All': [Color(0xFF1A1A1A), Color(0xFFE53935)], // black → red
};

/// Icon shown per category.
IconData iconForCategory(String category) {
  switch (category) {
    case 'Beach':
      return Icons.beach_access;
    case 'Mountain':
      return Icons.terrain;
    case 'City':
      return Icons.location_city;
    case 'Road Trip':
      return Icons.directions_car;
    default:
      return Icons.public;
  }
}

/// Seed data so the app looks alive on first launch.
List<Trip> sampleTrips() => [
      Trip(
        id: 1,
        title: 'Weekend in Goa',
        destination: 'Goa, India',
        days: 3,
        startDate: DateTime(2026, 8, 14),
        category: 'Beach',
        price: 420,
        gradient: kCategoryGradients['Beach']!,
      ),
      Trip(
        id: 2,
        title: 'Himalayan Trek',
        destination: 'Manali, India',
        days: 7,
        startDate: DateTime(2026, 9, 2),
        category: 'Mountain',
        price: 890,
        gradient: kCategoryGradients['Mountain']!,
      ),
      Trip(
        id: 3,
        title: 'Paris Getaway',
        destination: 'Paris, France',
        days: 5,
        startDate: DateTime(2026, 10, 10),
        category: 'City',
        price: 1450,
        gradient: kCategoryGradients['City']!,
      ),
      Trip(
        id: 4,
        title: 'Pacific Coast Drive',
        destination: 'California, USA',
        days: 6,
        startDate: DateTime(2026, 11, 5),
        category: 'Road Trip',
        price: 1120,
        gradient: kCategoryGradients['Road Trip']!,
      ),
    ];
