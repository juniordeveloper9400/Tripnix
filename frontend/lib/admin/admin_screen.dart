import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

import 'admin_view_stub.dart' if (dart.library.html) 'admin_view_web.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Dynamic URL based on current web host or local backend
    String adminUrl = 'http://localhost:3000/admin';
    if (kIsWeb) {
      // Use backend running on port 3000
      adminUrl = 'http://localhost:3000/admin';
    }

    return buildAdminView(adminUrl);
  }
}
