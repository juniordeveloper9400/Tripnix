import 'package:flutter/material.dart';
import '../home/logo_transition_screen.dart';
import '../home/widgets/tripnix_logo.dart';
import '../theme/app_colors.dart';
import 'agency_membership_screen.dart';
import 'agency_register_screen.dart';
import 'agency_session.dart';

/// The locked front door. Tripnix only opens to travel agencies that have
/// registered and paid the monthly platform fee. Signing in comes first for
/// returning agencies; registering sits below it for new ones.
class AgencyGateScreen extends StatefulWidget {
  const AgencyGateScreen({super.key});

  @override
  State<AgencyGateScreen> createState() => _AgencyGateScreenState();
}

class _AgencyGateScreenState extends State<AgencyGateScreen> {
  final _userCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  bool _submitting = false;
  bool _obscure = true;
  String? _error;

  @override
  void dispose() {
    _userCtrl.dispose();
    _passCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  /// Goes through the white logo screen rather than jumping straight to the
  /// showcase.
  void _enterApp() {
    Navigator.of(context).pushAndRemoveUntil(
      MaterialPageRoute(builder: (_) => const LogoTransitionScreen()),
      (route) => false,
    );
  }

  Future<void> _openRegister() async {
    await Navigator.of(
      context,
    ).push(MaterialPageRoute(builder: (_) => const AgencyRegisterScreen()));
    // Paying the fee inside that flow unlocks the app.
    if (mounted && AgencySession.instance.canBrowse) _enterApp();
  }

  Future<void> _signIn() async {
    if (_userCtrl.text.trim().isEmpty || _passCtrl.text.trim().isEmpty) {
      setState(() => _error = 'Enter your username and password');
      return;
    }

    setState(() {
      _submitting = true;
      _error = null;
    });

    final session = AgencySession.instance;
    try {
      await session.signIn(
        username: _userCtrl.text.trim(),
        password: _passCtrl.text.trim(),
      );
      if (!mounted) return;

      if (session.canBrowse) {
        _enterApp();
      } else {
        // Signed in but the platform fee is unpaid — go pay it first.
        await Navigator.of(context).push(
          MaterialPageRoute(
            builder: (_) =>
                AgencyMembershipScreen(operatorName: session.operatorName),
          ),
        );
        if (mounted && session.canBrowse) _enterApp();
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _error = e.toString().replaceFirst('Exception: ', ''));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      // The scroll view spans the full width so its scrollbar sits against the
      // right edge of the screen, not against the 440px card.
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, viewport) => Scrollbar(
            controller: _scrollCtrl,
            thumbVisibility: true,
            child: SingleChildScrollView(
              controller: _scrollCtrl,
              padding: const EdgeInsets.symmetric(horizontal: 22, vertical: 28),
              child: ConstrainedBox(
                // Keeps the card vertically centred until the content outgrows
                // the viewport, then it scrolls normally.
                constraints: BoxConstraints(minHeight: viewport.maxHeight - 56),
                child: Center(
                  child: ConstrainedBox(
                    constraints: const BoxConstraints(maxWidth: 440),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        const Center(child: TripnixLogo(width: 170)),
                        const SizedBox(height: 16),
                        Text(
                          'List your buses and cars, browse fleets from other travel '
                          'agencies, and manage every booking in one place.',
                          textAlign: TextAlign.center,
                          style: TextStyle(
                            fontSize: 13,
                            height: 1.5,
                            color: Colors.grey[600],
                          ),
                        ),
                        const SizedBox(height: 24),

                        // Sign in — the first thing an agency sees on opening the site.
                        Container(
                          padding: const EdgeInsets.all(20),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: Colors.grey.shade200),
                            boxShadow: const [
                              BoxShadow(
                                color: Colors.black12,
                                blurRadius: 12,
                                offset: Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                'Agency Sign In',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.w800,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                'Use the credentials you created when registering.',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Colors.grey[600],
                                ),
                              ),
                              const SizedBox(height: 16),
                              TextField(
                                controller: _userCtrl,
                                textInputAction: TextInputAction.next,
                                decoration: _decoration(
                                  label: 'Username',
                                  icon: Icons.badge_outlined,
                                ),
                              ),
                              const SizedBox(height: 12),
                              TextField(
                                controller: _passCtrl,
                                obscureText: _obscure,
                                onSubmitted: (_) => _signIn(),
                                decoration: _decoration(
                                  label: 'Password',
                                  icon: Icons.lock_outline,
                                  suffix: IconButton(
                                    icon: Icon(
                                      _obscure
                                          ? Icons.visibility_off_outlined
                                          : Icons.visibility_outlined,
                                      size: 19,
                                      color: Colors.grey,
                                    ),
                                    onPressed: () =>
                                        setState(() => _obscure = !_obscure),
                                  ),
                                ),
                              ),
                              if (_error != null) ...[
                                const SizedBox(height: 12),
                                Container(
                                  padding: const EdgeInsets.all(11),
                                  decoration: BoxDecoration(
                                    color: AppColors.red.withValues(
                                      alpha: 0.08,
                                    ),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: AppColors.red.withValues(
                                        alpha: 0.3,
                                      ),
                                    ),
                                  ),
                                  child: Text(
                                    _error!,
                                    style: const TextStyle(
                                      color: AppColors.red,
                                      fontSize: 12.5,
                                    ),
                                  ),
                                ),
                              ],
                              const SizedBox(height: 16),
                              SizedBox(
                                height: 50,
                                child: ElevatedButton(
                                  onPressed: _submitting ? null : _signIn,
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.red,
                                    foregroundColor: Colors.white,
                                    disabledBackgroundColor:
                                        Colors.grey.shade300,
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: _submitting
                                      ? const SizedBox(
                                          width: 21,
                                          height: 21,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.3,
                                            color: Colors.white,
                                          ),
                                        )
                                      : const Text(
                                          'Sign In',
                                          style: TextStyle(
                                            fontSize: 15,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                ),
                              ),
                            ],
                          ),
                        ),

                        const SizedBox(height: 24),
                        Row(
                          children: [
                            Expanded(
                              child: Divider(color: Colors.grey.shade300),
                            ),
                            Padding(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 12,
                              ),
                              child: Text(
                                'NEW HERE?',
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.w800,
                                  color: Colors.grey[500],
                                  letterSpacing: 0.8,
                                ),
                              ),
                            ),
                            Expanded(
                              child: Divider(color: Colors.grey.shade300),
                            ),
                          ],
                        ),
                        const SizedBox(height: 18),

                        _RegisterCard(onTap: _openRegister),

                        const SizedBox(height: 14),
                        Center(
                          child: TextButton(
                            onPressed: () =>
                                Navigator.of(context).pushNamed('/admin'),
                            child: Text(
                              'Go to Admin Portal',
                              style: TextStyle(
                                color: Colors.grey[600],
                                fontSize: 12.5,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  InputDecoration _decoration({
    required String label,
    required IconData icon,
    Widget? suffix,
  }) {
    return InputDecoration(
      labelText: label,
      prefixIcon: Icon(icon, color: AppColors.red, size: 20),
      suffixIcon: suffix,
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
    );
  }
}

/// Entry point for agencies without an account. Deliberately shows no prices —
/// fees are only revealed at the platform fee registration step, after sign in.
class _RegisterCard extends StatelessWidget {
  const _RegisterCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(22),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(22),
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [AppColors.black, Color(0xFF2B2B2B)],
            ),
            boxShadow: const [
              BoxShadow(
                color: Colors.black26,
                blurRadius: 16,
                offset: Offset(0, 6),
              ),
            ],
          ),
          padding: const EdgeInsets.all(22),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    width: 48,
                    height: 48,
                    decoration: BoxDecoration(
                      color: AppColors.red,
                      borderRadius: BorderRadius.circular(15),
                    ),
                    child: const Icon(
                      Icons.storefront,
                      color: Colors.white,
                      size: 25,
                    ),
                  ),
                  const SizedBox(width: 14),
                  const Expanded(
                    child: Text(
                      'Register your travel agency',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 17,
                        fontWeight: FontWeight.w900,
                        height: 1.25,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 18),
              ...const [
                'Browse buses and cars from every other agency',
                'List your own fleet in the traveller app',
                'Fleet dashboard, scheduling and bookings',
              ].map(
                (line) => Padding(
                  padding: const EdgeInsets.only(bottom: 7),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Icon(
                        Icons.check_circle,
                        color: Colors.greenAccent,
                        size: 15,
                      ),
                      const SizedBox(width: 9),
                      Expanded(
                        child: Text(
                          line,
                          style: const TextStyle(
                            color: Colors.white70,
                            fontSize: 12.5,
                            height: 1.35,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.symmetric(vertical: 14),
                decoration: BoxDecoration(
                  color: AppColors.red,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Text(
                      'Get Started',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 15,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    SizedBox(width: 8),
                    Icon(Icons.arrow_forward, color: Colors.white, size: 18),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
