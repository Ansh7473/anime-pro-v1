import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../services/auth_provider.dart';
import '../../services/api_service.dart';
import '../../core/tv_focusable.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  Future<void> _handleLogin() async {
    final auth = context.read<AuthProvider>();
    final api = context.read<ApiService>();

    if (_emailController.text.isEmpty || _passwordController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter email and password')),
      );
      return;
    }

    auth.setLoading(true);
    try {
      final response = await api.login(_emailController.text, _passwordController.text);
      
      // Expected backend structure: { "data": { "token": "...", "user": { ... } } }
      // Or flattened: { "token": "...", "user": { ... } }
      final data = response['data'] ?? response;
      
      final String? token = data['token'];
      final Map<String, dynamic>? user = data['user'];

      if (token != null && user != null) {
        auth.setAuth(token, user);
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text('Welcome back, ${user['name']}')),
          );
          Navigator.pop(context); // Return to previous screen (Settings/Home)
        }
      } else {
        throw Exception('Invalid response from server');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login Failed: ${e.toString().contains('401') ? 'Invalid credentials' : 'Check connection'}')),
        );
      }
    } finally {
      auth.setLoading(false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Stack(
        children: [
          // Background Glow
          Container(
            decoration: const BoxDecoration(
              gradient: RadialGradient(
                center: Alignment(0.8, -0.8),
                radius: 1.5,
                colors: [Color(0xFF2C0707), Colors.black],
              ),
            ),
          ),
          
          // Back Button
          Positioned(
            top: 40,
            left: 40,
            child: TVFocusable(
              onTap: () => Navigator.pop(context),
              child: const Padding(
                padding: EdgeInsets.all(8.0),
                child: Row(
                  children: [
                    Icon(Icons.arrow_back, color: Colors.white),
                    SizedBox(width: 8),
                    Text('BACK', style: TextStyle(fontWeight: FontWeight.bold)),
                  ],
                ),
              ),
            ),
          ),

          Center(
            child: SizedBox(
              width: 450,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'AnimePro',
                    style: TextStyle(
                      fontSize: 56,
                      fontWeight: FontWeight.w900,
                      color: Colors.red,
                      letterSpacing: -2,
                    ),
                  ),
                  const SizedBox(height: 8),
                  const Text(
                    'LOGIN TO SYNC YOUR WATCHLIST',
                    style: TextStyle(color: Colors.white38, fontSize: 14, fontWeight: FontWeight.bold, letterSpacing: 1),
                  ),
                  const SizedBox(height: 48),
                  _buildTextField(_emailController, 'Enter Email', Icons.email),
                  const SizedBox(height: 16),
                  _buildTextField(_passwordController, 'Enter Password', Icons.lock, obscureText: true),
                  const SizedBox(height: 32),
                  Consumer<AuthProvider>(
                    builder: (context, auth, _) {
                      return auth.isLoading
                        ? const CircularProgressIndicator(color: Colors.red)
                        : TVFocusable(
                            autofocus: true,
                            onTap: _handleLogin,
                            child: Container(
                              width: double.infinity,
                              padding: const EdgeInsets.symmetric(vertical: 20),
                              alignment: Alignment.center,
                              decoration: BoxDecoration(
                                color: Colors.red,
                                borderRadius: BorderRadius.circular(8),
                                boxShadow: [BoxShadow(color: Colors.red.withOpacity(0.3), blurRadius: 20)],
                              ),
                              child: const Text(
                                'LOGIN',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
                              ),
                            ),
                          );
                    },
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String hint, IconData icon, {bool obscureText = false}) {
    return Focus(
      child: Builder(
        builder: (context) {
          final hasFocus = Focus.of(context).hasFocus;
          return Container(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            decoration: BoxDecoration(
              color: hasFocus ? Colors.white.withOpacity(0.12) : Colors.white.withOpacity(0.06),
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: hasFocus ? Colors.red : Colors.white10),
            ),
            child: TextField(
              controller: controller,
              obscureText: obscureText,
              style: const TextStyle(color: Colors.white, fontSize: 18),
              decoration: InputDecoration(
                icon: Icon(icon, color: hasFocus ? Colors.red : Colors.grey),
                hintText: hint,
                hintStyle: const TextStyle(color: Colors.white24),
                border: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 18),
              ),
            ),
          );
        }
      ),
    );
  }
}
