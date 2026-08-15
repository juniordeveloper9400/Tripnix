import 'package:flutter/material.dart';

import '../../services/location_service.dart';
import '../../services/location_sharing.dart';
import '../../theme/app_colors.dart';
import '../../tracking/live_location_screen.dart';

/// The way in to location sharing, on the first screen the site opens on.
///
/// Sharing used to be reachable only through Profile → Location, three taps
/// down, so somebody opening the public link had no reason to think the app
/// wanted their location at all and no way to offer it. This puts the request
/// where it is seen.
///
/// It stays put whatever is standing in the way. An earlier version hid itself
/// when the browser had blocked location or the device's location was switched
/// off — which is precisely when somebody needs to be told how to turn it back
/// on. The bar changes what it says and what its button does instead of
/// disappearing at the moment it becomes useful.
class LocationPromptBar extends StatefulWidget {
  const LocationPromptBar({super.key});

  @override
  State<LocationPromptBar> createState() => _LocationPromptBarState();
}

/// What the bar should say, and what its button should do about it.
typedef _Prompt = ({
  IconData icon,
  String title,
  String message,
  String action,
});

class _LocationPromptBarState extends State<LocationPromptBar>
    with WidgetsBindingObserver {
  final _sharing = LocationSharing.instance;
  final _location = LocationService.instance;

  /// Dismissed for this run only. Not persisted: the point of the bar is that
  /// the office can ask someone to turn sharing on and they can find it, and a
  /// permanently hidden control is worse than a repeated one.
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _sharing.refreshBlock();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    // Someone sent to the settings app to switch location on comes back to this
    // screen; without re-reading, the bar would still be telling them to do the
    // thing they have just done.
    if (state == AppLifecycleState.resumed) _sharing.refreshBlock();
  }

  _Prompt _promptFor(LocationBlock block) {
    switch (block) {
      case LocationBlock.serviceDisabled:
        return (
          icon: Icons.location_off_outlined,
          title: 'Location is switched off',
          message: 'Turn location on for this device so your agency can see '
              'where you are.',
          action: 'Turn on',
        );

      case LocationBlock.deniedForever:
        return (
          icon: Icons.lock_outline,
          title: 'Location is blocked',
          message: _location.canOpenSettings
              ? 'Tripnix was refused location access. Allow it in settings to '
                  'share where you are.'
              // No settings page to send a browser user to, so the bar names the
              // control they actually have to use rather than a button it cannot
              // provide.
              : 'This browser is blocking location for Tripnix. Allow it from '
                  'the padlock in the address bar, then reload.',
          action: _location.canOpenSettings ? 'Settings' : 'How to fix',
        );

      case LocationBlock.insecureOrigin:
        return (
          icon: Icons.gpp_maybe_outlined,
          title: 'Location needs a secure connection',
          message: 'Browsers only give location to sites on https. Open Tripnix '
              'over https to share where you are.',
          action: 'Details',
        );

      case LocationBlock.denied:
      case LocationBlock.none:
        return (
          icon: Icons.near_me_outlined,
          title: 'Share this bus’s location',
          message: 'Let your office and owner see where your bus is while you '
              'are driving.',
          action: 'Allow',
        );
    }
  }

  /// Everything the one-tap path cannot resolve is explained properly on the
  /// Location screen rather than in a sentence squeezed into a banner.
  Future<void> _openLocationScreen() async {
    await Navigator.of(context).push(
      MaterialPageRoute(builder: (_) => const LiveLocationScreen()),
    );
    if (mounted) _sharing.refreshBlock();
  }

  Future<void> _act(LocationBlock block) async {
    switch (block) {
      case LocationBlock.serviceDisabled:
        // Straight to the device's own switch, which is the only thing that can
        // undo this. On the web there is no such switch, so the screen explains.
        if (_location.canOpenSettings) {
          await _location.openLocationSettings();
        } else {
          await _openLocationScreen();
        }

      case LocationBlock.deniedForever:
        if (_location.canOpenSettings) {
          await _location.openSettings();
        } else {
          await _openLocationScreen();
        }

      case LocationBlock.insecureOrigin:
        await _openLocationScreen();

      case LocationBlock.denied:
      case LocationBlock.none:
        // No bus chosen yet: the position would have nothing to belong to, so
        // this goes straight to the screen with the picker on it rather than
        // raising a prompt that could not be acted on.
        if (_sharing.needsVehicle) {
          await _openLocationScreen();
          return;
        }

        // One tap does the whole thing: raises the permission prompt and, once
        // it is granted, starts reporting. Asking someone to allow location and
        // then hunt for a second button to actually share is how a position
        // never reaches the office.
        await _sharing.start();
        if (!mounted) return;
        if (!_sharing.sharing && _sharing.block != LocationBlock.none) {
          await _openLocationScreen();
        }
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _sharing,
      builder: (context, _) {
        if (_dismissed) return const SizedBox.shrink();

        // A signed-out visitor has no fleet to report into. Somebody signed in
        // who has simply not picked a bus yet still sees the bar — the Location
        // screen is where they choose one, and hiding it would leave them no
        // way to get there.
        if (!_sharing.canShare && !_sharing.needsVehicle) {
          return const SizedBox.shrink();
        }

        // Already reporting; the Location screen is where it is managed.
        if (_sharing.sharing) return const SizedBox.shrink();

        final block = _sharing.block;
        final prompt = _promptFor(block);
        final busy = _sharing.starting || _sharing.asking;

        return Padding(
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
          child: Container(
            padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
            decoration: BoxDecoration(
              color: AppColors.pillBg,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.red.withValues(alpha: 0.22)),
            ),
            child: Row(
              children: [
                Icon(prompt.icon, size: 20, color: AppColors.red),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        prompt.title,
                        style: const TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        prompt.message,
                        style: TextStyle(
                            fontSize: 11.5,
                            height: 1.35,
                            color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                FilledButton(
                  onPressed: busy ? null : () => _act(block),
                  style: FilledButton.styleFrom(
                    backgroundColor: AppColors.red,
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    minimumSize: const Size(0, 36),
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(10)),
                  ),
                  child: busy
                      ? const SizedBox(
                          width: 15,
                          height: 15,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white),
                        )
                      : Text(
                          prompt.action,
                          style: const TextStyle(
                              fontWeight: FontWeight.bold, fontSize: 12.5),
                        ),
                ),
                IconButton(
                  onPressed: () => setState(() => _dismissed = true),
                  icon: const Icon(Icons.close, size: 17),
                  color: Colors.grey[600],
                  visualDensity: VisualDensity.compact,
                  tooltip: 'Not now',
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}
