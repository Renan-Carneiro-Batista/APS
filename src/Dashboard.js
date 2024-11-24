import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { UserContext } from './UserContext';

const Dashboard = () => {
  const [errorMessage, setErrorMessage] = useState('');
  const [file, setFile] = useState(null);
  const [history, setHistory] = useState([]); // Histórico de detecções
  const [selectedImage, setSelectedImage] = useState(null); // Imagem selecionada do histórico
  const navigate = useNavigate();
  const { user, setResult } = useContext(UserContext);

  // Função para buscar o histórico de detecções do usuário
  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch(`http://localhost:8000/user_detections/?user_id=${user.id}`);
      if (!response.ok) throw new Error('Erro ao buscar histórico.');
      const data = await response.json();
      setHistory(data.detections); // Atualiza o estado com o histórico
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistory([]); // Limpa o histórico em caso de erro
    }
  }, [user.id]);

  // Carrega o histórico quando o componente é montado
  useEffect(() => {
    if (!user) {
      navigate('/');
    } else {
      fetchHistory();
    }
  }, [user, navigate, fetchHistory]);

  // Manipula a seleção de arquivos para upload
  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setErrorMessage('');
  };

  // Envia a imagem para o backend
  const uploadImage = async () => {
    if (!file) {
      setErrorMessage('Selecione uma imagem!');
      return;
    }

    const formData = new FormData();
    formData.append('image', file);
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

      // Salva o resultado no contexto
      setResult({
        img: data.image,
        class: data.detection_info.class,
        confidence: data.detection_info.confidence,
      });

      // Redireciona para a página de resultados
      navigate('/result');

      // Atualiza o histórico após o upload
      fetchHistory();
    } catch (error) {
      console.error('Erro no upload:', error);
      setErrorMessage('Erro ao enviar a imagem para o servidor!');
    }
  };

  // Recupera a imagem de uma detecção específica
  const fetchImage = async (detectionId) => {
    try {
      const response = await fetch(`http://localhost:8000/get_image/${detectionId}`);
      const data = await response.json();
      if (data.image) {
        setSelectedImage(`data:image/jpeg;base64,${data.image}`);
      }
    } catch (error) {
      console.error('Erro ao buscar imagem:', error);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ marginTop: 8, textAlign: 'center' }}>
        <Typography component="h1" variant="h4">
          Bem-vindo, {user?.name}!
        </Typography>
        <Typography variant="body1" sx={{ marginTop: 2 }}>
          Aqui você pode enviar imagens para análise e visualizar o histórico.
        </Typography>
      </Box>

      <Box sx={{ marginTop: 4, textAlign: 'center' }}>
        <Typography component="h2" variant="h5" sx={{ marginBottom: 2 }}>
          Upload de Imagem
        </Typography>
        <Box sx={{ marginBottom: 2 }}>
          <input
            accept="image/jpeg, image/png"
            id="file-upload"
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />
          <label htmlFor="file-upload">
            <Button variant="contained" component="span">
              Selecionar Arquivo
            </Button>
          </label>
          {file && <Typography variant="body2">Arquivo: {file.name}</Typography>}
        </Box>
        <Button variant="contained" color="primary" onClick={uploadImage} disabled={!file}>
          Enviar Imagem
        </Button>
        {errorMessage && (
          <Box sx={{ marginTop: 2 }}>
            <Alert severity="error">{errorMessage}</Alert>
          </Box>
        )}
      </Box>

      <Box sx={{ marginTop: 6 }}>
        <Typography component="h2" variant="h5">
          Histórico de Detecções
        </Typography>
        {history.length > 0 ? (
          <List>
            {history.map((detection, index) => (
              <ListItem
                key={index}
                button
                onClick={() => fetchImage(detection.id)}
              >
                <ListItemText
                  primary={`Classe: ${detection.class_detected}`}
                  secondary={`Confiança: ${(detection.confidence * 100).toFixed(
                    2
                  )}% | Detectado em: ${new Date(
                    detection.detected_at
                  ).toLocaleString()}`}
                />
              </ListItem>
            ))}
          </List>
        ) : (
          <Typography variant="body1">Nenhuma detecção registrada.</Typography>
        )}
      </Box>

      {selectedImage && (
        <Box sx={{ marginTop: 4, textAlign: 'center' }}>
          <Typography component="h2" variant="h6">
            Imagem Selecionada
          </Typography>
          <img src={selectedImage} alt="Detecção" style={{ maxWidth: '100%' }} />
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
