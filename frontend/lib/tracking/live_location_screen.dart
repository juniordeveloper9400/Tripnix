import 'dart:async';

import 'package:flutter/material.dart';

import '../agency/agency_session.dart';
import '../models/vehicle.dart';
import '../services/api_service.dart';
import '../services/location_service.dart';
import '../services/location_sharing.dart';
import '../theme/app_colors.dart';

/// Share where this bus is, and see the whole fleet come back.
///
/// The subject is the bus: a driver says which one this phone is riding on and
/// the office sees that bus move, because a bus is what an office dispatches.
/// Who is driving travels with the fix so "who is on it" is answerable, but it
/// is the bus that appears on the map.
///
/// The sharing itself belongs to [LocationSharing] rather than to this screen —
/// closing this page must not stop a bus reporting, which is exactly what
/// happened while the stream was owned here.
class LiveLocationScreen extends StatefulWidget {
  const LiveLocationScreen({super.key});

  @override
  State<LiveLocationScreen> createState() => _LiveLocationScreenState();
}

class _LiveLocationScreenState extends State<LiveLocationScreen> {
  /// How often the fleet below is re-read while this screen is open.
  static const _fleetRefresh = Duration(seconds: 20);

  final _api = ApiService.instance;
  final _location = LocationService.instance;
  final _sharing = LocationSharing.instance;
  final _session = AgencySession.instance;

  Timer? _fleetTimer;
  Map<String, dynamic>? _tracking;

  List<Vehicle> _vehicles = [];
  bool _loadingVehicles = true;
  String? _loadError;

  String get _operatorName => _session.operatorName;

  @override
  void initState() {
    super.initState();
    _sharing.refreshBlock();
    _bootstrap();
  }

  @override
  void dispose() {
    _fleetTimer?.cancel();
    // Deliberately does not stop sharing: it belongs to the app, not to this
    // route, and a driver leaving this page has not asked their bus to stop
    // reporting.
    super.dispose();
  }

  Future<void> _bootstrap() async {
    await Future.wait([_loadVehicles(), _loadFleet()]);
    _fleetTimer = Timer.periodic(_fleetRefresh, (_) => _loadFleet());
  }

  Future<void> _loadVehicles() async {
    try {
      final vehicles = await _api.fetchMyListedVehicles(_operatorName);
      final remembered = await _sharing.loadRememberedVehicle();

      if (!mounted) return;
      setState(() {
        _vehicles = vehicles;
        _loadingVehicles = false;
      });

      if (vehicles.isEmpty) return;

      // A remembered bus that has since been removed from the fleet would
      // report positions for a vehicle nobody can see, so it falls back to the
      // first one rather than silently reporting into nothing.
      final valid = vehicles.any((v) => v.id == remembered);
      final chosen = valid ? remembered! : vehicles.first.id;
      final vehicle = vehicles.firstWhere((v) => v.id == chosen);

      if (!valid || _sharing.vehicleId == null) {
        await _sharing.setVehicle(chosen, label: _labelFor(vehicle));
      } else {
        _sharing.describeVehicle(chosen, _labelFor(vehicle));
      }
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = e.toString().replaceFirst('Exception: ', '').trim();
        _loadingVehicles = false;
      });
    }
  }

  String _labelFor(Vehicle v) =>
      v.vehicleNumber.isEmpty ? v.name : '${v.name} · ${v.vehicleNumber}';

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
          await _loadFleet();
        },
        child: ListenableBuilder(
          listenable: _sharing,
          builder: (context, _) {
            return ListView(
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
            );
          },
        ),
      ),
    );
  }

  Widget _shareCard() {
    final sharing = _sharing.sharing;
    final error = _sharing.error;
    final label = _sharing.vehicleLabel;

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
                      sharing ? 'Sharing this bus’s location' : 'Not sharing',
                      style: const TextStyle(
                          fontWeight: FontWeight.bold, fontSize: 15),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      sharing
                          ? (label.isEmpty
                              ? 'Your office and owner can see this bus on their map.'
                              : '$label is on your office and owner’s map.')
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
                      await _loadFleet();
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
                            await _loadFleet();
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
                          : 'Share live location',
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
          value: _sharing.vehicleId,
          items: _vehicles
              .map((v) => DropdownMenuItem(
                    value: v.id,
                    child: Text(
                      _labelFor(v),
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(fontSize: 14),
                    ),
                  ))
              .toList(),
          // Changing bus mid-share would start reporting this position as a
          // different bus, putting one somewhere it is not and leaving the one
          // abandoned frozen at its last fix.
          onChanged: _sharing.sharing
              ? null
              : (id) {
                  if (id == null) return;
                  final vehicle = _vehicles.firstWhere((v) => v.id == id);
                  _sharing.setVehicle(id, label: _labelFor(vehicle));
                },
        ),
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
    final driver = (location?['driverName'] as String?)?.trim() ?? '';

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

    final number = (v['subtitle'] as String?)?.trim() ?? '';

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
                        v['name'] as String? ?? 'Bus',
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                    ),
                    if (number.isNotEmpty) ...[
                      const SizedBox(width: 6),
                      Text(
                        number,
                        style: TextStyle(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: Colors.grey[700],
                        ),
                      ),
                    ],
                  ],
                ),
                const SizedBox(height: 2),
                Text(
                  where,
                  style: TextStyle(fontSize: 12, color: Colors.grey[700]),
                ),
                // Who is on the bus, when the fix said. The bus is the subject
                // of this row, so the driver is a detail under it rather than
                // the heading.
                if (driver.isNotEmpty) ...[
                  const SizedBox(height: 2),
                  Text(
                    'Driver: $driver',
                    style: TextStyle(fontSize: 11.5, color: Colors.grey[600]),
                  ),
                ],
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
