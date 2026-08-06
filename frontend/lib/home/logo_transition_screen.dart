import 'package:flutter/material.dart';
import 'vehicle_showcase_screen.dart';
import 'widgets/tripnix_logo.dart';

/// Shown after an agency signs in or activates its membership: the logo on a
/// white background, then the app opens.
class LogoTransitionScreen extends StatefulWidget {
  const LogoTransitionScreen({super.key});

  @override
  State<LogoTransitionScreen> createState() => _LogoTransitionScreenState();
}

class _LogoTransitionScreenState extends State<LogoTransitionScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<double> _scale;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    );
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeIn);
    _scale = Tween<double>(begin: 0.92, end: 1.0)
        .animate(CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic));
    _controller.forward();

    Future.delayed(const Duration(milliseconds: 2600), _open);
  }

  void _open() {
    if (!mounted) return;
    Navigator.of(context).pushAndRemoveUntil(
      PageRouteBuilder(
        transitionDuration: const Duration(milliseconds: 1100),
        pageBuilder: (context, animation, secondaryAnimation) =>
            const VehicleShowcaseScreen(),
        transitionsBuilder: (context, animation, secondaryAnimation, child) =>
            FadeTransition(opacity: animation, child: child),
      ),
      (route) => false,
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
      // The logo fills the screen, then the app fades up underneath it.
      body: SizedBox.expand(
        child: FadeTransition(
          opacity: _fade,
          child: ScaleTransition(
            scale: _scale,
            child: const Padding(
              padding: EdgeInsets.all(24),
              child: TripnixLogo(
                width: double.infinity,
                height: double.infinity,
              ),
            ),
          ),
        ),
      ),
    );
  }
}
