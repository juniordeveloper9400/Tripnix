import 'package:flutter/material.dart';
import '../../config/app_config.dart';

/// The Tripnix wordmark, served from the backend with an asset fallback and a
/// final icon fallback so it never renders as a broken image.
class TripnixLogo extends StatelessWidget {
  const TripnixLogo({super.key, this.width, this.height});

  final double? width;
  final double? height;

  @override
  Widget build(BuildContext context) {
    return Image.network(
      '${AppConfig.publicBase}/tripnix.png',
      width: width,
      height: height,
      fit: BoxFit.contain,
      errorBuilder: (context, error, stack) => Image.asset(
        'assets/images/tripnix.png',
        width: width,
        height: height,
        fit: BoxFit.contain,
        errorBuilder: (context, error, stack) => Icon(
          Icons.airport_shuttle,
          size: (height ?? width ?? 120) * 0.75,
          color: Colors.black,
        ),
      ),
    );
  }
}
