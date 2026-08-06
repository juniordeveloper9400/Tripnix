import 'package:flutter/material.dart';
import '../home/logo_transition_screen.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import 'agency_session.dart';
import 'money.dart';

/// Where an agency buys and renews its monthly platform membership.
///
/// This lives in the traveller app on purpose: the admin portal shows the
/// resulting status and expiry read-only, and handles per-vehicle subscriptions
/// only.
class AgencyMembershipScreen extends StatefulWidget {
  const AgencyMembershipScreen({super.key, required this.operatorName});

  final String operatorName;

  @override
  State<AgencyMembershipScreen> createState() => _AgencyMembershipScreenState();
}

class _AgencyMembershipScreenState extends State<AgencyMembershipScreen> {
  Map<String, dynamic>? _plans;
  Map<String, dynamic>? _subscription;
  bool _loading = true;
  bool _paying = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final plans = await ApiService.instance.fetchPlans();
      final sub = await ApiService.instance.fetchSubscription(
        widget.operatorName,
      );
      if (!mounted) return;
      setState(() {
        _plans = plans;
        _subscription = sub;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
        _error = e.toString().replaceFirst('Exception: ', '');
      });
    }
  }

  Map<String, dynamic>? get _platform =>
      _subscription?['platform'] as Map<String, dynamic>?;

  bool get _isActive => _platform?['status'] == 'active';

  String get _symbol => (_plans?['currencySymbol'] as String?) ?? '₹';

  num get _price => (_plans?['platform']?['price'] as num?) ?? 0;

  Future<void> _pay() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: Text(_isActive ? 'Renew Membership' : 'Confirm Payment'),
        content: Text(
          _isActive
              ? 'Extend ${widget.operatorName} by another month for '
                    '${formatMoney(_price, symbol: _symbol)}?'
              : 'Activate ${widget.operatorName} on Tripnix for one month for '
                    '${formatMoney(_price, symbol: _symbol)}?',
          style: const TextStyle(height: 1.4),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () => Navigator.of(ctx).pop(true),
            child: Text(_isActive ? 'Renew' : 'Pay & Activate'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;

    setState(() => _paying = true);
    try {
      final result = await ApiService.instance.payPlatformFee(
        widget.operatorName,
      );
      await _load();
      // Unlocks the showcase for a signed-in agency that just paid.
      await AgencySession.instance.refreshMembership();
      if (!mounted) return;
      _showActivatedSheet(result);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppColors.red,
          content: Text(e.toString().replaceFirst('Exception: ', '')),
        ),
      );
    } finally {
      if (mounted) setState(() => _paying = false);
    }
  }

  void _showActivatedSheet(Map<String, dynamic> result) {
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.verified, color: AppColors.red),
            SizedBox(width: 10),
            Expanded(
              child: Text('Membership Active', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${widget.operatorName} is now live on Tripnix.',
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 10),
            Text(
              'Valid until ${formatDate(result['expiresAt'] as String?)}.',
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            const Text(
              'You can now browse every other agency\'s buses. Add your own '
              'fleet from the admin portal — each vehicle needs its own '
              'subscription before travellers see it.',
              style: TextStyle(
                fontSize: 12.5,
                height: 1.45,
                color: Colors.black54,
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(ctx).pop();
              Navigator.of(context).pushNamed('/admin');
            },
            child: const Text(
              'Admin Portal',
              style: TextStyle(color: Colors.grey),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.of(ctx).pop();
              if (AgencySession.instance.canBrowse) {
                Navigator.of(context).pushAndRemoveUntil(
                  MaterialPageRoute(
                    builder: (_) => const LogoTransitionScreen(),
                  ),
                  (route) => false,
                );
              } else {
                Navigator.of(context).pop();
              }
            },
            child: const Text('Enter Tripnix'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text(
          'Platform Membership',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.black,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: AppColors.red))
          : _error != null
          ? _errorView()
          : _content(),
    );
  }

  Widget _errorView() {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            const Icon(Icons.wifi_off, size: 60, color: AppColors.red),
            const SizedBox(height: 12),
            Text(_error!, textAlign: TextAlign.center),
            const SizedBox(height: 18),
            ElevatedButton.icon(
              onPressed: _load,
              icon: const Icon(Icons.refresh),
              label: const Text('Retry'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.black,
                foregroundColor: Colors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _content() {
    final platform = _platform;
    final plan = _plans!['platform'] as Map<String, dynamic>;
    final listings = (_subscription?['listings'] as List<dynamic>? ?? []);
    final activeListings = listings
        .where((l) => (l as Map)['status'] == 'active')
        .length;

    return SingleChildScrollView(
      padding: const EdgeInsets.all(20),
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 560),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.circular(20),
                  gradient: LinearGradient(
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                    colors: _isActive
                        ? [const Color(0xFF0F5132), const Color(0xFF1B1B1B)]
                        : [AppColors.black, const Color(0xFF2B2B2B)],
                  ),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            widget.operatorName,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 19,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 10,
                            vertical: 5,
                          ),
                          decoration: BoxDecoration(
                            color: _isActive
                                ? Colors.greenAccent
                                : Colors.amber,
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text(
                            _isActive
                                ? 'ACTIVE'
                                : platform != null
                                ? 'EXPIRED'
                                : 'NOT PAID',
                            style: const TextStyle(
                              color: Colors.black,
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 14),
                    Text(
                      formatMoney(_price, symbol: _symbol),
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 32,
                        fontWeight: FontWeight.w900,
                        height: 1,
                      ),
                    ),
                    const Text(
                      'per month',
                      style: TextStyle(color: Colors.white70, fontSize: 12),
                    ),
                    const SizedBox(height: 16),
                    _row(
                      'Registered on',
                      formatDate(platform?['startsAt'] as String?),
                    ),
                    _row(
                      'Expires on',
                      formatDate(platform?['expiresAt'] as String?),
                    ),
                    _row(
                      'Time remaining',
                      _isActive ? '${platform!['daysLeft']} days' : '—',
                    ),
                    _row(
                      'Total paid',
                      platform != null
                          ? formatMoney(
                              platform['amount'] as num,
                              symbol: _symbol,
                            )
                          : '—',
                    ),
                    _row(
                      'Vehicles listed',
                      '$activeListings / ${listings.length}',
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton(
                  onPressed: _paying ? null : _pay,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.red,
                    foregroundColor: Colors.white,
                    disabledBackgroundColor: Colors.grey.shade300,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(18),
                    ),
                  ),
                  child: _paying
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(
                            strokeWidth: 2.4,
                            color: Colors.white,
                          ),
                        )
                      : Text(
                          _isActive
                              ? 'Renew for another month · ${formatMoney(_price, symbol: _symbol)}'
                              : 'Pay Platform Fee · ${formatMoney(_price, symbol: _symbol)}',
                          style: const TextStyle(
                            fontSize: 14.5,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                ),
              ),
              const SizedBox(height: 22),
              const Text(
                "What's included",
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
              ),
              const SizedBox(height: 10),
              ...(plan['features'] as List<dynamic>).map(
                (f) => Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Colors.green,
                        size: 17,
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          f.toString(),
                          style: const TextStyle(fontSize: 13, height: 1.4),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 18),
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: Colors.amber.withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(
                    color: Colors.amber.withValues(alpha: 0.4),
                  ),
                ),
                child: const Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Icon(
                      Icons.info_outline,
                      size: 18,
                      color: Color(0xFF8A6D00),
                    ),
                    SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Every bus, traveller or car also needs its own monthly '
                        'subscription. Those are paid from the admin portal.',
                        style: TextStyle(
                          fontSize: 12.5,
                          height: 1.45,
                          color: Color(0xFF8A6D00),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 30),
            ],
          ),
        ),
      ),
    );
  }

  Widget _row(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            label,
            style: const TextStyle(color: Colors.white60, fontSize: 12),
          ),
          Text(
            value,
            style: const TextStyle(
              color: Colors.white,
              fontSize: 13,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }
}
