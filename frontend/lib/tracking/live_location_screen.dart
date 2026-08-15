import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../agency/agency_session.dart';
import '../models/vehicle.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../theme/app_colors.dart';

/// Share this device's position as one of the agency's buses, and watch the
/// whole fleet come back.
///
/// This is the missing half of tracking: the admin and owner portals have drawn
/// a map for a while, but nothing ever reported a position to put on it, so
/// they only ever showed the sample preview. A driver runs this screen on the
/// bus and the fleet becomes real.
class LiveLocationScreen extends StatefulWidget {
  const LiveLocationScreen({super.key});

  @override
  State<LiveLocationScreen> createState() => _LiveLocationScreenState();
}

class _LiveLocationScreenState extends State<LiveLocationScreen>
    with WidgetsBindingObserver {
  /// The bus this phone is riding on, remembered so a driver picks it once
  /// rather than every morning.
  static const _vehicleKey = 'tripnix_tracking_vehicle_id';

  /// A bus counts as live for 15 minutes after its last fix, so a parked one
  /// has to speak up well inside that or it drops off the portals' map while
  /// sitting in plain sight at the depot.
  static const _heartbeat = Duration(minutes: 2);

  /// The floor between two reports. Without it a bus in traffic would post on
  /// every twitch of the GPS, which costs the driver data and tells the office
  /// nothing new.
  static const _minimumGap = Duration(seconds: 20);

  /// How often the fleet below is re-read while this screen is open.
  static const _fleetRefresh = Duration(seconds: 20);

  final _api = ApiService.instance;
  final _location = LocationService.instance;

  List<Vehicle> _vehicles = [];
  int? _vehicleId;
  bool _loadingVehicles = true;
  String? _loadError;

  bool _sharing = false;
  LocationBlock _block = LocationBlock.none;

  StreamSubscription<Position>? _positions;
  Timer? _heartbeatTimer;
  Timer? _fleetTimer;

  Position? _lastPosition;
  DateTime? _lastSentAt;
  String _placeName = '';
  String? _shareError;
  bool _sending = false;
  bool _asking = false;

  Map<String, dynamic>? _tracking;

  String get _operatorName => AgencySession.instance.operatorName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopSharing(silent: true);
    _fleetTimer?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;

    // Coming back from the settings app is the one moment permission can have
    // changed without this screen hearing about it, and it is exactly when the
    // user expects the page to notice.
    _refreshBlock();

    // Dart timers do not run while the app is suspended, so the heartbeat may
    // have missed its turn — on iOS it certainly has. Reporting on resume means
    // the worst case is a gap while the phone was asleep, not a bus that stayed
    // stale after the driver picked the phone back up.
    final last = _lastPosition;
    if (_sharing && last != null) _send(last, heartbeat: true);

    _loadFleet();
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadVehicles(), _refreshBlock()]);
    await _loadFleet();
    _fleetTimer = Timer.periodic(_fleetRefresh, (_) => _loadFleet());
  }

  Future<void> _refreshBlock() async {
    final block = await _location.currentBlock();
    if (!mounted) return;
    setState(() => _block = block);

    // Location switched off underneath a running share means the fixes have
    // already stopped; saying so beats a toggle that claims to be on.
    if (_sharing && block != LocationBlock.none) {
      _stopSharing();
      setState(() => _shareError = LocationService.messageFor(block));
    }
  }

  Future<void> _loadVehicles() async {
    try {
      final vehicles = await _api.fetchMyListedVehicles(_operatorName);

      // Storage being unavailable should cost the driver a remembered choice,
      // not the screen — so it is read separately from the fleet it annotates.
      int? remembered;
      try {
        remembered = (await SharedPreferences.getInstance()).getInt(_vehicleKey);
      } catch (_) {}

      if (!mounted) return;
      setState(() {
        _vehicles = vehicles;
        _vehicleId = vehicles.any((v) => v.id == remembered)
            ? remembered
            : (vehicles.isEmpty ? null : vehicles.first.id);
        _loadingVehicles = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = _clean(e);
        _loadingVehicles = false;
      });
    }
  }

  Future<void> _rememberVehicle(int id) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_vehicleKey, id);
    } catch (_) {}
  }

  Future<void> _loadFleet() async {
    if (_operatorName.isEmpty) return;
    try {
      final tracking = await _api.fetchTracking(_operatorName);
      if (!mounted) return;
      setState(() => _tracking = tracking);
    } catch (_) {
      // The fleet list is a bonus on this screen; a failed refresh keeps the
      // last one rather than replacing it with an error the driver cannot act
      // on while driving.
    }
  }

  // ─── Sharing ─────────────────────────────────────────────

  /// Raises the browser's or the OS's permission prompt on its own.
  ///
  /// Separate from [_startSharing] because granting location and starting to
  /// broadcast are different decisions, and only the first one has to be
  /// possible before a bus has been picked. Nothing is reported here — the
  /// answer only unlocks the share button.
  Future<void> _askForLocation() async {
    setState(() {
      _asking = true;
      _shareError = null;
    });

    final block = await _location.ensurePermission();
    if (!mounted) return;

    setState(() {
      _block = block;
      _asking = false;
    });
  }

  Future<void> _startSharing() async {
    if (_vehicleId == null) return;

    setState(() {
      _shareError = null;
      _sending = true;
    });

    final block = await _location.ensurePermission();
    if (!mounted) return;

    if (block != LocationBlock.none) {
      setState(() {
        _block = block;
        _sending = false;
        _shareError = LocationService.messageFor(block);
      });
      return;
    }

    setState(() {
      _block = LocationBlock.none;
      _sharing = true;
    });

    try {
      // Sent before the stream is wired up so the office sees the bus straight
      // away — the stream's distance filter means a stationary bus would
      // otherwise emit nothing at all.
      final first = await _location.currentPosition();
      await _send(first);
    } catch (e) {
      if (!mounted) return;
      setState(() => _shareError = _clean(e));
    }

    if (!mounted) return;
    setState(() => _sending = false);

    // Getting the first fix takes a few seconds, and the button says "Stop
    // sharing" throughout. Someone who presses it in that window must not end
    // up with a stream that starts anyway and reports from their pocket.
    if (!_sharing) return;

    _positions = _location.positionStream().listen(
      _send,
      onError: (Object e) {
        if (!mounted) return;
        setState(() => _shareError = _clean(e));
      },
    );

    // The filtered stream goes silent when the bus is parked, which the portals
    // cannot tell apart from a phone that has been switched off. This keeps the
    // last known position current so a parked bus reads as parked, not missing.
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) {
      final last = _lastPosition;
      if (last != null) _send(last, heartbeat: true);
    });
  }

  void _stopSharing({bool silent = false}) {
    _positions?.cancel();
    _positions = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
    if (silent || !mounted) return;
    setState(() => _sharing = false);
  }

  /// Posts a fix, unless one went recently enough that this one would say the
  /// same thing.
  Future<void> _send(Position position, {bool heartbeat = false}) async {
    _lastPosition = position;

    final sentAt = _lastSentAt;
    if (!heartbeat && sentAt != null && DateTime.now().difference(sentAt) < _minimumGap) {
      return;
    }

    final vehicleId = _vehicleId;
    if (vehicleId == null) return;

    try {
      final fix = await _api.reportVehicleLocation(
        vehicleId: vehicleId,
        lat: position.latitude,
        lng: position.longitude,
        speedKph: speedKphOf(position),
        heading: headingOf(position),
      );

      if (!mounted) return;
      setState(() {
        _lastSentAt = DateTime.now();
        // The API names the place from the coordinates; showing its answer
        // rather than the numbers means the driver and the office are looking
        // at the same words for where the bus is.
        _placeName = (fix['place'] as String?)?.trim().isNotEmpty == true
            ? fix['place'] as String
            : (fix['placeName'] as String? ?? '');
        _shareError = null;
      });
      // The bus that just moved is the interesting row in the list below it.
      await _loadFleet();
    } catch (e) {
      if (!mounted) return;
      setState(() => _shareError = _clean(e));
    }
  }

  String _clean(Object error) =>
      error.toString().replaceFirst('Exception: ', '').trim();

  // ─── UI ──────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF7F7F9),
      appBar: AppBar(
        title: const Text('Live Location',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.black,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _refreshBlock();
          await _loadFleet();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _shareCard(),
            const SizedBox(height: 20),
            const Text(
              'YOUR FLEET',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 10),
            _fleetList(),
          ],
        ),
      ),
    );
  }

  Widget _shareCard() {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 42,
                height: 42,
                decoration: BoxDecoration(
                  color: (_sharing ? Colors.green : AppColors.red)
                      .withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  _sharing ? Icons.my_location : Icons.location_disabled,
                  color: _sharing ? Colors.green.shade700 : AppColors.red,
                  size: 21,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _sharing ? 'Sharing this bus’s location' : 'Not sharing',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _sharing
                          ? 'Your office and owner can see this bus on their map.'
                          : 'Turn this on while you are driving.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),
          _vehiclePicker(),
          if (_block != LocationBlock.none) ...[
            const SizedBox(height: 14),
            _permissionNotice(),
          ],
          if (_shareError != null) ...[
            const SizedBox(height: 14),
            _notice(
              icon: Icons.error_outline,
              colour: AppColors.red,
              message: _shareError!,
            ),
          ],
          if (_sharing) ...[
            const SizedBox(height: 14),
            _currentFix(),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: _sharing
                ? OutlinedButton.icon(
                    onPressed: _stopSharing,
                    icon: const Icon(Icons.stop_circle_outlined, size: 20),
                    label: const Text('Stop sharing',
                        style: TextStyle(fontWeight: FontWeight.bold)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: AppColors.red,
                      side: const BorderSide(color: AppColors.red),
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                  )
                : ElevatedButton.icon(
                    onPressed:
                        _vehicleId == null || _sending ? null : _startSharing,
                    icon: _sending
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.near_me, size: 19),
                    label: Text(
                      _sending ? 'Getting your position…' : 'Share live location',
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.red,
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(14)),
                    ),
                  ),
          ),
        ],
      ),
    );
  }

  Widget _vehiclePicker() {
    if (_loadingVehicles) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 8),
        child: LinearProgressIndicator(minHeight: 3),
      );
    }

    if (_loadError != null) {
      return _notice(
        icon: Icons.cloud_off,
        colour: AppColors.red,
        message: _loadError!,
      );
    }

    if (_vehicles.isEmpty) {
      return _notice(
        icon: Icons.directions_bus_outlined,
        colour: Colors.orange.shade800,
        message: 'No listed buses on this account yet. Add and subscribe a bus '
            'in the owner portal, then it can be tracked here.',
      );
    }

    return InputDecorator(
      decoration: InputDecoration(
        labelText: 'Which bus is this phone on?',
        labelStyle: const TextStyle(fontSize: 13),
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<int>(
          isExpanded: true,
          value: _vehicleId,
          items: _vehicles
              .map((v) => DropdownMenuItem(
                    value: v.id,
                    child: Text(
                      v.vehicleNumber.isEmpty
                          ? v.name
                          : '${v.name} · ${v.vehicleNumber}',
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ))
              .toList(),
          // Changing bus mid-share would start reporting this position as a
          // different vehicle, putting a bus somewhere it is not.
          onChanged: _sharing
              ? null
              : (id) {
                  if (id == null) return;
                  setState(() => _vehicleId = id);
                  _rememberVehicle(id);
                },
        ),
      ),
    );
  }

  Widget _permissionNotice() {
    // A plain refusal can still be asked about, and this button is the only
    // thing on the screen that can raise the prompt — sharing is gated behind
    // picking a bus, so an agency with no listed buses yet could otherwise
    // never grant location at all.
    final canAsk = _block == LocationBlock.denied;

    // Only worth offering where it goes somewhere: on the web there is no app
    // settings page and the underlying call is unsupported.
    final needsSettings =
        _block == LocationBlock.deniedForever && _location.canOpenSettings;
    final needsService =
        _block == LocationBlock.serviceDisabled && _location.canOpenSettings;

    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: AppColors.pillBg,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Icon(Icons.location_off_outlined,
                  size: 18, color: AppColors.red),
              const SizedBox(width: 9),
              Expanded(
                child: Text(
                  LocationService.messageFor(_block),
                  style: const TextStyle(fontSize: 12.5, height: 1.45),
                ),
              ),
            ],
          ),
          if (canAsk) ...[
            const SizedBox(height: 11),
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton.icon(
                onPressed: _asking ? null : _askForLocation,
                icon: _asking
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.location_on_outlined, size: 19),
                label: Text(
                  _asking ? 'Waiting for your answer…' : 'Allow location access',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.red,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12)),
                ),
              ),
            ),
          ],
          if (needsSettings || needsService) ...[
            const SizedBox(height: 9),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: () async {
                  if (needsService) {
                    await _location.openLocationSettings();
                  } else {
                    await _location.openSettings();
                  }
                },
                icon: const Icon(Icons.settings, size: 17),
                label: Text(
                  needsService ? 'Open location settings' : 'Open app settings',
                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                ),
                style: TextButton.styleFrom(foregroundColor: AppColors.red),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _currentFix() {
    final sentAt = _lastSentAt;
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: Colors.green.withValues(alpha: 0.07),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.green.withValues(alpha: 0.25)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(Icons.place, size: 19, color: Colors.green.shade700),
          const SizedBox(width: 9),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _placeName.isEmpty ? 'Finding the place name…' : _placeName,
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Text(
                  sentAt == null
                      ? 'Waiting for the first position…'
                      : 'Last sent ${_ago(sentAt)}',
                  style: TextStyle(fontSize: 11.5, color: Colors.grey[700]),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _fleetList() {
    final vehicles = (_tracking?['vehicles'] as List<dynamic>?) ?? const [];

    if (_tracking == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
      );
    }

    if (vehicles.isEmpty) {
      return _notice(
        icon: Icons.directions_bus_outlined,
        colour: Colors.grey.shade700,
        message: 'No buses in this fleet yet.',
      );
    }

    return Column(
      children: vehicles
          .cast<Map<String, dynamic>>()
          .map((v) => _fleetRow(v))
          .toList(),
    );
  }

  Widget _fleetRow(Map<String, dynamic> v) {
    final location = v['location'] as Map<String, dynamic>?;
    final live = location?['live'] == true;
    final place = (location?['place'] as String?)?.trim() ?? '';
    final ageMinutes = (location?['ageMinutes'] as num?)?.round() ?? 0;

    final (Color colour, String badge) = location == null
        ? (Colors.grey, 'NO SIGNAL')
        : live
            ? (Colors.green, 'LIVE')
            : (Colors.orange.shade800, '$ageMinutes MIN AGO');

    final where = location == null
        ? 'This bus has never reported a position'
        : place.isEmpty
            // Only when the geocoder could not name the spot — an honest gap
            // rather than falling back to a pair of numbers nobody can read.
            ? 'Position received, place name not available'
            : place;

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        children: [
          Container(
            width: 9,
            height: 9,
            decoration: BoxDecoration(color: colour, shape: BoxShape.circle),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  v['vehicleName'] as String? ?? 'Bus',
                  style: const TextStyle(
                      fontWeight: FontWeight.bold, fontSize: 13.5),
                ),
                const SizedBox(height: 2),
                Text(
                  where,
                  style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: colour.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Text(
              badge,
              style: TextStyle(
                fontSize: 9,
                fontWeight: FontWeight.w900,
                letterSpacing: 0.4,
                color: colour,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _notice({
    required IconData icon,
    required Color colour,
    required String message,
  }) {
    return Container(
      padding: const EdgeInsets.all(13),
      decoration: BoxDecoration(
        color: colour.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 18, color: colour),
          const SizedBox(width: 9),
          Expanded(
            child: Text(message,
                style: const TextStyle(fontSize: 12.5, height: 1.45)),
          ),
        ],
      ),
    );
  }

  String _ago(DateTime at) {
    final seconds = DateTime.now().difference(at).inSeconds;
    if (seconds < 60) return 'just now';
    final minutes = seconds ~/ 60;
    return minutes == 1 ? '1 minute ago' : '$minutes minutes ago';
  }
}
