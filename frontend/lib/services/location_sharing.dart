import 'dart:async';

import 'package:flutter/widgets.dart';
import 'package:geolocator/geolocator.dart';

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

  bool _sharing = false;
  bool _starting = false;
  bool _asking = false;
  LocationBlock _block = LocationBlock.none;
  Position? _lastPosition;
  DateTime? _lastSentAt;
  String _placeName = '';
  String? _error;

  bool get sharing => _sharing;
  bool get starting => _starting;
  bool get asking => _asking;
  LocationBlock get block => _block;
  DateTime? get lastSentAt => _lastSentAt;
  String get placeName => _placeName;
  String? get error => _error;

  /// True when there is an account to file positions under. Sharing is per
  /// person, so a signed-out visitor has nothing to report as.
  bool get canShare =>
      _session.username.isNotEmpty && _session.operatorName.isNotEmpty;

  /// True when the only thing between the user and sharing is the permission.
  bool get needsPermission =>
      _block == LocationBlock.denied || _block == LocationBlock.deniedForever;

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

    if (!canShare) {
      _error = 'Sign in before sharing your location.';
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

    // The stored position goes with it. Leaving it to expire would keep the
    // person on their agency's map for another fifteen minutes after they
    // deliberately switched sharing off.
    final username = _session.username;
    if (username.isEmpty) return;
    try {
      await _api.stopSharingMyLocation(username);
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

    if (!canShare) return;

    try {
      final fix = await _api.reportMyLocation(
        username: _session.username,
        operatorName: _session.operatorName,
        displayName: _session.personName,
        role: _session.role,
        lat: position.latitude,
        lng: position.longitude,
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
