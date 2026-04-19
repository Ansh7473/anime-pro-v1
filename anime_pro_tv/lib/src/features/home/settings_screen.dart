import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../core/tv_focusable.dart';
import '../auth/login_screen.dart';

class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();

    return SingleChildScrollView(
      child: Padding(
        padding: const EdgeInsets.all(48.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'SETTINGS',
              style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, letterSpacing: 1.5),
            ),
            const SizedBox(height: 48),
            
            // User Profile Section
            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.05),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white10),
              ),
              child: Row(
                children: [
                  CircleAvatar(
                    radius: 40,
                    backgroundColor: Colors.red.withOpacity(0.2),
                    child: Icon(Icons.person, size: 40, color: auth.isAuthenticated ? Colors.red : Colors.grey),
                  ),
                  const SizedBox(width: 24),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          auth.isAuthenticated ? (auth.user?['name'] ?? 'Authorized User') : 'Guest Session',
                          style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          auth.isAuthenticated ? (auth.user?['email'] ?? 'User Session') : 'Sign in to sync your watchlist and favorites',
                          style: const TextStyle(color: Colors.white54, fontSize: 16),
                        ),
                      ],
                    ),
                  ),
                  if (!auth.isAuthenticated)
                    TVFocusable(
                      autofocus: true,
                      onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => const LoginScreen())),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.red,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('LOGIN', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    )
                  else
                    TVFocusable(
                      onTap: () => _showLogoutDialog(context, auth),
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.white10,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Text('LOGOUT', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                    ),
                ],
              ),
            ),
            
            const SizedBox(height: 48),
            const Text('APPLICATION', style: TextStyle(color: Colors.white38, fontWeight: FontWeight.bold, letterSpacing: 1)),
            const SizedBox(height: 16),
            _buildSettingsItem(Icons.info_outline, 'Version', '1.1.0 (Stable)'),
            _buildSettingsItem(Icons.storage_outlined, 'Backend', 'Go-API (Vercel)'),
            _buildSettingsItem(Icons.hd_outlined, 'Streaming', 'Multiplex-HLS (Enabled)'),
          ],
        ),
      ),
    );
  }

  void _showLogoutDialog(BuildContext context, AuthProvider auth) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: const Color(0xFF1A1A1A),
        title: const Text('Logout?'),
        content: const Text('Are you sure you want to end your session? Your favorites will still be saved on our servers.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL', style: TextStyle(color: Colors.white54))),
          TextButton(
            onPressed: () {
              auth.logout();
              Navigator.pop(context);
            }, 
            child: const Text('LOGOUT', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold))
          ),
        ],
      ),
    );
  }

  Widget _buildSettingsItem(IconData icon, String title, String value) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.02),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, size: 20, color: Colors.white38),
          const SizedBox(width: 16),
          Text(title, style: const TextStyle(fontSize: 16)),
          const Spacer(),
          Text(value, style: const TextStyle(color: Colors.white38)),
        ],
      ),
    );
  }
}
