package com.watchanimez.tv.ui.auth

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.tv.material3.*
import com.watchanimez.tv.ui.theme.AppColors

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
fun AuthScreen(
    onBack: () -> Unit,
    onLoginSuccess: () -> Unit,
    viewModel: AuthViewModel = hiltViewModel(),
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    var isRegisterMode by remember { mutableStateOf(false) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var name by remember { mutableStateOf("") }

    // Navigate on login success
    LaunchedEffect(uiState.isLoggedIn) {
        if (uiState.isLoggedIn) {
            onLoginSuccess()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(AppColors.bg),
        contentAlignment = Alignment.Center,
    ) {
        // Back button top-left
        Surface(
            onClick = onBack,
            shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
            colors = ClickableSurfaceDefaults.colors(
                containerColor = AppColors.card,
                focusedContainerColor = AppColors.cardHover,
            ),
            border = ClickableSurfaceDefaults.border(
                focusedBorder = Border(
                    border = BorderStroke(2.dp, Color.White),
                    shape = RoundedCornerShape(8.dp),
                ),
            ),
            modifier = Modifier
                .align(Alignment.TopStart)
                .padding(24.dp)
                .size(48.dp),
        ) {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("←", color = Color.White, fontSize = 20.sp)
            }
        }

        // Auth card
        Column(
            modifier = Modifier
                .width(400.dp)
                .background(AppColors.card, RoundedCornerShape(16.dp))
                .padding(32.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            // Logo + tagline
            Text(
                "WatchAnimez",
                color = AppColors.red,
                fontSize = 28.sp,
                fontWeight = FontWeight.Bold,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Stream anime on the big screen",
                color = AppColors.textMuted,
                fontSize = 14.sp,
            )

            Spacer(modifier = Modifier.height(32.dp))

            // Mode toggle
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                AuthModeTab(
                    label = "Login",
                    isSelected = !isRegisterMode,
                    onClick = { isRegisterMode = false },
                )
                AuthModeTab(
                    label = "Register",
                    isSelected = isRegisterMode,
                    onClick = { isRegisterMode = true },
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Name field (register only)
            if (isRegisterMode) {
                AuthTextField(
                    value = name,
                    onValueChange = { name = it },
                    placeholder = "Name",
                )
                Spacer(modifier = Modifier.height(12.dp))
            }

            // Email field
            AuthTextField(
                value = email,
                onValueChange = { email = it },
                placeholder = "Email",
            )

            Spacer(modifier = Modifier.height(12.dp))

            // Password field
            AuthTextField(
                value = password,
                onValueChange = { password = it },
                placeholder = "Password",
                isPassword = true,
            )

            // Error message
            uiState.error?.let { error ->
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    text = error,
                    color = AppColors.red,
                    fontSize = 13.sp,
                )
            }

            Spacer(modifier = Modifier.height(24.dp))

            // Submit button
            Surface(
                onClick = {
                    if (!uiState.isLoading) {
                        if (isRegisterMode) {
                            viewModel.register(email, password, name)
                        } else {
                            viewModel.login(email, password)
                        }
                    }
                },
                shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(8.dp)),
                colors = ClickableSurfaceDefaults.colors(
                    containerColor = AppColors.red,
                    focusedContainerColor = AppColors.redHover,
                ),
                border = ClickableSurfaceDefaults.border(
                    focusedBorder = Border(
                        border = BorderStroke(2.dp, Color.White),
                        shape = RoundedCornerShape(8.dp),
                    ),
                ),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 14.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    if (uiState.isLoading) {
                        Text("Loading...", color = Color.White, fontWeight = FontWeight.W600)
                    } else {
                        Text(
                            if (isRegisterMode) "Create Account" else "Sign In",
                            color = Color.White,
                            fontWeight = FontWeight.W600,
                            fontSize = 16.sp,
                        )
                    }
                }
            }
        }
    }
}

@OptIn(ExperimentalTvMaterial3Api::class)
@Composable
private fun AuthModeTab(
    label: String,
    isSelected: Boolean,
    onClick: () -> Unit,
) {
    Surface(
        onClick = onClick,
        shape = ClickableSurfaceDefaults.shape(RoundedCornerShape(20.dp)),
        colors = ClickableSurfaceDefaults.colors(
            containerColor = if (isSelected) AppColors.red else AppColors.bg,
            focusedContainerColor = if (isSelected) AppColors.redHover else AppColors.cardHover,
        ),
        border = ClickableSurfaceDefaults.border(
            focusedBorder = Border(
                border = BorderStroke(2.dp, Color.White),
                shape = RoundedCornerShape(20.dp),
            ),
        ),
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
            color = Color.White,
            fontSize = 14.sp,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.W500,
        )
    }
}

@Composable
private fun AuthTextField(
    value: String,
    onValueChange: (String) -> Unit,
    placeholder: String,
    isPassword: Boolean = false,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(48.dp)
            .background(AppColors.bg, RoundedCornerShape(8.dp))
            .padding(horizontal = 16.dp),
        contentAlignment = Alignment.CenterStart,
    ) {
        if (value.isEmpty()) {
            Text(
                placeholder,
                color = AppColors.textMuted,
                fontSize = 15.sp,
            )
        }
        BasicTextField(
            value = value,
            onValueChange = onValueChange,
            modifier = Modifier.fillMaxWidth(),
            textStyle = TextStyle(
                color = Color.White,
                fontSize = 15.sp,
            ),
            singleLine = true,
            cursorBrush = SolidColor(AppColors.red),
            visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
        )
    }
}
