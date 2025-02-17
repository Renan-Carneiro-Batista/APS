from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import spacy
from pyalex import Works
from collections import Counter
from typing import Optional

SIMILARITY_THRESHOLD = 0.2

nlp = spacy.load("en_core_web_sm")

app = FastAPI()

class SummaryRequest(BaseModel):
    summary: str

def extract_relevant_keywords(text: str, top_n=10):
    doc = nlp(text.lower())
    word_freq = Counter(token.text for token in doc if token.is_alpha and not token.is_stop and token.pos_ in {"NOUN", "ADJ"})

    total_words = sum(word_freq.values())
    tf_scores = {word: count / total_words for word, count in word_freq.items()}

    sorted_keywords = sorted(tf_scores.items(), key=lambda x: x[1], reverse=True)

    return [word for word, score in sorted_keywords[:top_n]]

def compute_relevance_score(summary, works):
    """ Calcula a relevância das fontes com base na similaridade do resumo com os artigos. """
    articles_texts = [work["title"] + " " + work.get("abstract", "") for work in works]
    vectorizer = TfidfVectorizer(stop_words="english")

    # Vetorização dos textos
    tfidf_matrix = vectorizer.fit_transform([summary] + articles_texts)
    summary_vector = tfidf_matrix[0]  # O vetor do resumo
    articles_vectors = tfidf_matrix[1:]  # Vetores dos artigos

    # Cálculo da similaridade do resumo com cada artigo
    similarity_scores = cosine_similarity(summary_vector, articles_vectors).flatten()

    # Criar um dicionário com as similaridades dos artigos
    relevance_per_work = {idx: similarity_scores[idx] for idx in range(len(works))}

    return relevance_per_work

ddef search_works_by_keywords(keywords, summary, sort_by="relevance"):
    query = " OR ".join(keywords)

    works = Works().search(query).filter(publication_year="2022|2023").get(per_page=200, page=1)

    sources = {}
    total_publications = 0

    # Calcular a relevância dos artigos antes de processá-los
    relevance_scores = compute_relevance_score(summary, works)

    for idx, work in enumerate(works):
        # Aplicar filtro de similaridade mínima
        if relevance_scores.get(idx, 0) < SIMILARITY_THRESHOLD:
            continue  # Ignora artigos com baixa similaridade

        locations = work.get("locations", [])
        for location in locations:
            source = location.get("source")
            if source and source.get("display_name"):
                source_name = source["display_name"]
                source_type = source.get("type", "Unknown Type").lower()
                issn = source.get("issn", "Desconhecido")

                if source_type not in ["journal", "conference"]:
                    continue

                if source_name in sources:
                    sources[source_name]["count"] += 1
                else:
                    sources[source_name] = {
                        "name": source_name,
                        "type": source_type.capitalize(),
                        "is_oa": source.get("is_oa", "Unknown"),
                        "issn": issn,
                        "count": 1,
                        "relevance": 0  # Inicialmente 0
                    }

                # Somamos a relevância média dos artigos filtrados por fonte
                sources[source_name]["relevance"] += relevance_scores[idx]
                total_publications += 1

    # Ajustar a média da relevância para cada fonte
    for source in sources.values():
        source["relevance"] /= source["count"]  # Calcula a média da relevância

    # Definir a chave de ordenação com base no parâmetro `sort_by`
    if sort_by == "count":
        sorted_sources = sorted(sources.values(), key=lambda x: x["count"], reverse=True)
    else:  # Default: "relevance"
        sorted_sources = sorted(sources.values(), key=lambda x: x["relevance"], reverse=True)

    return sorted_sources

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/search")
async def search_articles(request: SummaryRequest, sort_by: Optional[str] = Query("relevance", regex="^(relevance|count)$")):
    """Endpoint para buscar artigos a partir de um resumo e ranquear fontes por relevância ou quantidade de publicações."""
    if not request.summary.strip():
        raise HTTPException(status_code=400, detail="Resumo vazio")

    keywords = extract_relevant_keywords(request.summary, top_n=10)
    sources = search_works_by_keywords(keywords, request.summary, sort_by)

    return {"keywords": keywords, "sources": sources}
