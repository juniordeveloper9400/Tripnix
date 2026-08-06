import 'dart:convert';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

/// The signed-in travel agency and its platform membership.
///
/// Tripnix is a members-only showcase: an agency has to be signed in *and*
/// have paid the monthly platform fee before it can browse other agencies'
/// buses. This holds that state and persists it across restarts.
class AgencySession {
  static final AgencySession instance = AgencySession._();
  AgencySession._();

  static const _storageKey = 'tripnix_agency_session';

  Map<String, dynamic>? _agency;
  Map<String, dynamic>? _platform;

  Map<String, dynamic>? get agency => _agency;
  Map<String, dynamic>? get platform => _platform;

  String get operatorName => _agency?['operatorName'] as String? ?? '';
  String get username => _agency?['username'] as String? ?? '';
  bool get isSignedIn => _agency != null;

  /// The Super Admin isn't a paying agency, so it bypasses the fee check.
  bool get isSuperAdmin => _agency?['role'] == 'superadmin';

  bool get hasActiveMembership => isSuperAdmin || _platform?['status'] == 'active';

  /// True only when the agency may see the showcase.
  bool get canBrowse => isSignedIn && hasActiveMembership;

  /// Restores a previous session and re-checks the membership against the
  /// server, so an expired one locks the app again on next launch.
  ///
  /// Storage is best-effort: if it's unavailable the user simply starts signed
  /// out rather than the app failing to boot.
  Future<void> restore() async {
    String? raw;
    try {
      final prefs = await SharedPreferences.getInstance();
      raw = prefs.getString(_storageKey);
    } catch (_) {
      return;
    }
    if (raw == null) return;

    try {
      _agency = json.decode(raw) as Map<String, dynamic>;
    } catch (_) {
      await signOut();
      return;
    }
    await refreshMembership();
  }

  Future<void> signIn({
    required String username,
    required String password,
  }) async {
    final user = await ApiService.instance.loginAgency(
      username: username,
      password: password,
    );
    _agency = user;

    // Losing persistence shouldn't fail the sign-in — it just won't survive
    // a reload.
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString(_storageKey, json.encode(user));
    } catch (_) {}

    await refreshMembership();
  }

  /// Re-reads the membership from the backend. Failures leave the previously
  /// known state alone rather than locking someone out on a flaky connection.
  Future<void> refreshMembership() async {
    if (_agency == null || isSuperAdmin) return;
    try {
      final sub = await ApiService.instance.fetchSubscription(operatorName);
      _platform = sub['platform'] as Map<String, dynamic>?;
    } catch (_) {
      // Keep whatever we had; the gate re-checks on the next launch.
    }
  }

  Future<void> signOut() async {
    _agency = null;
    _platform = null;
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_storageKey);
    } catch (_) {}
  }
}
