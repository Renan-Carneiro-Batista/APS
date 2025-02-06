import React, { useContext, useEffect, useState } from 'react';
import { Container, Typography, Box, Button, Paper, Card, CardContent, Grid } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';

const Result = () => {
  const { result } = useContext(UserContext);
  const navigate = useNavigate();
  const [suggestion, setSuggestion] = useState('');

  useEffect(() => {
    const fetchSuggestion = async () => {
      if (!result || !result.class) return;

      try {
        const response = await fetch(`http://localhost:8000/suggestions/class/${result.class}`);
        if (!response.ok) throw new Error('Erro ao buscar sugestão.');
        const data = await response.json();

        setSuggestion(Array.isArray(data.suggestion) ? data.suggestion.join(', ') : data.suggestion);
      } catch (error) {
        console.error('Erro ao carregar sugestão:', error);
        setSuggestion('Nenhuma sugestão disponível para esta classe.');
      }
    };

    fetchSuggestion();
  }, [result]);

  if (!result) {
    navigate('/dashboard');
    return null;
  }

  return (
    <Container maxWidth="lg">
    <Paper elevation={0} sx={{padding: 4, marginTop: 6, borderRadius: 4, textAlign: 'center'}}>
    <Typography component="h1" variant="h4" gutterBottom>
    🎯 Resultado da Detecção
    </Typography>
    <Grid container spacing={3} alignItems="center">
    <Grid item xs={12} md={6}>
    <Card sx={{ padding: 3, borderRadius: 3, boxShadow: 3, backgroundColor: '#fff' }}>
    <CardContent>
    <Box>
    <img
    src={`data:image/jpeg;base64,${result.img}`}
    alt="Resultado da Detecção"
    style={{ width: '100%', border: '2px solid #ddd', borderRadius: '12px', boxShadow: '0px 4px 8px rgba(0,0,0,0.1)' }}
    />
    </Box>
    </CardContent>
    </Card>
    </Grid>
    <Grid item xs={12} md={6}>
    <Card sx={{ padding: 3, borderRadius: 3, boxShadow: 3, backgroundColor: '#fff' }}>
    <CardContent>
    <Typography variant="h6" gutterBottom>
    🏷️ Doença Detectada: <strong>{result.class}</strong>
    </Typography>
    <Typography variant="h6" gutterBottom>
    🎯 Confiança: <strong>{(parseFloat(result.confidence) * 100).toFixed(2)}%</strong>
    </Typography>
    <Box sx={{ marginTop: 2, padding: 2, backgroundColor: '#eef2ff', borderRadius: '8px' }}>
    <Typography variant="h6">💡 Sugestão:</Typography>
    <Typography>{suggestion}</Typography>
    </Box>
    <Box sx={{ marginTop: 4 }}>
    <Button variant="contained" color="primary" onClick={() => navigate('/dashboard')}>
    Voltar para o Dashboard
    </Button>
    </Box>
    </CardContent>
    </Card>
    </Grid>
    </Grid>
    </Paper>
    </Container>
  );
};

export default Result;
