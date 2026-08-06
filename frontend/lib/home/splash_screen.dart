import 'package:flutter/material.dart';
import '../agency/agency_gate_screen.dart';
import '../agency/agency_session.dart';
import 'vehicle_showcase_screen.dart';
import 'widgets/tripnix_logo.dart';

/// Full white launch screen showing the Tripnix logo, then routes into the app.
class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _scale = Tween<double>(begin: 0.85, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutBack));
    _controller.forward();

    _bootstrap();
  }

  /// Restores any saved agency session while the splash animates, then routes
  /// to the showcase or the locked gate depending on the platform membership.
  ///
  /// A restore failure must never strand the user on the splash — we fall
  /// through to the gate, where they can sign in again.
  Future<void> _bootstrap() async {
    final splashHold = Future<void>.delayed(const Duration(milliseconds: 2200));
    try {
      await AgencySession.instance.restore();
    } catch (e) {
      debugPrint('Tripnix: session restore failed, showing gate — $e');
    }
    await splashHold;
    if (!mounted) return;

    final canBrowse = AgencySession.instance.canBrowse;
    Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 500),
        pageBuilder: (context, animation, secondaryAnimation) =>
            canBrowse ? const VehicleShowcaseScreen() : const AgencyGateScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: const TripnixLogo(width: 200),
          ),
        ),
      ),
    );
  }
}
