import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../core/device/device_info.dart';
import '../../core/theme/app_colors.dart';
import 'auth_controller.dart';

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _name = TextEditingController();
  bool _isRegister = false;
  String? _error;

  final FocusNode _nameNode = FocusNode(debugLabel: 'loginName');
  final FocusNode _emailNode = FocusNode(debugLabel: 'loginEmail');
  final FocusNode _passwordNode = FocusNode(debugLabel: 'loginPassword');
  final FocusNode _submitNode = FocusNode(debugLabel: 'loginSubmit');
  final FocusNode _toggleNode = FocusNode(debugLabel: 'loginToggle');
  final FocusNode _backNode = FocusNode(debugLabel: 'loginBack');
  final FocusScopeNode _loginScope = FocusScopeNode(debugLabel: 'loginScope');

  @override
  void initState() {
    super.initState();
    _loginScope.addListener(_handleFocusChange);

    // Setup explicit directional D-pad navigation traversal
    _backNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          if (_isRegister) {
            _nameNode.requestFocus();
          } else {
            _emailNode.requestFocus();
          }
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    _nameNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          _emailNode.requestFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          _backNode.requestFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    _emailNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          _passwordNode.requestFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          if (_isRegister) {
            _nameNode.requestFocus();
          } else {
            _backNode.requestFocus();
          }
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    _passwordNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          _submitNode.requestFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          _emailNode.requestFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    _submitNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          _toggleNode.requestFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          _passwordNode.requestFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    _toggleNode.onKeyEvent = (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          _submitNode.requestFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };

    // Seed focus on first build
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted && DeviceInfo.isTv(context)) {
        if (_isRegister) {
          _nameNode.requestFocus();
        } else {
          _emailNode.requestFocus();
        }
      }
    });
  }

  void _handleFocusChange() {
    if (!mounted || !DeviceInfo.isTv(context)) return;
    if (_loginScope.hasFocus && _loginScope.focusedChild == null) {
      if (_isRegister) {
        _nameNode.requestFocus();
      } else {
        _emailNode.requestFocus();
      }
    }
  }

  @override
  void dispose() {
    _nameNode.dispose();
    _emailNode.dispose();
    _passwordNode.dispose();
    _submitNode.dispose();
    _toggleNode.dispose();
    _backNode.dispose();
    _loginScope.removeListener(_handleFocusChange);
    _loginScope.dispose();
    _email.dispose();
    _password.dispose();
    _name.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final emailText = _email.text.trim();
    final passwordText = _password.text;
    final nameText = _name.text.trim();

    if (_isRegister && nameText.isEmpty) {
      setState(() => _error = 'Name cannot be empty');
      return;
    }
    if (emailText.isEmpty) {
      setState(() => _error = 'Email cannot be empty');
      return;
    }
    if (passwordText.isEmpty) {
      setState(() => _error = 'Password cannot be empty');
      return;
    }

    setState(() => _error = null);
    final auth = ref.read(authProvider.notifier);
    try {
      if (_isRegister) {
        await auth.register(emailText, passwordText, nameText);
      } else {
        await auth.login(emailText, passwordText);
      }
      if (mounted && ref.read(authProvider).isAuthenticated) {
        if (context.canPop()) {
          context.pop();
        } else {
          context.go('/');
        }
      }
    } catch (e) {
      setState(() => _error = e.toString());
    }
  }

  @override
  Widget build(BuildContext context) {
    final loading = ref.watch(authProvider).loading;
    final isTv = DeviceInfo.isTv(context);

    return Scaffold(
      backgroundColor: AppColors.bg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: isTv
            ? Padding(
                padding: const EdgeInsets.only(
                  left: 16.0,
                  top: 8.0,
                  bottom: 8.0,
                ),
                child: _TvAppBarBackButton(
                  focusNode: _backNode,
                  onPressed: () =>
                      context.canPop() ? context.pop() : context.go('/'),
                ),
              )
            : null,
        title: Text(_isRegister ? 'Create Account' : 'Sign In'),
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: EdgeInsets.all(isTv ? 48 : 24),
          child: FocusScope(
            node: _loginScope,
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: isTv
                  ? const EdgeInsets.all(36)
                  : const EdgeInsets.all(24),
              decoration: isTv
                  ? BoxDecoration(
                      color: AppColors.card,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: Colors.white.withValues(alpha: 0.05),
                      ),
                    )
                  : null,
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  RichText(
                    textAlign: TextAlign.center,
                    text: const TextSpan(
                      style: TextStyle(
                        fontSize: 32,
                        fontWeight: FontWeight.w800,
                        letterSpacing: -0.5,
                      ),
                      children: [
                        TextSpan(
                          text: 'Watch',
                          style: TextStyle(color: AppColors.text),
                        ),
                        TextSpan(
                          text: 'Animez',
                          style: TextStyle(color: AppColors.red),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 32),
                  if (_isRegister) ...[
                    _TvTextField(
                      controller: _name,
                      focusNode: _nameNode,
                      hintText: 'Name',
                      autofocus: true,
                    ),
                    const SizedBox(height: 14),
                  ],
                  _TvTextField(
                    controller: _email,
                    focusNode: _emailNode,
                    hintText: 'Email',
                    keyboardType: TextInputType.emailAddress,
                    autofocus: !_isRegister,
                    textInputAction: TextInputAction.next,
                    onSubmitted: (_) => _passwordNode.requestFocus(),
                  ),
                  const SizedBox(height: 14),
                  _TvTextField(
                    controller: _password,
                    focusNode: _passwordNode,
                    hintText: 'Password',
                    obscureText: true,
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _submit(),
                  ),
                  const SizedBox(height: 14),
                  Text(
                    _error ?? '',
                    textAlign: TextAlign.center,
                    style: TextStyle(
                      color: _error != null ? Colors.amber : Colors.transparent,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 24),
                  _TvButton(
                    focusNode: _submitNode,
                    onPressed: loading ? null : _submit,
                    child: loading
                        ? const SizedBox(
                            height: 20,
                            width: 20,
                            child: CircularProgressIndicator(
                              strokeWidth: 2.5,
                              color: Colors.white,
                            ),
                          )
                        : Text(_isRegister ? 'Create Account' : 'Sign In'),
                  ),
                  const SizedBox(height: 14),
                  _TvButton(
                    focusNode: _toggleNode,
                    isTextButton: true,
                    onPressed: () => setState(() => _isRegister = !_isRegister),
                    child: Text(
                      _isRegister
                          ? 'Have an account? Sign in'
                          : "No account? Create one",
                      style: const TextStyle(color: AppColors.textMuted),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _TvTextField extends StatefulWidget {
  const _TvTextField({
    required this.controller,
    required this.hintText,
    this.obscureText = false,
    this.keyboardType = TextInputType.text,
    this.autofocus = false,
    this.focusNode,
    this.textInputAction,
    this.onSubmitted,
  });

  final TextEditingController controller;
  final String hintText;
  final bool obscureText;
  final TextInputType keyboardType;
  final bool autofocus;
  final FocusNode? focusNode;
  final TextInputAction? textInputAction;
  final ValueChanged<String>? onSubmitted;

  @override
  State<_TvTextField> createState() => _TvTextFieldState();
}

class _TvTextFieldState extends State<_TvTextField> {
  FocusNode? _localFocusNode;
  FocusNode get _effectiveFocusNode =>
      widget.focusNode ?? (_localFocusNode ??= FocusNode());
  bool _focused = false;

  @override
  void initState() {
    super.initState();
    _effectiveFocusNode.addListener(_onFocusChange);
    _effectiveFocusNode.onKeyEvent ??= (node, event) {
      if (event is KeyDownEvent || event is KeyRepeatEvent) {
        if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
          node.nextFocus();
          return KeyEventResult.handled;
        } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
          node.previousFocus();
          return KeyEventResult.handled;
        }
      }
      return KeyEventResult.ignored;
    };
  }

  void _onFocusChange() {
    setState(() => _focused = _effectiveFocusNode.hasFocus);
  }

  @override
  void didUpdateWidget(covariant _TvTextField oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.focusNode != oldWidget.focusNode) {
      oldWidget.focusNode?.removeListener(_onFocusChange);
      _effectiveFocusNode.addListener(_onFocusChange);
      _effectiveFocusNode.onKeyEvent ??= (node, event) {
        if (event is KeyDownEvent || event is KeyRepeatEvent) {
          if (event.logicalKey == LogicalKeyboardKey.arrowDown) {
            node.nextFocus();
            return KeyEventResult.handled;
          } else if (event.logicalKey == LogicalKeyboardKey.arrowUp) {
            node.previousFocus();
            return KeyEventResult.handled;
          }
        }
        return KeyEventResult.ignored;
      };
    }
  }

  @override
  void dispose() {
    _effectiveFocusNode.removeListener(_onFocusChange);
    _localFocusNode?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      decoration: BoxDecoration(
        color: AppColors.bgLite,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(
          color: _focused ? Colors.white : Colors.transparent,
          width: 2.2,
        ),
        boxShadow: _focused
            ? [
                BoxShadow(
                  color: Colors.white.withValues(alpha: 0.15),
                  blurRadius: 10,
                  spreadRadius: 1,
                ),
              ]
            : null,
      ),
      child: TextField(
        focusNode: _effectiveFocusNode,
        autofocus: widget.autofocus,
        controller: widget.controller,
        obscureText: widget.obscureText,
        keyboardType: widget.keyboardType,
        textInputAction: widget.textInputAction,
        onSubmitted: widget.onSubmitted,
        style: const TextStyle(color: AppColors.text, fontSize: 16),
        decoration: InputDecoration(
          hintText: widget.hintText,
          hintStyle: const TextStyle(color: AppColors.textMuted),
          contentPadding: const EdgeInsets.symmetric(
            horizontal: 16,
            vertical: 14,
          ),
          border: InputBorder.none,
          enabledBorder: InputBorder.none,
          focusedBorder: InputBorder.none,
        ),
      ),
    );
  }
}

class _TvButton extends StatefulWidget {
  const _TvButton({
    required this.onPressed,
    required this.child,
    this.isTextButton = false,
    this.focusNode,
  });

  final VoidCallback? onPressed;
  final Widget child;
  final bool isTextButton;
  final FocusNode? focusNode;

  @override
  State<_TvButton> createState() => _TvButtonState();
}

class _TvButtonState extends State<_TvButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    final enabled = widget.onPressed != null;

    if (widget.isTextButton) {
      return FocusableActionDetector(
        focusNode: widget.focusNode,
        onFocusChange: (v) => setState(() => _focused = v),
        shortcuts: const {
          SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
          SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
        },
        actions: {
          ActivateIntent: CallbackAction<ActivateIntent>(
            onInvoke: (_) {
              if (enabled) widget.onPressed!();
              return null;
            },
          ),
        },
        child: InkWell(
          onTap: widget.onPressed,
          borderRadius: BorderRadius.circular(10),
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(vertical: 10),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: _focused ? Colors.white10 : Colors.transparent,
              borderRadius: BorderRadius.circular(10),
              border: Border.all(
                color: _focused ? Colors.white : Colors.transparent,
                width: 1.8,
              ),
            ),
            child: widget.child,
          ),
        ),
      );
    }

    return FocusableActionDetector(
      focusNode: widget.focusNode,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            if (enabled) widget.onPressed!();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onPressed,
        borderRadius: BorderRadius.circular(12),
        child: AnimatedScale(
          scale: _focused ? 1.03 : 1.0,
          duration: const Duration(milliseconds: 150),
          curve: Curves.easeOut,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 150),
            padding: const EdgeInsets.symmetric(vertical: 14),
            alignment: Alignment.center,
            decoration: BoxDecoration(
              color: enabled
                  ? (_focused ? Colors.white : Colors.white24)
                  : Colors.grey.shade800,
              borderRadius: BorderRadius.circular(10),
              boxShadow: _focused
                  ? [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                      BoxShadow(
                        color: Colors.white.withValues(alpha: 0.15),
                        blurRadius: 14,
                        spreadRadius: 1,
                      ),
                    ]
                  : null,
            ),
            child: DefaultTextStyle.merge(
              style: TextStyle(
                color: _focused ? Colors.black : Colors.white,
                fontWeight: FontWeight.w700,
                fontSize: 16,
              ),
              child: widget.child,
            ),
          ),
        ),
      ),
    );
  }
}

