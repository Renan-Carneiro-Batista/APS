import React from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Box, Button, Container, TextField, Typography, CssBaseline } from '@mui/material';

const LoginPage = () => {
  const handleSubmit = (event) => {
    event.preventDefault();
  };

  const handleGoogleSuccess = (response) => {
    console.log("Login bem-sucedido!", response);
  };

  const handleGoogleFailure = (error) => {
    console.error("Erro no login do Google", error);
  };

  return (
    <GoogleOAuthProvider clientId="924946732631-e0f5cfa8gtab1ej11v6r2m23d671oul0.apps.googleusercontent.com">
      <Container component="main" maxWidth="xs">
        <CssBaseline />
        <Box
          sx={{
            marginTop: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
          }}
        >
          <Typography component="h1" variant="h5">
            Login
          </Typography>
          <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email"
              name="email"
              autoComplete="email"
              autoFocus
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Senha"
              type="password"
              id="password"
              autoComplete="current-password"
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
            >
              Entrar
            </Button>
          </Box>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
          />
        </Box>
      </Container>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
