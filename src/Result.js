import React, { useContext } from 'react';
import { Container, Typography, Box, Button } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';

const Result = () => {
  const { result } = useContext(UserContext);
  const navigate = useNavigate();

  // Validação: Se não houver resultado, redireciona para o dashboard
  if (!result) {
    navigate('/dashboard');
    return null;
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8, textAlign: 'center' }}>
        <Typography component="h1" variant="h4">
          Resultado da Detecção
        </Typography>
        <Box sx={{ marginTop: 4 }}>
          <img
            src={`data:image/jpeg;base64,${result.img}`}
            alt="Resultado da Detecção"
            style={{ maxWidth: '100%', border: '1px solid #ccc', borderRadius: '8px' }}
          />
        </Box>
        <Box sx={{ marginTop: 4 }}>
          <Typography variant="h6">
            Classe Detectada: <strong>{result.class}</strong>
          </Typography>
          <Typography variant="h6">
            Confiança: <strong>{(parseFloat(result.confidence) * 100).toFixed(2)}%</strong>
          </Typography>
        </Box>
        <Box sx={{ marginTop: 4 }}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Voltar para o Dashboard
          </Button>
        </Box>
      </Box>
    </Container>
  );
};

export default Result;
