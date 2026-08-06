import 'package:flutter/material.dart';
import '../config/app_config.dart';
import '../services/api_service.dart';
import '../theme/app_colors.dart';
import 'agency_membership_screen.dart';
import 'agency_session.dart';

/// Self-serve signup for travel agencies that aren't on Tripnix yet.
///
/// Registering only creates the admin portal login. The agency's buses stay
/// hidden from travellers until it pays the monthly platform fee, and each
/// vehicle needs its own seat-based listing fee on top of that.
class AgencyRegisterScreen extends StatefulWidget {
  const AgencyRegisterScreen({super.key});

  @override
  State<AgencyRegisterScreen> createState() => _AgencyRegisterScreenState();
}

class _AgencyRegisterScreenState extends State<AgencyRegisterScreen> {
  final _formKey = GlobalKey<FormState>();

  final _agencyCtrl = TextEditingController();
  final _ownerCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _usernameCtrl = TextEditingController();
  final _passwordCtrl = TextEditingController();

  bool _submitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
  }

  @override
  void dispose() {
    _agencyCtrl.dispose();
    _ownerCtrl.dispose();
    _phoneCtrl.dispose();
    _emailCtrl.dispose();
    _usernameCtrl.dispose();
    _passwordCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _error = null;
    });

    try {
      final result = await ApiService.instance.registerAgency(
        operatorName: _agencyCtrl.text.trim(),
        ownerName: _ownerCtrl.text.trim(),
        phone: _phoneCtrl.text.trim(),
        email: _emailCtrl.text.trim(),
        username: _usernameCtrl.text.trim(),
        password: _passwordCtrl.text.trim(),
      );

      // Start the session now so paying the fee drops them straight into the
      // app. A failure here isn't fatal — they can still sign in manually.
      try {
        await AgencySession.instance.signIn(
          username: _usernameCtrl.text.trim(),
          password: _passwordCtrl.text.trim(),
        );
      } catch (_) {}

      if (!mounted) return;
      _showSuccessDialog(result);
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  /// Existing agencies renew here too, since the portal shows the platform fee
  /// read-only. Credentials are checked before the membership is revealed.
  Future<void> _openExistingMembership() async {
    final userCtrl = TextEditingController();
    final passCtrl = TextEditingController();
    String? dialogError;
    bool checking = false;

    final agency = await showDialog<String>(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) => AlertDialog(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(18),
          ),
          title: const Text('Agency Sign In', style: TextStyle(fontSize: 18)),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const Text(
                'Enter your portal credentials to view your membership.',
                style: TextStyle(
                  fontSize: 12.5,
                  color: Colors.black54,
                  height: 1.4,
                ),
              ),
              const SizedBox(height: 14),
              TextField(
                controller: userCtrl,
                decoration: const InputDecoration(
                  labelText: 'Username',
                  border: OutlineInputBorder(),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passCtrl,
                obscureText: true,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
              ),
              if (dialogError != null) ...[
                const SizedBox(height: 10),
                Text(
                  dialogError!,
                  style: const TextStyle(color: AppColors.red, fontSize: 12.5),
                ),
              ],
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(dialogContext).pop(),
              child: const Text('Cancel', style: TextStyle(color: Colors.grey)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.red,
                foregroundColor: Colors.white,
              ),
              onPressed: checking
                  ? null
                  : () async {
                      setDialogState(() {
                        checking = true;
                        dialogError = null;
                      });
                      try {
                        final user = await ApiService.instance.loginAgency(
                          username: userCtrl.text.trim(),
                          password: passCtrl.text.trim(),
                        );
                        if (dialogContext.mounted) {
                          Navigator.of(
                            dialogContext,
                          ).pop(user['operatorName'] as String);
                        }
                      } catch (e) {
                        setDialogState(() {
                          checking = false;
                          dialogError = e.toString().replaceFirst(
                            'Exception: ',
                            '',
                          );
                        });
                      }
                    },
              child: checking
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(
                        strokeWidth: 2.2,
                        color: Colors.white,
                      ),
                    )
                  : const Text('Continue'),
            ),
          ],
        ),
      ),
    );

    userCtrl.dispose();
    passCtrl.dispose();

    if (agency == null || !mounted) return;
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => AgencyMembershipScreen(operatorName: agency),
      ),
    );
  }

  void _showSuccessDialog(Map<String, dynamic> result) {
    showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (dialogContext) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(18)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: AppColors.red),
            SizedBox(width: 10),
            Expanded(
              child: Text('Agency Registered', style: TextStyle(fontSize: 18)),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              '${result['operatorName']} now has an admin portal account.',
              style: const TextStyle(fontSize: 14, height: 1.4),
            ),
            const SizedBox(height: 14),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Username: ${result['username']}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'Password: ${_passwordCtrl.text.trim()}',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),
            const Text(
              'Use this same username and password to sign in to the admin '
              'portal. Next step: pay the monthly platform fee to activate your '
              'agency.',
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
              Navigator.of(dialogContext).pop();
              Navigator.of(context).pop();
            },
            child: const Text(
              'Pay later',
              style: TextStyle(color: Colors.grey),
            ),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.red,
              foregroundColor: Colors.white,
            ),
            onPressed: () {
              Navigator.of(dialogContext).pop();
              Navigator.of(context).pushReplacement(
                MaterialPageRoute(
                  builder: (_) => AgencyMembershipScreen(
                    operatorName: result['operatorName'] as String,
                  ),
                ),
              );
            },
            child: const Text('Continue to Payment'),
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
          'Register Your Agency',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: AppColors.black,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 560),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'Agency Details',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  _field(
                    controller: _agencyCtrl,
                    label: 'Travel Agency Name',
                    hint: 'e.g. KPN Travels',
                    icon: Icons.storefront,
                    validator: (v) => (v == null || v.trim().isEmpty)
                        ? 'Agency name is required'
                        : null,
                  ),
                  _field(
                    controller: _ownerCtrl,
                    label: 'Owner Name',
                    hint: 'e.g. Ramesh Kumar',
                    icon: Icons.person_outline,
                  ),
                  _field(
                    controller: _phoneCtrl,
                    label: 'Contact Number',
                    hint: 'e.g. 98765 43210',
                    icon: Icons.phone_outlined,
                    keyboardType: TextInputType.phone,
                  ),
                  _field(
                    controller: _emailCtrl,
                    label: 'Email',
                    hint: 'e.g. owner@kpntravels.com',
                    icon: Icons.mail_outline,
                    keyboardType: TextInputType.emailAddress,
                  ),
                  const SizedBox(height: 14),
                  const Text(
                    'Portal Login',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.w800),
                  ),
                  const SizedBox(height: 12),
                  _field(
                    controller: _usernameCtrl,
                    label: 'Username',
                    hint: 'e.g. kpnadmin',
                    icon: Icons.badge_outlined,
                    validator: (v) => (v == null || v.trim().length < 4)
                        ? 'At least 4 characters'
                        : null,
                  ),
                  _field(
                    controller: _passwordCtrl,
                    label: 'Password',
                    hint: 'Choose a password',
                    icon: Icons.lock_outline,
                    validator: (v) => (v == null || v.trim().length < 6)
                        ? 'At least 6 characters'
                        : null,
                  ),
                  if (_error != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.red.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(
                          color: AppColors.red.withValues(alpha: 0.3),
                        ),
                      ),
                      child: Text(
                        _error!,
                        style: const TextStyle(
                          color: AppColors.red,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(height: 20),
                  SizedBox(
                    width: double.infinity,
                    height: 52,
                    child: ElevatedButton(
                      onPressed: _submitting ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.red,
                        foregroundColor: Colors.white,
                        disabledBackgroundColor: Colors.grey.shade300,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                      child: _submitting
                          ? const SizedBox(
                              width: 22,
                              height: 22,
                              child: CircularProgressIndicator(
                                strokeWidth: 2.4,
                                color: Colors.white,
                              ),
                            )
                          : const Text(
                              'Register Agency',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                    ),
                  ),
                  const SizedBox(height: 14),
                  Center(
                    child: TextButton(
                      onPressed: _openExistingMembership,
                      child: const Text(
                        'Already registered?  View or renew membership',
                        style: TextStyle(
                          color: AppColors.red,
                          fontWeight: FontWeight.w700,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(height: 6),
                  Center(
                    child: Text(
                      AppConfig.adminUrl,
                      style: TextStyle(color: Colors.grey[500], fontSize: 11),
                    ),
                  ),
                  const SizedBox(height: 24),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field({
    required TextEditingController controller,
    required String label,
    required String hint,
    required IconData icon,
    TextInputType? keyboardType,
    String? Function(String?)? validator,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 14),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        validator: validator,
        decoration: InputDecoration(
          labelText: label,
          hintText: hint,
          prefixIcon: Icon(icon, color: AppColors.red, size: 20),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: BorderSide(color: Colors.grey.shade200),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(16),
            borderSide: const BorderSide(color: AppColors.red, width: 1.5),
          ),
        ),
      ),
    );
  }
}