class _TvAppBarBackButton extends StatefulWidget {
  const _TvAppBarBackButton({required this.onPressed, this.focusNode});

  final VoidCallback onPressed;
  final FocusNode? focusNode;

  @override
  State<_TvAppBarBackButton> createState() => _TvAppBarBackButtonState();
}

class _TvAppBarBackButtonState extends State<_TvAppBarBackButton> {
  bool _focused = false;

  @override
  Widget build(BuildContext context) {
    return FocusableActionDetector(
      focusNode: widget.focusNode,
      onFocusChange: (v) => setState(() => _focused = v),
      shortcuts: const {
        SingleActivator(LogicalKeyboardKey.select): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.enter): ActivateIntent(),
        SingleActivator(LogicalKeyboardKey.gameButtonA): ActivateIntent(),
      },
      actions: {
        ActivateIntent: CallbackAction<ActivateIntent>(
          onInvoke: (_) {
            widget.onPressed();
            return null;
          },
        ),
      },
      child: InkWell(
        onTap: widget.onPressed,
        borderRadius: BorderRadius.circular(20),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 150),
          decoration: BoxDecoration(
            color: _focused
                ? Colors.white
                : Colors.white.withValues(alpha: 0.08),
            shape: BoxShape.circle,
            border: Border.all(
              color: _focused ? Colors.white : Colors.transparent,
              width: 2,
            ),
          ),
          child: Icon(
            Icons.arrow_back,
            color: _focused ? Colors.black : Colors.white,
            size: 20,
          ),
        ),
      ),
    );
  }
}
