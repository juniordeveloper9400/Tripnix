import 'package:flutter/material.dart';

import '../config/app_config.dart';
import 'admin_view_stub.dart' if (dart.library.html) 'admin_view_web.dart';

class AdminScreen extends StatelessWidget {
  const AdminScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // localhost:3000/admin in development, /admin/ on the deployed site.
    return buildAdminView(AppConfig.adminUrl);
  }
}
