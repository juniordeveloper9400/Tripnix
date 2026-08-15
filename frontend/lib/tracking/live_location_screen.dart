import 'dart:async';

import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';

import '../agency/agency_session.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../theme/app_colors.dart';

/// Share where you are, and see who else in your agency is sharing.
///
/// Sharing is per person, not per bus: whoever is signed in allows location and
/// appears on their agency's map as themselves. Nothing is reported until they
/// switch it on, and switching it off deletes the last position rather than
/// leaving it to go stale.
class LiveLocationScreen extends StatefulWidget {
  const LiveLocationScreen({super.key});

  @override
  State<LiveLocationScreen> createState() => _LiveLocationScreenState();
}

class _LiveLocationScreenState extends State<LiveLocationScreen>
    with WidgetsBindingObserver {
  /// Somebody counts as live for 15 minutes after their last fix, so a person
  /// standing still has to speak up well inside that or they drop off the
  /// portals' map while sitting in plain sight at the depot.
  static const _heartbeat = Duration(minutes: 2);

  /// The floor between two reports. Without it a phone in a moving vehicle would
  /// post on every twitch of the GPS, which costs data and tells the office
  /// nothing new.
  static const _minimumGap = Duration(seconds: 20);

  /// How often the people list below is re-read while this screen is open.
  static const _listRefresh = Duration(seconds: 20);

  final _api = ApiService.instance;
  final _location = LocationService.instance;
  final _session = AgencySession.instance;

  bool _sharing = false;
  LocationBlock _block = LocationBlock.none;

  StreamSubscription<Position>? _positions;
  Timer? _heartbeatTimer;
  Timer? _listTimer;

  Position? _lastPosition;
  DateTime? _lastSentAt;
  String _placeName = '';
  String? _shareError;
  bool _sending = false;
  bool _asking = false;

  Map<String, dynamic>? _tracking;

  String get _operatorName => _session.operatorName;
  String get _username => _session.username;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _bootstrap();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _stopStream();
    _listTimer?.cancel();
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
    // the worst case is a gap while the phone was asleep, not a position that
    // stayed stale after its owner picked the phone back up.
    final last = _lastPosition;
    if (_sharing && last != null) _send(last, heartbeat: true);

    _loadPeople();
  }

  Future<void> _bootstrap() async {
    await _refreshBlock();
    await _loadPeople();
    _listTimer = Timer.periodic(_listRefresh, (_) => _loadPeople());
  }

  Future<void> _refreshBlock() async {
    final block = await _location.currentBlock();
    if (!mounted) return;
    setState(() => _block = block);

    // Location switched off underneath a running share means the fixes have
    // already stopped; saying so beats a toggle that claims to be on.
    if (_sharing && block != LocationBlock.none) {
      await _stopSharing();
      if (!mounted) return;
      setState(() => _shareError = LocationService.messageFor(block));
    }
  }

  Future<void> _loadPeople() async {
    if (_operatorName.isEmpty) return;
    try {
      final tracking = await _api.fetchTracking(_operatorName);
      if (!mounted) return;
      setState(() => _tracking = tracking);
    } catch (_) {
      // The people list is a bonus on this screen; a failed refresh keeps the
      // last one rather than replacing it with an error nobody can act on.
    }
  }

  // ─── Permission ──────────────────────────────────────────

  /// Raises the browser's or the OS's permission prompt on its own.
  ///
  /// Separate from [_startSharing] because allowing location and broadcasting
  /// it are different decisions — someone may well want to grant the permission
  /// without switching sharing on in the same tap.
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

  // ─── Sharing ─────────────────────────────────────────────

  Future<void> _startSharing() async {
    if (_username.isEmpty || _operatorName.isEmpty) {
      setState(() => _shareError = 'Sign in again before sharing your location.');
      return;
    }

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
      // Sent before the stream is wired up so the office sees the person
      // straight away — the stream's distance filter means somebody standing
      // still would otherwise emit nothing at all.
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

    // The filtered stream goes silent when somebody stops moving, which the
    // portals cannot tell apart from a phone that has been switched off. This
    // keeps the last known position current so a stationary person reads as
    // stationary, not missing.
    _heartbeatTimer = Timer.periodic(_heartbeat, (_) {
      final last = _lastPosition;
      if (last != null) _send(last, heartbeat: true);
    });
  }

  /// Tears down the stream and the heartbeat without touching the server.
  void _stopStream() {
    _positions?.cancel();
    _positions = null;
    _heartbeatTimer?.cancel();
    _heartbeatTimer = null;
  }

  Future<void> _stopSharing() async {
    _stopStream();
    if (mounted) {
      setState(() {
        _sharing = false;
        _placeName = '';
        _lastSentAt = null;
      });
    }
    _lastPosition = null;

    // The stored position goes with it. Leaving it to expire would keep the
    // person on their agency's map for another fifteen minutes after they
    // deliberately switched sharing off.
    if (_username.isEmpty) return;
    try {
      await _api.stopSharingMyLocation(_username);
    } catch (e) {
      if (!mounted) return;
      setState(() => _shareError = _clean(e));
    }
    await _loadPeople();
  }

  /// Posts a fix, unless one went recently enough that this one would say the
  /// same thing.
  Future<void> _send(Position position, {bool heartbeat = false}) async {
    _lastPosition = position;

    final sentAt = _lastSentAt;
    if (!heartbeat && sentAt != null && DateTime.now().difference(sentAt) < _minimumGap) {
      return;
    }

    if (_username.isEmpty || _operatorName.isEmpty) return;

    try {
      final fix = await _api.reportMyLocation(
        username: _username,
        operatorName: _operatorName,
        displayName: _session.personName,
        role: _session.role,
        lat: position.latitude,
        lng: position.longitude,
        speedKph: speedKphOf(position),
        heading: headingOf(position),
      );

      if (!mounted) return;
      setState(() {
        _lastSentAt = DateTime.now();
        // The API names the place from the coordinates; showing its answer
        // rather than the numbers means the person and the office are looking
        // at the same words for where they are.
        _placeName = (fix['place'] as String?)?.trim().isNotEmpty == true
            ? fix['place'] as String
            : (fix['placeName'] as String? ?? '');
        _shareError = null;
      });
      await _loadPeople();
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
        title: const Text('Location',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.black,
        elevation: 0,
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await _refreshBlock();
          await _loadPeople();
        },
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
          children: [
            _shareCard(),
            const SizedBox(height: 20),
            const Text(
              'SHARING RIGHT NOW',
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.w900,
                letterSpacing: 1,
                color: Colors.grey,
              ),
            ),
            const SizedBox(height: 10),
            _peopleList(),
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
                      _sharing ? 'Sharing your location' : 'Not sharing',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _sharing
                          ? 'Your office and owner can see where you are.'
                          : 'Turn this on to let your agency see where you are.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
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
                    onPressed: _sending ? null : _startSharing,
                    icon: _sending
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.near_me, size: 19),
                    label: Text(
                      _sending ? 'Getting your position…' : 'Share my location',
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

  Widget _permissionNotice() {
    // A plain refusal can still be asked about, and this button is the only
    // thing on the screen that raises the prompt on its own.
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

  Widget _peopleList() {
    final people = (_tracking?['people'] as List<dynamic>?) ?? const [];

    if (_tracking == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 20),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2.5)),
      );
    }

    if (people.isEmpty) {
      return _notice(
        icon: Icons.person_off_outlined,
        colour: Colors.grey.shade700,
        // Nobody sharing is a choice, not a fault, so this does not read as an
        // error or imply anyone is missing.
        message: 'Nobody in this agency is sharing their location right now.',
      );
    }

    return Column(
      children: people
          .cast<Map<String, dynamic>>()
          .map((p) => _personRow(p))
          .toList(),
    );
  }

  Widget _personRow(Map<String, dynamic> p) {
    final location = p['location'] as Map<String, dynamic>?;
    final live = location?['live'] == true;
    final place = (location?['place'] as String?)?.trim() ?? '';
    final ageMinutes = (location?['ageMinutes'] as num?)?.round() ?? 0;

    final (Color colour, String badge) =
        live ? (Colors.green, 'LIVE') : (Colors.orange.shade800, '$ageMinutes MIN AGO');

    final where = place.isEmpty
        // Only when the geocoder could not name the spot — an honest gap rather
        // than falling back to a pair of numbers nobody can read.
        ? 'Position received, place name not available'
        : place;

    final isMe = (p['id'] as String?) == _username;
    final role = (p['subtitle'] as String?)?.trim() ?? '';

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
                Row(
                  children: [
                    Flexible(
                      child: Text(
                        p['name'] as String? ?? 'Someone',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                    if (isMe) ...[
                      const SizedBox(width: 6),
                      Text(
                        '(you)',
                        style: TextStyle(fontSize: 11.5, color: Colors.grey[600]),
                      ),
                    ],
                    if (role.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Text(
                        '· $role',
                        style: TextStyle(fontSize: 11.5, color: Colors.grey[600]),
                      ),
                    ],
                  ],
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
