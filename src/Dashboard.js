import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  CircularProgress,
  Paper,
  Card,
  CardContent
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';

const classEmojis = {
  "Alopecia Areata": "🧑‍🦲",
  "Contact Dermatitis": "🌿",
  "Folliculitis": "🦠",
  "Head Lice": "🪳",
  "Lichen Planus": "🧴",
  "Male Pattern Baldness": "👨‍🦲",
  "Psoriasis": "🌾",
  "Seborrheic Dermatitis": "🧼",
  "Telogen Effluvium": "💇",
  "Tinea Capitis": "🍄"
};

const Dashboard = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState(null);
  const [groupedDetections, setGroupedDetections] = useState({});
  const [suggestions, setSuggestions] = useState({});
  const navigate = useNavigate();
  const { user, setResult } = useContext(UserContext);

  const fetchHistoryAndInsights = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8000/user_detections/insights/?user_id=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar histórico.');
      const data = await response.json();
      setGroupedDetections(data.grouped_detections);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setGroupedDetections({});
    }
  }, [user.id]);

  useEffect(() => {
    if (!user) {
      navigate('/');
    } else {
      fetchHistoryAndInsights();
    }
  }, [user, navigate, fetchHistoryAndInsights]);

  const handleExpand = async (className) => {
    if (!suggestions[className]) {
      try {
        const response = await fetch(`http://localhost:8000/suggestions/class/${encodeURIComponent(className)}`);
        if (!response.ok) throw new Error('Nenhuma sugestão encontrada.');
        const data = await response.json();
        setSuggestions(prev => ({ ...prev, [className]: data.suggestion }));
      } catch (error) {
        console.error('Erro ao carregar sugestão:', error);
        setSuggestions(prev => ({ ...prev, [className]: 'Nenhuma sugestão disponível.' }));
      }
    }
  };

  return (
    <Container maxWidth="md">
    <Paper elevation={4} sx={{ padding: 4, marginTop: 6, borderRadius: 4 }}>
    <Typography component="h1" variant="h4" align="center" gutterBottom>
    👋 Bem-vindo, {user?.name}!
    </Typography>
    <Typography variant="body1" align="center">
    Envie imagens para análise e visualize o histórico de detecções.
    </Typography>
    </Paper>

    <Card sx={{ marginTop: 4, padding: 3, borderRadius: 3, boxShadow: 3 }}>
    <CardContent>
    <Typography component="h2" variant="h5" align="center" gutterBottom>
    📤 Upload de Imagem
    </Typography>
    <Box textAlign="center">
    <input
    accept="image/jpeg, image/png"
    id="file-upload"
    type="file"
    style={{ display: 'none' }}
    onChange={async (event) => {
      const selectedFile = event.target.files[0];
      if (selectedFile) {
        setFile(selectedFile);
        const formData = new FormData();
        formData.append('image', selectedFile);
        formData.append('user_id', user.id);
        try {
          const response = await fetch('http://localhost:8000/analyze_image/', {
            method: 'POST',
            body: formData,
          });
          if (!response.ok) {
            const errorData = await response.json();
            setErrorMessage('Erro: ' + (errorData.detail || 'Erro desconhecido'));
            return;
          }
          const data = await response.json();
          setResult({
            img: data.image,
            class: data.detection_info.class,
            confidence: data.detection_info.confidence,
          });
          navigate('/result');
          fetchHistoryAndInsights();
        } catch (error) {
          console.error('Erro no upload:', error);
          setErrorMessage('Erro ao enviar a imagem para o servidor!');
        }
      }
    }}
    />
    <label htmlFor="file-upload">
    <Button variant="contained" component="span">Selecionar Arquivo</Button>
    </label>
    {file && <Typography variant="body2" sx={{ marginTop: 1 }}>📄 Arquivo: {file.name}</Typography>}
    </Box>

    {errorMessage && (
      <Alert severity="error" sx={{ marginTop: 2 }}>{errorMessage}</Alert>
    )}
    </CardContent>
    </Card>

    <Box sx={{ marginTop: 6 }}>
    <Typography component="h2" variant="h5" align="center" gutterBottom>
    📜 Histórico de Detecções
    </Typography>
    {Object.keys(groupedDetections).length > 0 ? (
      Object.entries(groupedDetections).map(([className, detections], index) => (
        <Accordion key={index} onChange={() => handleExpand(className)} sx={{ borderRadius: 2, boxShadow: 2, marginBottom: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ backgroundColor: '#f5f5f5', padding: 2 }}>
        <Typography sx={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
        {classEmojis[className] || '🏥'} <span style={{ color: '#d32f2f' }}>{className}</span> - Última Detecção: {new Date(detections[0].detected_at).toLocaleString()}
        </Typography>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: '#fafafa', padding: 2, borderRadius: 2 }}>
        <Box sx={{ marginTop: 2, padding: 2, backgroundColor: '#eef2ff', borderRadius: '8px' }}>
        <Typography variant="h6">💡 Sugestão:</Typography>
        <Typography>{suggestions[className] ? (Array.isArray(suggestions[className]) ? suggestions[className].join(', ') : suggestions[className]) : <CircularProgress size={24} />}</Typography>
        </Box>
        <List>
        {detections.map((detection, idx) => (
          <ListItem key={idx}>
          <ListItemText
          primary={`✅ Confiança: ${(detection.confidence * 100).toFixed(2)}%`}
          secondary={`📅 Detectado em: ${new Date(detection.detected_at).toLocaleString()}`}
          />
          {detection.image_url && (
            <Button
            variant="outlined"
            color="primary"
            onClick={() => window.open(detection.image_url, '_blank')}
            >
            🖼️ Ver Imagem
            </Button>
          )}
          </ListItem>
        ))}
        </List>
        </AccordionDetails>
        </Accordion>
      ))
    ) : (
      <Typography variant="body1">Nenhuma detecção registrada.</Typography>
    )}
    </Box>
    </Container>
  );
};

export default Dashboard;
