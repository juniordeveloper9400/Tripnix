import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../agency/agency_session.dart';
import 'api_service.dart';
import 'location_service.dart';

/// Owns location sharing for the whole app, for as long as the app is running.
///
/// This deliberately does not live inside the screen that shows it. Sharing used
/// to be held in the Location screen's state, so its `dispose` tore the stream
/// down the moment anyone navigated away — someone would switch sharing on, go
/// back to look at a bus, and silently stop reporting without a single thing on
/// screen changing. Anything that outlives one route has to be owned above it.
///
/// A [ChangeNotifier] so the banner on the home screen and the Location screen
/// are two views of one truth rather than two copies that can disagree.
class LocationSharing extends ChangeNotifier with WidgetsBindingObserver {
  LocationSharing._();
  static final LocationSharing instance = LocationSharing._();

  /// Somebody counts as live for 15 minutes after their last fix, so a person
  /// standing still has to speak up well inside that or they drop off the
  /// portals' map while sitting in plain sight at the depot.
  static const _heartbeat = Duration(minutes: 2);

  /// The floor between two reports. Without it a phone in a moving vehicle
  /// would post on every twitch of the GPS, which costs data and tells the
  /// office nothing new.
  static const _minimumGap = Duration(seconds: 20);

  final _api = ApiService.instance;
  final _location = LocationService.instance;
  final _session = AgencySession.instance;

  StreamSubscription<Position>? _positions;
  Timer? _heartbeatTimer;
  bool _observing = false;

  /// The bus this phone is riding on, remembered so a driver picks it once
  /// rather than every morning.
  static const _vehicleKey = 'tripnix_tracking_vehicle_id';

  bool _sharing = false;
  bool _starting = false;
  bool _asking = false;
  LocationBlock _block = LocationBlock.none;
  Position? _lastPosition;
  DateTime? _lastSentAt;
  String _placeName = '';
  String? _error;

  int? _vehicleId;
  String _vehicleLabel = '';

  bool get sharing => _sharing;
  bool get starting => _starting;
  bool get asking => _asking;
  LocationBlock get block => _block;
  DateTime? get lastSentAt => _lastSentAt;
  String get placeName => _placeName;
  String? get error => _error;

  /// Which bus this phone is reporting as, and how it reads on screen.
  int? get vehicleId => _vehicleId;
  String get vehicleLabel => _vehicleLabel;

  /// True when there is a signed-in account and a bus chosen to report as.
  ///
  /// Both are needed: the position belongs to the bus, which is what an office
  /// dispatches, but it is worth nothing if nobody knows which bus it is.
  bool get canShare =>
      _session.operatorName.isNotEmpty && _vehicleId != null;

  /// True when the account is fine and only the bus is missing, so a screen can
  /// tell someone to pick one rather than just disabling a button at them.
  bool get needsVehicle =>
      _session.operatorName.isNotEmpty && _vehicleId == null;

  /// The bus this phone last reported as, from storage.
  ///
  /// Storage being unavailable costs a remembered choice, not the feature — the
  /// driver simply picks their bus again.
  Future<int?> loadRememberedVehicle() async {
    if (_vehicleId != null) return _vehicleId;
    try {
      final prefs = await SharedPreferences.getInstance();
      final remembered = prefs.getInt(_vehicleKey);
      if (remembered != null) {
        _vehicleId = remembered;
        notifyListeners();
      }
      return remembered;
    } catch (_) {
      return null;
    }
  }

