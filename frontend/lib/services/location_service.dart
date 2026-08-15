import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';

/// Why the device cannot give a position, in the terms the user has to act on.
///
/// The distinction matters because the fix is different for each: a disabled
/// service is a settings toggle, a denied permission is a prompt to accept, and
/// a permanently denied one can only be undone in the app's settings page — a
/// screen that told the user to "allow location" in that last case would be
/// telling them to do something the app can no longer ask for.
enum LocationBlock {
  /// Location is available and permitted.
  none,

  /// Location services are switched off for the whole device.
  serviceDisabled,

  /// Refused this time; asking again is allowed.
  denied,

  /// Refused permanently (or "Never ask again"). Only the settings app can
  /// undo this — [LocationService.openSettings] is the only way forward.
  deniedForever,
}

/// Where the device is, and permission to know it.
///
/// Wraps geolocator so the rest of the app deals in one result type instead of
/// three different exception classes, and so the permission dance happens in
/// exactly one place.
class LocationService {
  LocationService._();
  static final LocationService instance = LocationService._();

  /// Enough movement to be worth a report. Below this a parked bus would post
  /// a stream of identical fixes and burn the driver's battery and data for a
  /// position that has not changed.
  static const int _minimumMovementMetres = 25;

  /// Asks for whatever is missing, in order, and reports what is still in the
  /// way.
  ///
  /// Safe to call repeatedly — when permission is already granted this makes no
  /// prompt and returns [LocationBlock.none].
  Future<LocationBlock> ensurePermission() async {
    // The permission is meaningless while the device's location is switched
    // off: it can be granted and still return nothing. On the web there is no
    // such device-level switch, and the check reports false on some browsers,
    // so it is only meaningful natively.
    if (!kIsWeb && !await Geolocator.isLocationServiceEnabled()) {
      return LocationBlock.serviceDisabled;
    }

    var permission = await Geolocator.checkPermission();

    if (permission == LocationPermission.denied) {
      permission = await Geolocator.requestPermission();
    }

    switch (permission) {
      case LocationPermission.denied:
        return LocationBlock.denied;
      case LocationPermission.deniedForever:
        return LocationBlock.deniedForever;
      case LocationPermission.always:
      case LocationPermission.whileInUse:
      case LocationPermission.unableToDetermine:
        // "Unable to determine" is what the web reports before the browser has
        // been asked. Treating it as allowed lets the first read trigger the
        // browser's own prompt, which is where the decision actually happens.
        return LocationBlock.none;
    }
  }

  /// Permission as it stands, asking for nothing.
  ///
  /// Used to show the current state on screen without a prompt appearing the
  /// moment a page opens.
  Future<LocationBlock> currentBlock() async {
    if (!kIsWeb && !await Geolocator.isLocationServiceEnabled()) {
      return LocationBlock.serviceDisabled;
    }
    final permission = await Geolocator.checkPermission();
    return switch (permission) {
      LocationPermission.denied => LocationBlock.denied,
      LocationPermission.deniedForever => LocationBlock.deniedForever,
      _ => LocationBlock.none,
    };
  }

  /// One position, now.
  ///
  /// Throws when permission is missing or the device cannot get a fix, so the
  /// caller must have run [ensurePermission] first.
  Future<Position> currentPosition() {
    return Geolocator.getCurrentPosition(
      locationSettings: const LocationSettings(
        accuracy: LocationAccuracy.high,
        // A device indoors can hunt for a fix indefinitely. Failing after this
        // gives the screen something to say rather than spinning forever.
        timeLimit: Duration(seconds: 30),
      ),
    );
  }

  /// A position every time the device has moved far enough to matter.
  ///
  /// The distance filter is the whole point: it is what turns a continuous
  /// sensor into an occasional report, so a bus on a motorway updates often and
  /// one at a stand goes quiet.
  ///
  /// The per-platform settings are what make this survive a driving day. A
  /// driver puts the phone down and the screen locks within a minute; with the
  /// plain settings Android suspends the app and the fleet map quietly freezes
  /// at wherever the bus was when the screen went off — the failure looks
  /// exactly like a bus that has parked, which is the worst way to be wrong.
  Stream<Position> positionStream() {
    return Geolocator.getPositionStream(
      locationSettings: _settingsForPlatform(),
    );
  }

