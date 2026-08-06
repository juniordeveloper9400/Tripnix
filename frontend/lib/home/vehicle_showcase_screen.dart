import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../models/vehicle.dart';
import '../models/agency_trip.dart';
import '../services/api_service.dart';
import 'widgets/vehicle_card.dart';
import 'widgets/trips_bar.dart';
import 'widgets/date_selector.dart';
import 'widgets/agency_selector.dart';
import 'widgets/banner_carousel.dart';
import '../theme/app_colors.dart';
import '../bookings/my_bookings_screen.dart';
import '../profile/profile_screen.dart';

class VehicleShowcaseScreen extends StatefulWidget {
  const VehicleShowcaseScreen({super.key});

  @override
  State<VehicleShowcaseScreen> createState() => _VehicleShowcaseScreenState();
}

class _VehicleShowcaseScreenState extends State<VehicleShowcaseScreen> {
  int _currentTab = 0;

  // List of screens for bottom navigation
  final List<Widget> _tabs = [
    const _ExploreTab(),
    const MyBookingsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: IndexedStack(index: _currentTab, children: _tabs),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentTab,
        onTap: (index) {
          setState(() => _currentTab = index);
        },
        backgroundColor: Colors.white,
        selectedItemColor: AppColors.red,
        unselectedItemColor: Colors.grey[600],
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 12,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.w500,
          fontSize: 11,
        ),
        type: BottomNavigationBarType.fixed,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.explore_outlined),
            activeIcon: Icon(Icons.explore),
            label: 'Explore',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.bookmark_border_outlined),
            activeIcon: Icon(Icons.bookmark),
            label: 'Bookings',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.person_outline),
            activeIcon: Icon(Icons.person),
            label: 'Profile',
          ),
        ],
      ),
    );
  }
}

// Separate component for Explore / Showcase list
class _ExploreTab extends StatefulWidget {
  const _ExploreTab();

  @override
  State<_ExploreTab> createState() => _ExploreTabState();
}

class _ExploreTabState extends State<_ExploreTab> {
  List<Vehicle> _allVehicles = [];
  bool _isLoading = true;
  String _selectedCategory = 'All';
  String _selectedAgency = kAllAgencies;
  String _searchQuery = '';
  String? _errorMessage;
  DateTime _selectedDate = DateTime.now();

  final List<String> _categories = ['All', 'Bus', 'Traveller', 'Car'];

