import 'package:flutter/foundation.dart';

/// Resolves backend URLs for both local development and the deployed site.
///
/// Locally the Flutter app runs on its own port (e.g. localhost:60777) while
/// the Node backend listens on port 3000. When deployed, the API, the admin
/// portal and the /public images are all served from the same origin, so the
/// URLs become relative to wherever the site is hosted.
class AppConfig {
  static const String _devOrigin = 'http://localhost:3000';

  /// True when the app is served from a local dev server, where the backend
  /// lives on a different port than the Flutter app.
  static bool get _isLocalWeb {
    final host = Uri.base.host;
    return host == 'localhost' || host == '127.0.0.1';
  }

  /// Origin serving the API, the admin portal and the shared images.
  static String get origin =>
      (kIsWeb && !_isLocalWeb) ? Uri.base.origin : _devOrigin;

  static String get apiBase => '$origin/api';
  static String get publicBase => '$origin/public';
  static String get adminUrl => '$origin/admin/';
}
