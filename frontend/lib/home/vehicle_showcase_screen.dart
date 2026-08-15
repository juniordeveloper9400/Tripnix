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
import 'widgets/location_prompt_bar.dart';
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

  /// Seat bands travellers actually shop by: a family hiring a car, a group
  /// filling a traveller, a wedding party taking a full coach. Bounds are
  /// inclusive; `max` of null is open-ended.
  /// The bands tile the whole range with no gap and no overlap. The first
  /// starts at 0, not 1: a record saved without a seat count would otherwise
  /// belong to no band at all and disappear the moment any size was picked.
  /// "Over 40" rather than "40+", since 40 itself sits in the band below.
  static const List<({String label, int min, int? max})> _seatBands = [
    (label: 'Any size', min: 0, max: null),
    (label: 'Up to 12', min: 0, max: 12),
    (label: '13–25', min: 13, max: 25),
    (label: '26–40', min: 26, max: 40),
    (label: 'Over 40', min: 41, max: null),
  ];

  /// Index into [_seatBands]; 0 is "Any size".
  int _seatBand = 0;

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

  List<({String label, int min, int? max})> get _currentSeatBands {
    final cat = _selectedCategory.toLowerCase();
    if (cat == 'bus') {
      return const [
        (label: 'Any size', min: 0, max: null),
        (label: '12 Seats', min: 12, max: 12),
        (label: '22 Seats', min: 22, max: 22),
        (label: '36 Seats', min: 36, max: 36),
        (label: '49 Seats', min: 49, max: 49),
        (label: 'Above 49', min: 50, max: null),
      ];
    } else if (cat == 'traveller') {
      return const [
        (label: 'Any size', min: 0, max: null),
        (label: '12 Seats', min: 12, max: 12),
        (label: '14 Seats', min: 14, max: 14),
        (label: '16 Seats', min: 16, max: 16),
        (label: '18 Seats', min: 18, max: 18),
      ];
    } else if (cat == 'car') {
      return const [
        (label: 'Any size', min: 0, max: null),
        (label: '4 Seats', min: 4, max: 4),
        (label: '7 Seats', min: 7, max: 7),
        (label: '8 Seats', min: 8, max: 8),
      ];
    } else {
      return const [
        (label: 'Any size', min: 0, max: null),
        (label: '4–8 Seats', min: 4, max: 8),
        (label: '12–18 Seats', min: 12, max: 18),
        (label: '22–36 Seats', min: 22, max: 36),
        (label: '49+ Seats', min: 49, max: null),
      ];
    }
  }

  /// Whether a vehicle seats enough people for band [index], defaulting to the
  /// one currently chosen.
  bool _inSeatBand(Vehicle v, [int? index]) {
    final bands = _currentSeatBands;
    final idx = index ?? _seatBand;
    if (idx >= bands.length) return true;
    final band = bands[idx];
    if (v.capacity < band.min) return false;
    return band.max == null || v.capacity <= band.max!;
  }

  /// Category, agency and search — every filter except seats.
  bool _matchesOtherFilters(Vehicle v) {
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
    return matchesCategory && matchesAgency && matchesSearch;
  }

  /// How many vehicles a seat band would leave, with the *other* filters still
  /// applied but its own ignored.
  int _countForSeatBand(int index) => _allVehicles
      .where((v) => _matchesOtherFilters(v) && _inSeatBand(v, index))
      .length;

  /// Everything category, agency, seats and search allow — before the date has
  /// its say.
  ///
  /// Kept separate from [_filteredVehicles] so the screen can still tell the
  /// traveller what the date is hiding. Deliberately left in the order the API
  /// returned: sorting by next-free-date here would push always-available buses
  /// (which report no next date, having posted no calendar) to the bottom of
  /// the visible list for no reason a traveller could see.
  List<Vehicle> get _matchingVehicles => _allVehicles
      .where((v) => _matchesOtherFilters(v) && _inSeatBand(v))
      .toList();

  /// The buses actually shown: only those an agency has posted as free on the
  /// chosen day.
  ///
  /// A bus whose agency posted no dates at all stays visible — [vehicleAvailableOn]
  /// treats "no dates" as always free, so a listing that has simply never had a
  /// calendar set does not silently disappear the moment dates start filtering.
  List<Vehicle> get _filteredVehicles => _matchingVehicles
      .where((v) => vehicleAvailableOn(v, _selectedDate))
      .toList();

  /// The buses the date alone is keeping off the list, soonest to come free
  /// first.
  ///
  /// Filtering by date is right, but doing it silently is what makes an agency
  /// think its newly added bus never published. Counting these lets the screen
  /// say what is hidden and offer the day to see it. Sorting them here — rather
  /// than in [_matchingVehicles], where it would disturb the visible order — is
  /// what makes [_nextFreeDate] the nearest day rather than an arbitrary one.
  List<Vehicle> get _busyOnSelectedDate {
    final busy = _matchingVehicles
        .where((v) => !vehicleAvailableOn(v, _selectedDate))
        .toList();

    busy.sort((a, b) {
      final aNext = nextAvailableDate(a, _selectedDate);
      final bNext = nextAvailableDate(b, _selectedDate);
      // A bus with no upcoming date is booked out for good; it sinks to the
      // bottom because there is no day to send anyone to.
      if (aNext == null && bNext == null) return 0;
      if (aNext == null) return 1;
      if (bNext == null) return -1;
      return aNext.compareTo(bNext);
    });

    return busy;
  }

  /// The soonest day any currently hidden bus is free, for the offer to jump.
  DateTime? get _nextFreeDate {
    for (final vehicle in _busyOnSelectedDate) {
      final next = nextAvailableDate(vehicle, _selectedDate);
      if (next != null) return next;
    }
    return null;
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

  String _dateLabel(DateTime d) =>
      '${_weekdays[d.weekday - 1]}, ${_months[d.month - 1]} ${d.day}';

  String get _selectedDateLabel => _dateLabel(_selectedDate);

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
            // The way in to location sharing, above the fold on the screen the
            // site opens on. Hides itself when there is nobody signed in, once
            // sharing is running, or when a button here could not fix the
            // problem anyway.
            const SliverToBoxAdapter(child: LocationPromptBar()),
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
            // How many people the vehicle has to seat. Each band shows how many
            // vehicles it would leave, so a traveller can see a band is empty
            // before tapping it and landing on "no vehicles found".
            SliverToBoxAdapter(
              child: Container(
                padding: const EdgeInsets.fromLTRB(12, 0, 12, 6),
                child: SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: List.generate(_currentSeatBands.length, (i) {
                      final band = _currentSeatBands[i];
                      final isSelected = i == _seatBand;
                      final count = _countForSeatBand(i);
                      final empty = count == 0 && i != 0;

                      return Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 4),
                        child: ChoiceChip(
                          label: Text(
                            i == 0 ? band.label : '${band.label}  ·  $count',
                          ),
                          selected: isSelected,
                          // A band with nothing in it is still tappable, but
                          // dimmed — hiding it would make the row jump about as
                          // the other filters change.
                          onSelected: (_) => setState(() => _seatBand = i),
                          showCheckmark: false,
                          avatar: Icon(
                            Icons.event_seat,
                            size: 15,
                            color: isSelected
                                ? Colors.white
                                : empty
                                ? Colors.grey.shade400
                                : AppColors.red,
                          ),
                          labelStyle: TextStyle(
                            color: isSelected
                                ? Colors.white
                                : empty
                                ? Colors.grey.shade500
                                : AppColors.black,
                            fontWeight: FontWeight.bold,
                            fontSize: 12.5,
                          ),
                          selectedColor: AppColors.red,
                          backgroundColor: Colors.white,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(14),
                            side: BorderSide(color: Colors.grey.shade200),
                          ),
                        ),
                      );
                    }),
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
                        // Every bus listed is free on the chosen day now that
                        // the date filters, so one figure says it all.
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
            // What the date is hiding. Filtering by day is the point, but doing
            // it silently is what makes an agency think its bus never
            // published — this names the count and offers the day to see them.
            if (!_isLoading && _errorMessage == null && _busyOnSelectedDate.isNotEmpty)
              SliverToBoxAdapter(
                child: _HiddenByDateBar(
                  count: _busyOnSelectedDate.length,
                  selectedDateLabel: _selectedDateLabel,
                  nextFreeDate: _nextFreeDate,
                  nextFreeLabel: _nextFreeDate == null
                      ? null
                      : _dateLabel(_nextFreeDate!),
                  onJump: (date) => setState(() => _selectedDate = date),
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
                child: _EmptyState(
                  noVehiclesAtAll: _allVehicles.isEmpty,
                  // When the other filters do match buses and the list is still
                  // empty, the date is the only thing that can have emptied it,
                  // and saying so is the difference between "nothing matches"
                  // and "nothing on this day".
                  busyCount: _busyOnSelectedDate.length,
                  selectedDateLabel: _selectedDateLabel,
                  nextFreeDate: _nextFreeDate,
                  nextFreeLabel: _nextFreeDate == null
                      ? null
                      : _dateLabel(_nextFreeDate!),
                  onJumpToNextFree: (date) =>
                      setState(() => _selectedDate = date),
                  seatBandLabel: (_seatBand == 0 || _seatBand >= _currentSeatBands.length)
                      ? null
                      : _currentSeatBands[_seatBand].label,
                  onClearSeats: () => setState(() => _seatBand = 0),
                ),
              )
            else
              SliverPadding(
                padding: const EdgeInsets.only(bottom: 40),
                sliver: SliverList(
                  delegate: SliverChildBuilderDelegate((context, index) {
                    // No availability arguments: the list is already only the
                    // buses free on the chosen day, so the card's busy state
                    // cannot arise here.
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

/// Tells the traveller how many buses the chosen day is hiding, and offers the
/// first day they can be seen.
///
/// Shown above a list that does have results, so it never blocks the buses that
/// are free — it just stops the ones that are not from vanishing without
/// explanation.
class _HiddenByDateBar extends StatelessWidget {
  const _HiddenByDateBar({
    required this.count,
    required this.selectedDateLabel,
    required this.nextFreeDate,
    required this.nextFreeLabel,
    required this.onJump,
  });

  final int count;
  final String selectedDateLabel;

  /// Null when every hidden bus is booked out for good — there is then no day
  /// to offer, and the bar says only what is hidden.
  final DateTime? nextFreeDate;
  final String? nextFreeLabel;

  final void Function(DateTime date) onJump;

  @override
  Widget build(BuildContext context) {
    final date = nextFreeDate;
    final label = nextFreeLabel;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 10),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 11),
        decoration: BoxDecoration(
          color: AppColors.pillBg,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Icon(Icons.event_busy_outlined, size: 18, color: Colors.grey[700]),
            const SizedBox(width: 10),
            Expanded(
              child: Text(
                count == 1
                    ? '1 more bus is not free on $selectedDateLabel'
                    : '$count more buses are not free on $selectedDateLabel',
                style: TextStyle(
                  fontSize: 12.5,
                  height: 1.35,
                  color: Colors.grey[800],
                ),
              ),
            ),
            if (date != null && label != null) ...[
              const SizedBox(width: 8),
              TextButton(
                onPressed: () => onJump(date),
                style: TextButton.styleFrom(
                  foregroundColor: AppColors.red,
                  padding: const EdgeInsets.symmetric(horizontal: 8),
                  minimumSize: const Size(0, 32),
                  tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                ),
                child: Text(
                  'See $label',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12.5,
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.noVehiclesAtAll,
    this.busyCount = 0,
    this.selectedDateLabel,
    this.nextFreeDate,
    this.nextFreeLabel,
    this.onJumpToNextFree,
    this.seatBandLabel,
    this.onClearSeats,
  });

  /// True when no agency has listed anything yet, as opposed to the current
  /// filters simply excluding everything — the two need different advice.
  final bool noVehiclesAtAll;

  /// How many buses the other filters matched but the chosen day excluded.
  /// Above zero means the date emptied this list, not the category or search.
  final int busyCount;
  final String? selectedDateLabel;
  final DateTime? nextFreeDate;
  final String? nextFreeLabel;
  final void Function(DateTime date)? onJumpToNextFree;

  /// The seat band in force, when one is. Named in the message and offered as
  /// the thing to undo, because a size filter is the easiest of the filters to
  /// set and then forget about.
  final String? seatBandLabel;
  final VoidCallback? onClearSeats;

  /// The date is to blame only when buses did match everything else.
  bool get _dateIsTheCause => !noVehiclesAtAll && busyCount > 0;

  @override
  Widget build(BuildContext context) {
    final jumpDate = nextFreeDate;
    final jumpLabel = nextFreeLabel;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              noVehiclesAtAll
                  ? Icons.storefront_outlined
                  : _dateIsTheCause
                  ? Icons.event_busy_outlined
                  : Icons.commute_outlined,
              size: 70,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 12),
            Text(
              noVehiclesAtAll
                  ? 'No Vehicles Listed Yet'
                  : _dateIsTheCause
                  ? 'Nothing free on ${selectedDateLabel ?? 'this day'}'
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
                  : _dateIsTheCause
                  ? (busyCount == 1
                        ? '1 bus matches, but its agency has not posted this day '
                              'as available. Try another date.'
                        : '$busyCount buses match, but their agencies have not '
                              'posted this day as available. Try another date.')
                  : seatBandLabel != null
                  ? 'Nothing seats "$seatBandLabel" with your other filters. '
                        'Try another size, or widen the category and search.'
                  : 'Try adjusting your category tabs or search keywords.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.grey[600]),
            ),
            if (_dateIsTheCause &&
                jumpDate != null &&
                jumpLabel != null &&
                onJumpToNextFree != null) ...[
              const SizedBox(height: 14),
              FilledButton.icon(
                onPressed: () => onJumpToNextFree!(jumpDate),
                icon: const Icon(Icons.event_available, size: 16),
                label: Text('Show $jumpLabel'),
                style: FilledButton.styleFrom(
                  backgroundColor: AppColors.red,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
            if (seatBandLabel != null && onClearSeats != null) ...[
              const SizedBox(height: 14),
              OutlinedButton.icon(
                onPressed: onClearSeats,
                icon: const Icon(Icons.event_seat, size: 16),
                label: const Text('Show any size'),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.red,
                  side: const BorderSide(color: AppColors.red),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
              ),
            ],
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
