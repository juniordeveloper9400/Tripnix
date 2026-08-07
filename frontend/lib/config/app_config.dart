import 'package:flutter/foundation.dart';

/// Resolves backend URLs for both local development and the deployed site.
///
/// Locally the Flutter app runs on its own port (e.g. localhost:60777) while
/// the Node backend listens on port 3000. When deployed, the API, the admin
/// portal and the /public images are all served from the same origin, so the
/// URLs become relative to wherever the site is hosted.
class AppConfig {
  /// Pins the backend for builds that cannot use either default — an Android
  /// emulator (which reaches the host as 10.0.2.2), a phone on the same LAN, or
  /// a web build whose API lives on another domain:
  ///
  ///   flutter run --dart-define=API_ORIGIN=http://10.0.2.2:3000
  ///   flutter build web --dart-define=API_ORIGIN=https://api.example.com
  static const String _originOverride =
      String.fromEnvironment('API_ORIGIN', defaultValue: '');

  static const String _devHost = 'localhost';
  static const int _devPort = 3000;
  static const String _devOrigin = 'http://$_devHost:$_devPort';

  /// True when the app is served from a local dev server, where the backend
  /// lives on a different port than the Flutter app.
  static bool get _isLocalWeb {
    final host = Uri.base.host;
    return host == 'localhost' || host == '127.0.0.1';
  }

  /// Origin serving the API, the admin portal and the shared images.
  static String get origin {
    if (_originOverride.isNotEmpty) {
      // A trailing slash here would produce "…//api" on every request.
      return _originOverride.endsWith('/')
          ? _originOverride.substring(0, _originOverride.length - 1)
          : _originOverride;
    }
    if (!kIsWeb) return _devOrigin;
    if (!_isLocalWeb) return Uri.base.origin;

    // `flutter run` serves the app on a random port, so the backend has to be
    // named explicitly. A page already served by the backend itself keeps its
    // own origin, which is what the assembled dist/ build is opened as.
    return Uri.base.port == _devPort ? Uri.base.origin : _devOrigin;
  }

  static String get apiBase => '$origin/api';
  static String get publicBase => '$origin/public';
  static String get adminUrl => '$origin/admin/';

  /// Shown when the app cannot reach [origin] at all, so the message names the
  /// address that actually failed rather than leaving the user to guess.
  static String get unreachableMessage =>
      _isDevelopmentBackend
          ? 'Cannot reach the Tripnix backend at $origin.\n'
              'Start it with "npm start" in the project root, then try again.'
          : 'Cannot reach the Tripnix server at $origin.\n'
              'Check your internet connection and try again.';

  static bool get _isDevelopmentBackend =>
      origin.contains('localhost') ||
      origin.contains('127.0.0.1') ||
      origin.contains('10.0.2.2');
}