  List<AgencyTrip> _trips = [];
  bool _tripsLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchVehicles();
    _fetchTrips();
  }

  /// Trips posted by agencies — these fill the bar at the top of the feed.
  Future<void> _fetchTrips() async {
    setState(() => _tripsLoading = true);
    try {
      final list = await ApiService.instance.fetchTrips();
      if (!mounted) return;
      setState(() {
        _trips = list;
        _tripsLoading = false;
      });
    } catch (_) {
      if (!mounted) return;
      // The showcase still works without the trip bar.
      setState(() => _tripsLoading = false);
    }
  }

  Future<void> _fetchVehicles() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final list = await ApiService.instance.fetchVehicles();
      setState(() {
        _allVehicles = list;
        // The selected agency may no longer exist after a refresh.
        if (_selectedAgency != kAllAgencies &&
            !list.any((v) => v.operatorName == _selectedAgency)) {
          _selectedAgency = kAllAgencies;
        }
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = e.toString();
      });
    }
  }

  /// Distinct travel agencies that currently have vehicles, alphabetically.
  List<String> get _agencies {
    final names = _allVehicles
        .map((v) => v.operatorName)
        .where((n) => n.trim().isNotEmpty)
        .toSet()
        .toList();
    names.sort((a, b) => a.toLowerCase().compareTo(b.toLowerCase()));
    return names;
  }

  List<Vehicle> get _filteredVehicles {
    return _allVehicles.where((v) {
      final matchesCategory =
          _selectedCategory == 'All' ||
          v.type.toLowerCase() == _selectedCategory.toLowerCase();
      final matchesAgency =
          _selectedAgency == kAllAgencies || v.operatorName == _selectedAgency;
      final q = _searchQuery.trim().toLowerCase();
      final matchesSearch =
          q.isEmpty ||
          v.name.toLowerCase().contains(q) ||
          v.operatorName.toLowerCase().contains(q) ||
          v.description.toLowerCase().contains(q);
      final matchesDate = vehicleAvailableOn(v, _selectedDate);
      return matchesCategory && matchesAgency && matchesSearch && matchesDate;
    }).toList();
  }

  static const List<String> _months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  static const List<String> _weekdays = [
    'Mon',
    'Tue',
    'Wed',
    'Thu',
    'Fri',
    'Sat',
    'Sun',
  ];

  String get _selectedDateLabel {
    final d = _selectedDate;
    return '${_weekdays[d.weekday - 1]}, ${_months[d.month - 1]} ${d.day}';
  }

  @override
  Widget build(BuildContext context) {
    final list = _filteredVehicles;

    return Scaffold(
      body: RefreshIndicator(
        onRefresh: () async {
          await Future.wait([_fetchVehicles(), _fetchTrips()]);
        },
        color: AppColors.red,
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            // Trips posted by agencies against their buses, at the very top
            SliverSafeArea(
              bottom: false,
              sliver: SliverToBoxAdapter(
                child: TripsBar(
                  trips: _trips,
                  isLoading: _tripsLoading,
                  onTripAdded: _fetchTrips,
                ),
              ),
            ),
            // Gorgeous Header with Search Box
            SliverAppBar(
              pinned: false,
              floating: false,
              // Taller hero — and taller again on wide/desktop viewports.
              expandedHeight: MediaQuery.of(context).size.width >= 900
                  ? 480
                  : MediaQuery.of(context).size.width >= 600
                  ? 380
                  : 320,
              automaticallyImplyLeading: false,
              backgroundColor: AppColors.black,
              flexibleSpace: FlexibleSpaceBar(
                background: BannerCarousel(
                  slides: [
                    BannerSlide(
                      networkUrl: '${AppConfig.publicBase}/bushero.png',
                      assetPath: 'assets/images/bushero.png',
                    ),
                  ],
                ),
              ),
            ),
            // Search Bar below Banner Image
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 16, 20, 6),
                child: Material(
                  elevation: 2,
                  shadowColor: Colors.black12,
                  borderRadius: BorderRadius.circular(16),
                  child: TextField(
                    onChanged: (v) => setState(() => _searchQuery = v),
                    decoration: InputDecoration(
                      hintText: 'Search by model, operator or feature...',
                      prefixIcon: const Icon(
                        Icons.search,
                        color: AppColors.red,
                      ),
                      filled: true,
                      fillColor: Colors.white,
                      contentPadding: const EdgeInsets.symmetric(vertical: 0),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      enabledBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: BorderSide(color: Colors.grey.shade200),
                      ),
                      focusedBorder: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(16),
                        borderSide: const BorderSide(
                          color: AppColors.red,
                          width: 1.5,
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ),
            // Date picker — choose a travel date to see buses available then
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
                child: Row(
                  children: [
                    const Icon(
                      Icons.event_available,
                      size: 18,
                      color: AppColors.red,
                    ),
                    const SizedBox(width: 8),
                    Text(
                      'Travelling on  $_selectedDateLabel',
                      style: const TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w800,
                        color: AppColors.black,
                      ),
                    ),
                  ],
                ),
              ),
            ),
            SliverToBoxAdapter(
              child: DateSelector(
                selectedDate: _selectedDate,
                onChanged: (date) => setState(() => _selectedDate = date),
              ),
            ),
            // Agency picker — browse the fleet of a single travel agency
            if (!_isLoading &&
                _errorMessage == null &&
                _agencies.isNotEmpty) ...[
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 18, 20, 10),
                  child: Row(
                    children: [
                      const Icon(
                        Icons.storefront,
                        size: 18,
                        color: AppColors.red,
                      ),
                      const SizedBox(width: 8),
                      const Text(
                        'Choose Travel Agency',
                        style: TextStyle(
                          fontSize: 14,
                          fontWeight: FontWeight.w800,
                          color: AppColors.black,
                        ),
                      ),
                      const Spacer(),
                      if (_selectedAgency != kAllAgencies)
                        GestureDetector(
                          onTap: () =>
                              setState(() => _selectedAgency = kAllAgencies),
                          child: const Text(
                            'Clear',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.w700,
                              color: AppColors.red,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
              SliverToBoxAdapter(
                child: AgencySelector(
                  agencies: _agencies,
                  selectedAgency: _selectedAgency,
                  onChanged: (agency) =>
                      setState(() => _selectedAgency = agency),
                ),
              ),
            ],
            // Category Chips Bar (Cars on Left, All Vehicles in Center, Buses on Right)
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.symmetric(
                  vertical: 10,
                  horizontal: 12,
                ),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: _categories.map((cat) {
                      final isSelected = cat == _selectedCategory;

                      IconData iconData = Icons.all_inclusive;
                      String labelText = 'All Vehicles';
                      if (cat == 'Car') {
                        iconData = Icons.directions_car;
                        labelText = 'Cars';
                      } else if (cat == 'Traveller') {
                        iconData = Icons.airport_shuttle;
                        labelText = 'Travellers';
                      } else if (cat == 'Bus') {
                        iconData = Icons.directions_bus;
                        labelText = 'Buses';
                      }

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(labelText),
                          selected: isSelected,
                          onSelected: (_) =>
                              setState(() => _selectedCategory = cat),
                          showCheckmark: false,
                          avatar: Icon(
                            iconData,
                            size: 16,
                            color: isSelected ? Colors.white : AppColors.red,
                          ),
                          labelStyle: TextStyle(
                            color: isSelected ? Colors.white : AppColors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                          ),
                          selectedColor: AppColors.red,
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ),
            ),
            // Subtitle
            SliverToBoxAdapter(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(20, 12, 20, 8),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.baseline,
                  textBaseline: TextBaseline.alphabetic,
                  children: [
                    Text(
                      _selectedAgency == kAllAgencies
                          ? 'Available Fleet'
                          : _selectedAgency,
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.w800,
                        color: AppColors.black,
                      ),
                    ),
                    const SizedBox(width: 8),
                    if (!_isLoading && _errorMessage == null)
                      Text(
                        '${list.length} on $_selectedDateLabel',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w600,
                          color: Colors.grey[600],
                        ),
                      ),
                  ],
                ),
              ),
            ),
            // List of vehicles
            if (_isLoading)
              const SliverFillRemaining(
                child: Center(child: CircularProgressIndicator()),
              )
            else if (_errorMessage != null)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _ErrorState(
                  error: _errorMessage!,
                  onRetry: _fetchVehicles,
                ),
              )
            else if (list.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: _EmptyState(noVehiclesAtAll: _allVehicles.isEmpty),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.only(bottom: 40),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    return VehicleCard(vehicle: list[index]);
                  }, childCount: list.length),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.noVehiclesAtAll});

  /// True when no agency has listed anything yet, as opposed to the current
  /// filters simply excluding everything — the two need different advice.
  final bool noVehiclesAtAll;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              noVehiclesAtAll ? Icons.storefront_outlined : Icons.commute_outlined,
              size: 70,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              noVehiclesAtAll
                  ? 'No Vehicles Listed Yet'
                  : 'No Vehicles Matching Filter',
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.black,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
            Text(
              noVehiclesAtAll
                  ? 'Buses and cars appear here as soon as a travel agency adds them.'
                  : 'Try adjusting your category tabs or search keywords.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorState extends StatelessWidget {
  const _ErrorState({required this.error, required this.onRetry});

  final String error;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 70, color: AppColors.red),
            const SizedBox(height: 12),
            const Text(
              'Failed to Connect to Server',
              style: TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.black,
              ),
            ),
            const SizedBox(height: 6),
            Text(
              'Could not load vehicles. Make sure the Node.js API server is running on http://localhost:3000.\n\nError: $error',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: Colors.grey[600],
                fontSize: 13,
                height: 1.4,
              ),
            ),
            const SizedBox(height: 20),
            ElevatedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Reload Showcase'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.black,
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 20,
                  vertical: 12,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
