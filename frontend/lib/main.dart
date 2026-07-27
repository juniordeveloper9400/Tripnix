import 'package:flutter/material.dart';

import 'admin/admin_screen.dart';
import 'home/splash_screen.dart';
import 'theme/app_colors.dart';

void main() {
  runApp(const TripnixApp());
}

class TripnixApp extends StatelessWidget {
  const TripnixApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Tripnix',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.red,
          primary: AppColors.red,
          secondary: AppColors.yellow,
          surface: Colors.white,
        ),
        scaffoldBackgroundColor: AppColors.background,
        fontFamily: 'Roboto',
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: AppColors.yellow,
          foregroundColor: AppColors.black,
        ),
      ),
      initialRoute: '/',
      routes: {
        '/': (context) => const SplashScreen(),
        '/admin': (context) => const AdminScreen(),
      },
      onGenerateRoute: (settings) {
        if (settings.name == '/admin' || settings.name == 'admin') {
          return MaterialPageRoute(
            builder: (_) => const AdminScreen(),
            settings: settings,
          );
        }
        return null;
      },
    );
  }
}
