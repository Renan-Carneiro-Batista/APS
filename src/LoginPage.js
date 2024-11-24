import React, { useContext } from 'react';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
import { jwtDecode } from 'jwt-decode'; // Corrigido
import { Container, Box, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { UserContext } from './UserContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser } = useContext(UserContext); // Usa o contexto para armazenar o usuário

  const handleGoogleSuccess = async (response) => {
    try {
      // Decodifica o token JWT retornado pelo Google
      const userObject = jwtDecode(response.credential);
      const { sub: id, name, email } = userObject;

      console.log('Usuário autenticado no Google:', userObject);

      // Envia os dados do usuário para o backend
      const res = await axios.post('http://localhost:8000/api/login', {
        id,
        name,
        email,
      });

      if (res.status === 200) {
        console.log('Usuário armazenado no banco:', res.data.user);
        setUser(res.data.user); // Armazena os dados do usuário no contexto
        navigate('/dashboard'); // Redireciona para o Dashboard
      } else {
        console.error('Erro na resposta do backend:', res);
      }
    } catch (error) {
      console.error('Erro ao processar login do Google:', error);
    }
  };

  const handleGoogleFailure = (error) => {
    console.error('Erro no login do Google:', error);
  };

  return (
    <GoogleOAuthProvider clientId="924946732631-e0f5cfa8gtab1ej11v6r2m23d671oul0.apps.googleusercontent.com">
      <Container maxWidth="xs">
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
          <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleFailure} />
        </Box>
      </Container>
    </GoogleOAuthProvider>
  );
};

export default LoginPage;
