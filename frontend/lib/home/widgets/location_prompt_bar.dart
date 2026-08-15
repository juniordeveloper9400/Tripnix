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
/// It shows nothing at all when there is nobody signed in to file a position
/// under, when the browser has already been asked and refused for good, or once
/// sharing is running — a banner that stayed up after being acted on would just
/// be noise on every screen.
class LocationPromptBar extends StatefulWidget {
  const LocationPromptBar({super.key});

  @override
  State<LocationPromptBar> createState() => _LocationPromptBarState();
}

class _LocationPromptBarState extends State<LocationPromptBar> {
  final _sharing = LocationSharing.instance;

  /// Dismissed for this run only. Not persisted: the point of the bar is that
  /// the office can ask someone to turn sharing on and they can find it, and a
  /// permanently hidden control is worse than a repeated one.
  bool _dismissed = false;

  @override
  void initState() {
    super.initState();
    _sharing.refreshBlock();
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _sharing,
      builder: (context, _) {
        if (_dismissed) return const SizedBox.shrink();

        // Nothing to file a position under.
        if (!_sharing.canShare) return const SizedBox.shrink();

        // Already reporting — the Location screen is where it is managed.
        if (_sharing.sharing) return const SizedBox.shrink();

        // Refused for good, or the page is on an insecure origin: neither can be
        // fixed by a button here, and the Location screen explains both properly.
        if (_sharing.block == LocationBlock.deniedForever ||
            _sharing.block == LocationBlock.insecureOrigin) {
          return const SizedBox.shrink();
        }

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
                const Icon(Icons.near_me_outlined,
                    size: 20, color: AppColors.red),
                const SizedBox(width: 11),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        'Share your location',
                        style: TextStyle(
                            fontWeight: FontWeight.bold, fontSize: 13.5),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Let your office and owner see where you are while you '
                        'are working.',
                        style: TextStyle(
                            fontSize: 11.5,
                            height: 1.35,
                            color: Colors.grey[700]),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 8),
                _action(),
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

  Widget _action() {
    final busy = _sharing.starting || _sharing.asking;

    return FilledButton(
      // One tap does the whole thing: raises the permission prompt and, once
      // it is granted, starts reporting. Asking someone to allow location and
      // then hunt for a second button to actually share is how a position never
      // reaches the office.
      onPressed: busy
          ? null
          : () async {
              await _sharing.start();
              if (!mounted) return;

              // Anything the one-tap path cannot resolve — a refusal, an
              // insecure origin, location switched off on the device — has a
              // proper explanation on the Location screen rather than a
              // sentence squeezed into a banner.
              if (!_sharing.sharing && _sharing.block != LocationBlock.none) {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const LiveLocationScreen()),
                );
              }
            },
      style: FilledButton.styleFrom(
        backgroundColor: AppColors.red,
        foregroundColor: Colors.white,
        padding: const EdgeInsets.symmetric(horizontal: 14),
        minimumSize: const Size(0, 36),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      ),
      child: busy
          ? const SizedBox(
              width: 15,
              height: 15,
              child: CircularProgressIndicator(
                  strokeWidth: 2, color: Colors.white),
            )
          : const Text('Allow',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12.5)),
    );
  }
}