  /// Chooses the bus this phone reports as.
  ///
  /// Refused while sharing: switching mid-share would start reporting this
  /// position as a different bus and put one somewhere it is not, leaving the
  /// bus just abandoned frozen at its last fix.
  Future<void> setVehicle(int id, {String label = ''}) async {
    if (_sharing) return;
    _vehicleId = id;
    _vehicleLabel = label;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_vehicleKey, id);
    } catch (_) {}
  }

  /// Keeps the on-screen name of the chosen bus current once the fleet loads.
  void describeVehicle(int id, String label) {
    if (_vehicleId != id || _vehicleLabel == label) return;
    _vehicleLabel = label;
    notifyListeners();
  }

  void _ensureObserving() {
    if (_observing) return;
    WidgetsBinding.instance.addObserver(this);
    _observing = true;
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state != AppLifecycleState.resumed) return;

    // Coming back from the settings app is the one moment permission can have
    // changed without the app hearing about it.
    refreshBlock();

    // Dart timers do not run while the app is suspended, so the heartbeat may
    // have missed its turn — on iOS it certainly has. Reporting on resume means
    // the worst case is a gap while the phone was asleep, not a position that
    // stayed stale after its owner picked the phone back up.
    final last = _lastPosition;
    if (_sharing && last != null) _send(last, heartbeat: true);
  }

  /// Reads the permission as it stands, prompting for nothing.
  Future<void> refreshBlock() async {
    final block = await _location.currentBlock();
    if (block == _block) return;
    _block = block;
    notifyListeners();

    // Location switched off underneath a running share means the fixes have
    // already stopped; saying so beats a toggle that claims to be on.
    if (_sharing && block != LocationBlock.none) {
      await stop();
      _error = LocationService.messageFor(block);
      notifyListeners();
    }
  }

  /// Raises the browser's or the OS's permission prompt on its own.
  ///
  /// Separate from [start] because allowing location and broadcasting it are
  /// different decisions — someone may well want to grant the permission
  /// without switching sharing on in the same tap.
  Future<LocationBlock> ask() async {
    _asking = true;
    _error = null;
    notifyListeners();

    _block = await _location.ensurePermission();
    _asking = false;
    notifyListeners();
    return _block;
  }

  /// Grants if needed, then starts reporting.
  Future<void> start() async {
    if (_sharing || _starting) return;

    if (needsVehicle) {
      _error = 'Choose which bus this phone is on before sharing.';
      notifyListeners();
      return;
    }
    if (!canShare) {
      _error = 'Sign in before sharing this bus’s location.';
      notifyListeners();
      return;
    }

    _starting = true;
    _error = null;
    notifyListeners();

    final block = await _location.ensurePermission();
    if (block != LocationBlock.none) {
      _block = block;
      _starting = false;
      _error = LocationService.messageFor(block);
      notifyListeners();
      return;
    }

    _ensureObserving();
    _block = LocationBlock.none;
    _sharing = true;
    notifyListeners();

    try {
      // Sent before the stream is wired up so the office sees the person
      // straight away — the stream's distance filter means somebody standing
      // still would otherwise emit nothing at all.
      final first = await _location.currentPosition();
      await _send(first);
    } catch (e) {
      _error = _clean(e);
    }

    _starting = false;
    notifyListeners();

    // Getting the first fix takes a few seconds, and the button says "Stop
    // sharing" throughout. Someone who presses it in that window must not end
    // up with a stream that starts anyway and reports from their pocket.
    if (!_sharing) return;

    _positions = _location.positionStream().listen(
      _send,
      onError: (Object e) {
        _error = _clean(e);
        notifyListeners();
      },
    );

    // The filtered stream goes silent when somebody stops moving, which the
    // portals cannot tell apart from a phone that has been switched off. This
    // keeps the last known position current so a stationary person reads as
    // stationary, not missing.
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) {
      final last = _lastPosition;
      if (last != null) _send(last, heartbeat: true);
    });
  }

  /// Stops reporting and removes the stored position.
  Future<void> stop() async {
    _positions?.cancel();
    _positions = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;

    _sharing = false;
    _placeName = '';
    _lastSentAt = null;
    _lastPosition = null;
    notifyListeners();

    // The stored position goes with it. Leaving it to expire would keep the bus
    // on the agency's map for another fifteen minutes after its driver
    // deliberately switched sharing off.
    final vehicleId = _vehicleId;
    if (vehicleId == null) return;
    try {
      await _api.stopSharingVehicleLocation(vehicleId);
    } catch (e) {
      _error = _clean(e);
      notifyListeners();
    }
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
        // Who is driving travels with the bus's position, so the office can
        // ask "who is on it" without a second lookup.
        driverUsername: _session.username,
        driverName: _session.personName,
        speedKph: speedKphOf(position),
        heading: headingOf(position),
      );

      _lastSentAt = DateTime.now();
      // The API names the place from the coordinates; showing its answer rather
      // than the numbers means the person and the office are looking at the
      // same words for where they are.
      _placeName = (fix['place'] as String?)?.trim().isNotEmpty == true
          ? fix['place'] as String
          : (fix['placeName'] as String? ?? '');
      _error = null;
      notifyListeners();
    } catch (e) {
      _error = _clean(e);
      notifyListeners();
    }
  }

  String _clean(Object error) =>
      error.toString().replaceFirst('Exception: ', '').trim();

  /// Drops everything on sign-out, so the next person to use the device does not
  /// inherit a share filed under the previous account.
  Future<void> reset() async {
    if (_sharing) await stop();
    _block = LocationBlock.none;
    _error = null;
    notifyListeners();
  }
}
