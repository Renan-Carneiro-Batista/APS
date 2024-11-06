import React, { useState } from 'react';
import { jwtDecode } from 'jwt-decode';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { Box, Button, Container, TextField, Typography, CssBaseline } from '@mui/material';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showDetails, setShowDetails] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    alert(`Bem-vindo! Seu email é: ${email} Senha: ${password}`);
  };

  const handleGoogleSuccess = (response) => {
    console.log("Login com Google bem-sucedido!", response);
    const userObject = jwtDecode(response.credential);
    alert(`Bem-vindo, ${userObject.name} (${userObject.email})!`);
  };

  const handleGoogleFailure = (error) => {
    console.error("Erro no login do Google", error);
  };

  return (
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
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
        <GoogleOAuthProvider clientId="924946732631-e0f5cfa8gtab1ej11v6r2m23d671oul0.apps.googleusercontent.com">
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
          />
        </GoogleOAuthProvider>
      </Box>
    </Container>
  );
};

export default LoginPage;
