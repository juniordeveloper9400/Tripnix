import 'package:flutter/material.dart';

import '../models/trip.dart';
import '../theme/app_colors.dart';
import 'widgets/trip_card.dart';
import 'add_trip_screen.dart';

class TripsScreen extends StatefulWidget {
  const TripsScreen({super.key});

  @override
  State<TripsScreen> createState() => _TripsScreenState();
}

class _TripsScreenState extends State<TripsScreen> {
  final List<Trip> _trips = sampleTrips();
  String _selectedCategory = 'All';
  String _query = '';
  int _nextId = 100;

  List<Trip> get _visibleTrips {
    return _trips.where((t) {
      final matchesCategory =
          _selectedCategory == 'All' || t.category == _selectedCategory;
      final q = _query.trim().toLowerCase();
      final matchesQuery = q.isEmpty ||
          t.title.toLowerCase().contains(q) ||
          t.destination.toLowerCase().contains(q);
      return matchesCategory && matchesQuery;
    }).toList();
  }

  Future<void> _openAddTrip() async {
    final trip = await Navigator.of(context).push<Trip>(
      MaterialPageRoute(builder: (_) => AddTripScreen(nextId: _nextId)),
    );
    if (trip != null) {
      setState(() {
        _trips.insert(0, trip);
        _nextId++;
      });
    }
  }

  void _deleteTrip(Trip trip) {
    final index = _trips.indexOf(trip);
    setState(() => _trips.remove(trip));
    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          content: Text('Deleted "${trip.title}"'),
          action: SnackBarAction(
            label: 'Undo',
            onPressed: () => setState(() => _trips.insert(index, trip)),
          ),
        ),
      );
  }

  @override
  Widget build(BuildContext context) {
    final trips = _visibleTrips;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          _Header(
            tripCount: _trips.length,
            onSearch: (v) => setState(() => _query = v),
          ),
          SliverToBoxAdapter(
            child: _CategoryBar(
              selected: _selectedCategory,
              onSelect: (c) => setState(() => _selectedCategory = c),
            ),
          ),
          const SliverToBoxAdapter(
            child: Padding(
              padding: EdgeInsets.fromLTRB(20, 8, 20, 4),
              child: Text(
                'Your Trips',
                style: TextStyle(fontSize: 20, fontWeight: FontWeight.w700),
              ),
            ),
          ),
          if (trips.isEmpty)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: _EmptyState(),
            )
          else
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(16, 4, 16, 100),
              sliver: SliverList.builder(
                itemCount: trips.length,
                itemBuilder: (context, index) {
                  final trip = trips[index];
                  return TripCard(
                    trip: trip,
                    onDelete: () => _deleteTrip(trip),
                  );
                },
              ),
            ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _openAddTrip,
        icon: const Icon(Icons.add),
        label: const Text('New Trip'),
      ),
    );
  }
}

/// Gradient app header with greeting + search field.
class _Header extends StatelessWidget {
  const _Header({required this.tripCount, required this.onSearch});

  final int tripCount;
  final ValueChanged<String> onSearch;

  @override
  Widget build(BuildContext context) {
    return SliverAppBar(
      pinned: false,
      floating: false,
      expandedHeight: 210,
      automaticallyImplyLeading: false,
      backgroundColor: AppColors.black,
      flexibleSpace: FlexibleSpaceBar(
        background: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: AppColors.headerGradient,
            ),
          ),
          child: SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.travel_explore,
                          color: Colors.white, size: 28),
                      const SizedBox(width: 8),
                      const Text(
                        'Tripnix',
                        style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0.5,
                        ),
                      ),
                      const Spacer(),
                      CircleAvatar(
                        backgroundColor: Colors.white.withValues(alpha: 0.2),
                        child: const Icon(Icons.person, color: Colors.white),
                      ),
                    ],
                  ),
                  const SizedBox(height: 18),
                  Text(
                    'Where to next?',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.95),
                      fontSize: 26,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '$tripCount trips planned',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.8),
                      fontSize: 14,
                    ),
                  ),
                  const SizedBox(height: 14),
                  _SearchField(onChanged: onSearch),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _SearchField extends StatelessWidget {
  const _SearchField({required this.onChanged});

  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    return Material(
      elevation: 0,
      borderRadius: BorderRadius.circular(14),
      child: TextField(
        onChanged: onChanged,
        decoration: InputDecoration(
          hintText: 'Search trips or destinations',
          prefixIcon: const Icon(Icons.search),
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(vertical: 0),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(14),
            borderSide: BorderSide.none,
          ),
        ),
      ),
    );
  }
}

/// Horizontal scrolling category filter chips.
class _CategoryBar extends StatelessWidget {
  const _CategoryBar({required this.selected, required this.onSelect});

  final String selected;
  final ValueChanged<String> onSelect;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 48,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        itemCount: kCategories.length,
        separatorBuilder: (_, _) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = kCategories[index];
          final isSelected = category == selected;
          return ChoiceChip(
            label: Text(category),
            selected: isSelected,
            onSelected: (_) => onSelect(category),
            showCheckmark: false,
            avatar: Icon(
              iconForCategory(category),
              size: 18,
              color: isSelected ? Colors.white : AppColors.red,
            ),
            labelStyle: TextStyle(
              color: isSelected ? Colors.white : Colors.black87,
              fontWeight: FontWeight.w600,
            ),
            selectedColor: AppColors.red,
            backgroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
              side: BorderSide(color: Colors.grey.shade200),
            ),
          );
        },
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState();

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.luggage_outlined, size: 64, color: Colors.grey.shade400),
          const SizedBox(height: 12),
          Text(
            'No trips here yet',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: Colors.grey.shade600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            'Tap “New Trip” to start planning.',
            style: TextStyle(color: Colors.grey.shade500),
          ),
        ],
      ),
    );
  }
}
