import 'dart:async';

import 'package:flutter/material.dart';

import '../agency/agency_session.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/location_sharing.dart';
import '../theme/app_colors.dart';

/// Share where you are, and see who else in your agency is sharing.
///
/// Sharing is per person, not per bus: whoever is signed in allows location and
/// appears on their agency's map as themselves. The sharing itself belongs to
/// [LocationSharing] rather than to this screen — closing this page must not
/// stop somebody reporting, which is exactly what happened while the stream was
/// owned here.
class LiveLocationScreen extends StatefulWidget {
  const LiveLocationScreen({super.key});

  @override
  State<LiveLocationScreen> createState() => _LiveLocationScreenState();
}

class _LiveLocationScreenState extends State<LiveLocationScreen> {
  /// How often the people list below is re-read while this screen is open.
  static const _listRefresh = Duration(seconds: 20);

  final _api = ApiService.instance;
  final _location = LocationService.instance;
  final _sharing = LocationSharing.instance;
  final _session = AgencySession.instance;

  Timer? _listTimer;
  Map<String, dynamic>? _tracking;

  String get _operatorName => _session.operatorName;
  String get _username => _session.username;

  @override
  void initState() {
    super.initState();
    _sharing.refreshBlock();
    _loadPeople();
    _listTimer = Timer.periodic(_listRefresh, (_) => _loadPeople());
  }

  @override
  void dispose() {
    _listTimer?.cancel();
    // Deliberately does not stop sharing: it belongs to the app, not to this
    // route, and someone leaving this page has not asked to stop reporting.
    super.dispose();
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
          await _sharing.refreshBlock();
          await _loadPeople();
        },
        child: ListenableBuilder(
          listenable: _sharing,
          builder: (context, _) {
            // The list is re-read whenever a fix is posted, so the row for the
            // person using this screen keeps up with their own movement.
            return ListView(
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
            );
          },
        ),
      ),
    );
  }

  Widget _shareCard() {
    final sharing = _sharing.sharing;
    final error = _sharing.error;

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
                  color: (sharing ? Colors.green : AppColors.red)
                      .withValues(alpha: 0.12),
                  shape: BoxShape.circle,
                ),
                child: Icon(
                  sharing ? Icons.my_location : Icons.location_disabled,
                  color: sharing ? Colors.green.shade700 : AppColors.red,
                  size: 21,
                ),
              ),
              const SizedBox(width: 13),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      sharing ? 'Sharing your location' : 'Not sharing',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      sharing
                          ? 'Your office and owner can see where you are.'
                          : 'Turn this on to let your agency see where you are.',
                      style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ],
          ),
          if (!_sharing.canShare) ...[
            const SizedBox(height: 14),
            _notice(
              icon: Icons.login,
              colour: Colors.orange.shade800,
              message: 'Sign in to your agency account before sharing — a '
                  'position has to belong to somebody for your office to know '
                  'whose it is.',
            ),
          ],
          if (_sharing.block != LocationBlock.none) ...[
            const SizedBox(height: 14),
            _permissionNotice(),
          ],
          if (error != null) ...[
            const SizedBox(height: 14),
            _notice(
              icon: Icons.error_outline,
              colour: AppColors.red,
              message: error,
            ),
          ],
          if (sharing) ...[
            const SizedBox(height: 14),
            _currentFix(),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            height: 50,
            child: sharing
                ? OutlinedButton.icon(
                    onPressed: () async {
                      await _sharing.stop();
                      await _loadPeople();
                    },
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
                    onPressed: _sharing.starting || !_sharing.canShare
                        ? null
                        : () async {
                            await _sharing.start();
                            await _loadPeople();
                          },
                    icon: _sharing.starting
                        ? const SizedBox(
                            width: 17,
                            height: 17,
                            child: CircularProgressIndicator(
                                strokeWidth: 2, color: Colors.white),
                          )
                        : const Icon(Icons.near_me, size: 19),
                    label: Text(
                      _sharing.starting
                          ? 'Getting your position…'
                          : 'Share my location',
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
    final canAsk = _sharing.block == LocationBlock.denied;

    // Only worth offering where it goes somewhere: on the web there is no app
    // settings page and the underlying call is unsupported.
    final needsSettings =
        _sharing.block == LocationBlock.deniedForever && _location.canOpenSettings;
    final needsService =
        _sharing.block == LocationBlock.serviceDisabled && _location.canOpenSettings;

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
                  LocationService.messageFor(_sharing.block),
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
                onPressed: _sharing.asking ? null : () => _sharing.ask(),
                icon: _sharing.asking
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                            strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.location_on_outlined, size: 19),
                label: Text(
                  _sharing.asking
                      ? 'Waiting for your answer…'
                      : 'Allow location access',
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
    final sentAt = _sharing.lastSentAt;
    final place = _sharing.placeName;

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
                  place.isEmpty ? 'Finding the place name…' : place,
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
