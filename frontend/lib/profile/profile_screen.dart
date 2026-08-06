import 'package:flutter/material.dart';
import '../agency/agency_gate_screen.dart';
import '../agency/agency_membership_screen.dart';
import '../agency/agency_session.dart';
import '../agency/money.dart';
import '../theme/app_colors.dart';

/// Profile tab — the signed-in agency's account panel.
class ProfileScreen extends StatefulWidget {
  const ProfileScreen({super.key});

  @override
  State<ProfileScreen> createState() => _ProfileScreenState();
}

class _ProfileScreenState extends State<ProfileScreen> {
  AgencySession get _session => AgencySession.instance;

  Future<void> _signOut() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Text('Sign Out'),
        content: const Text(
          'You will need your agency credentials to browse Tripnix again.',
          style: TextStyle(height: 1.4),
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
            child: const Text('Sign Out'),
          ),
        ],
      ),
    );

    if (confirmed != true) return;
    await _session.signOut();
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const AgencyGateScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    final platform = _session.platform;
    final agencyName = _session.operatorName.isEmpty
        ? 'Travel Agency'
        : _session.operatorName;
    final initial = agencyName.characters.first.toUpperCase();

    return Scaffold(
      appBar: AppBar(
        title: const Text('My Agency',
            style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: Colors.white,
        elevation: 0,
        foregroundColor: AppColors.black,
        automaticallyImplyLeading: false,
      ),
      backgroundColor: AppColors.background,
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                boxShadow: const [
                  BoxShadow(
                      color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.red.withValues(alpha: 0.1),
                    child: Text(
                      initial,
                      style: const TextStyle(
                        fontSize: 26,
                        fontWeight: FontWeight.w900,
                        color: AppColors.red,
                      ),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          agencyName,
                          style: const TextStyle(
                              fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          '@${_session.username}',
                          style: const TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        const SizedBox(height: 6),
                        _MembershipChip(session: _session),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _tile(
              icon: Icons.workspace_premium_outlined,
              title: 'Platform Membership',
              subtitle: platform != null
                  ? 'Expires ${formatDate(platform['expiresAt'] as String?)} · '
                      '${formatMoney(platform['amount'] as num)} paid'
                  : 'Subscribe to keep browsing Tripnix',
              onTap: () async {
                await Navigator.of(context).push(
                  MaterialPageRoute(
                    builder: (_) => AgencyMembershipScreen(
                      operatorName: _session.operatorName,
                    ),
                  ),
                );
                if (mounted) setState(() {});
              },
            ),
            _tile(
              icon: Icons.admin_panel_settings_outlined,
              title: 'Owner Admin Portal',
              subtitle: 'Manage your fleet, bus subscriptions & bookings',
              onTap: () => Navigator.of(context).pushNamed('/admin'),
            ),
            _tile(
              icon: Icons.bookmark_outline,
              title: 'My Bookings History',
              subtitle: 'View past and active rental orders',
            ),
            _tile(
              icon: Icons.support_agent_outlined,
              title: 'Customer Support',
              subtitle: 'Contact Tripnix helpline 24/7',
            ),
            _tile(
              icon: Icons.info_outline,
              title: 'About Tripnix',
              subtitle: 'App version 1.0.0',
            ),
            const SizedBox(height: 6),
            SizedBox(
              width: double.infinity,
              height: 50,
              child: OutlinedButton.icon(
                onPressed: _signOut,
                icon: const Icon(Icons.logout, size: 19),
                label: const Text('Sign Out',
                    style: TextStyle(fontWeight: FontWeight.bold)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: AppColors.red,
                  side: const BorderSide(color: AppColors.red),
                  shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _tile({
    required IconData icon,
    required String title,
    required String subtitle,
    VoidCallback? onTap,
  }) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: ListTile(
        leading: Icon(icon, color: AppColors.red),
        title: Text(title,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle,
            style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}

class _MembershipChip extends StatelessWidget {
  const _MembershipChip({required this.session});

  final AgencySession session;

  @override
  Widget build(BuildContext context) {
    final active = session.hasActiveMembership;
    final label = session.isSuperAdmin
        ? 'DEVELOPER'
        : active
            ? 'MEMBER · ${session.platform?['daysLeft']} DAYS LEFT'
            : 'MEMBERSHIP EXPIRED';

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
      decoration: BoxDecoration(
        color: active
            ? Colors.green.withValues(alpha: 0.12)
            : AppColors.red.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 9.5,
          fontWeight: FontWeight.w900,
          letterSpacing: 0.5,
          color: active ? Colors.green.shade800 : AppColors.red,
        ),
      ),
    );
  }
}