  LocationSettings _settingsForPlatform() {
    if (kIsWeb) {
      return const LocationSettings(
        accuracy: LocationAccuracy.high,
        distanceFilter: _minimumMovementMetres,
      );
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return AndroidSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _minimumMovementMetres,
          // Android throttles a backgrounded app to a location every few
          // minutes at best, and stops it outright under Doze. A foreground
          // service is the sanctioned way to keep a stream running, and its
          // notification is required — the driver can always see that the bus
          // is sharing its position, which is the honest trade for tracking
          // someone all day.
          foregroundNotificationConfig: const ForegroundNotificationConfig(
            notificationTitle: 'Tripnix is sharing this bus’s location',
            // Tapping opens the app, which is where sharing is stopped — the
            // notification itself has no stop button, so it must not claim one.
            notificationText: 'Your agency can see where this bus is. Tap to open Tripnix.',
            notificationChannelName: 'Live bus location',
            // Without the wake lock the CPU sleeps and every fix arrives in a
            // burst when the phone next wakes, so the office sees nothing for
            // an hour and then an hour of history at once.
            enableWakeLock: true,
            // The fix is worthless if it cannot be posted, and the Wi-Fi radio
            // sleeping is a common reason a parked bus stops reporting.
            enableWifiLock: true,
            // Not dismissable: a swiped-away notification would take the
            // service with it and stop the tracking silently.
            setOngoing: true,
          ),
        );

      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
        return AppleSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _minimumMovementMetres,
          // iOS decides on its own that a stationary device needs no updates
          // and stops them without telling the app; a bus in traffic would drop
          // off the map and only come back when it moved a long way.
          pauseLocationUpdatesAutomatically: false,
          // Tells iOS this is vehicle movement, which is what its filtering is
          // tuned against.
          activityType: ActivityType.automotiveNavigation,
          allowBackgroundLocationUpdates: true,
          // The blue bar while the app is in the background. Required by App
          // Review for continuous tracking, and right regardless: the driver
          // should be able to see it is on.
          showBackgroundLocationIndicator: true,
        );

      default:
        return const LocationSettings(
          accuracy: LocationAccuracy.high,
          distanceFilter: _minimumMovementMetres,
        );
    }
  }

  /// Opens the app's own settings page, the only route back from
  /// [LocationBlock.deniedForever].
  Future<bool> openSettings() => Geolocator.openAppSettings();

  /// Opens the device's location settings, for [LocationBlock.serviceDisabled].
  Future<bool> openLocationSettings() => Geolocator.openLocationSettings();

  /// What to tell the user, and what the button that follows should do.
  static String messageFor(LocationBlock block) => switch (block) {
        LocationBlock.none => '',
        LocationBlock.serviceDisabled =>
          'Location is switched off on this device. Turn it on to share where '
              'this bus is.',
        LocationBlock.denied =>
          'Tripnix needs location access to show your agency where this bus is. '
              'Nothing is shared until you start sharing.',
        LocationBlock.deniedForever =>
          'Location access was turned off for Tripnix. Open settings and allow '
              'location to share this bus’s position.',
      };
}

/// Speed in km/h from a fix, which reports metres per second.
///
/// A device with no speed sensor reading returns a negative number rather than
/// zero, and a negative speed on a dashboard reads as a fault.
double speedKphOf(Position position) {
  final ms = position.speed;
  if (!ms.isFinite || ms < 0) return 0;
  return ms * 3.6;
}

/// Heading in degrees, with the same guard as the speed.
double headingOf(Position position) {
  final heading = position.heading;
  if (!heading.isFinite || heading < 0) return 0;
  return heading;
}
