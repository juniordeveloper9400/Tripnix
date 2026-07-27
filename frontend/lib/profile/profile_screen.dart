import 'package:flutter/material.dart';
import '../theme/app_colors.dart';

/// Profile tab — shown from the bottom navigation on the home screen.
class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Profile', style: TextStyle(fontWeight: FontWeight.bold)),
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
                  BoxShadow(color: Colors.black12, blurRadius: 8, offset: Offset(0, 2)),
                ],
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 32,
                    backgroundColor: AppColors.red.withValues(alpha: 0.1),
                    child: const Icon(Icons.person, size: 36, color: AppColors.red),
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Traveler Guest',
                          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                        ),
                        SizedBox(height: 4),
                        Text(
                          '+91 98765 43210',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                        Text(
                          'guest@tripnix.com',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),
            _buildProfileMenuTile(
              context: context,
              icon: Icons.admin_panel_settings_outlined,
              title: 'Owner Admin Portal',
              subtitle: 'Manage bus fleet, bookings & dates (/admin)',
              onTap: () {
                Navigator.of(context).pushNamed('/admin');
              },
            ),
            _buildProfileMenuTile(
              context: context,
              icon: Icons.bookmark_outline,
              title: 'My Bookings History',
              subtitle: 'View past and active rental orders',
            ),
            _buildProfileMenuTile(
              context: context,
              icon: Icons.notifications_none_outlined,
              title: 'Notifications',
              subtitle: 'Alerts and booking status updates',
            ),
            _buildProfileMenuTile(
              context: context,
              icon: Icons.support_agent_outlined,
              title: 'Customer Support',
              subtitle: 'Contact Tripnix helpline 24/7',
            ),
            _buildProfileMenuTile(
              context: context,
              icon: Icons.info_outline,
              title: 'About Tripnix',
              subtitle: 'App version 1.0.0',
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileMenuTile({
    required BuildContext context,
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
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text(subtitle, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: Colors.grey),
        onTap: onTap,
      ),
    );
  }
}
