use crate::error::{MemoryError, Result};
use async_trait::async_trait;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use uuid::Uuid;

pub mod basic;
pub mod vector;

pub use basic::BasicMemoryStore;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryEntry {
    pub id: String,
    pub content: String,
    pub metadata: HashMap<String, serde_json::Value>,
    pub timestamp: chrono::DateTime<chrono::Utc>,
    pub embedding: Option<Vec<f32>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryQuery {
    pub query: String,
    pub filters: HashMap<String, serde_json::Value>,
    pub limit: Option<usize>,
    pub similarity_threshold: Option<f32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemorySearchResult {
    pub entry: MemoryEntry,
    pub score: f32,
}

#[async_trait]
pub trait MemoryStore: Send + Sync {
    async fn store(&self, entry: MemoryEntry) -> Result<String>;
    async fn retrieve(&self, id: &str) -> Result<Option<MemoryEntry>>;
    async fn search(&self, query: MemoryQuery) -> Result<Vec<MemorySearchResult>>;
    async fn delete(&self, id: &str) -> Result<bool>;
    async fn list_all(&self, limit: Option<usize>) -> Result<Vec<MemoryEntry>>;
    async fn clear(&self) -> Result<()>;
}

pub struct MemoryManager {
    store: Box<dyn MemoryStore>,
}

impl MemoryManager {
    pub fn new<T: MemoryStore + 'static>(store: T) -> Self {
        Self {
            store: Box::new(store),
        }
    }

    pub async fn store_text(
        &self,
        content: String,
        metadata: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<String> {
        let entry = MemoryEntry {
            id: Uuid::new_v4().to_string(),
            content,
            metadata: metadata.unwrap_or_default(),
            timestamp: chrono::Utc::now(),
            embedding: None,
        };

        self.store.store(entry).await
    }

    pub async fn store_with_embedding(
        &self,
        content: String,
        embedding: Vec<f32>,
        metadata: Option<HashMap<String, serde_json::Value>>,
    ) -> Result<String> {
        let entry = MemoryEntry {
            id: Uuid::new_v4().to_string(),
            content,
            metadata: metadata.unwrap_or_default(),
            timestamp: chrono::Utc::now(),
            embedding: Some(embedding),
        };

        self.store.store(entry).await
    }

    pub async fn retrieve(&self, id: &str) -> Result<Option<MemoryEntry>> {
        self.store.retrieve(id).await
    }

    pub async fn search_text(&self, query: String, limit: Option<usize>) -> Result<Vec<MemorySearchResult>> {
        let memory_query = MemoryQuery {
            query,
            filters: HashMap::new(),
            limit,
            similarity_threshold: None,
        };

        self.store.search(memory_query).await
    }

    pub async fn search_semantic(
        &self,
        query: String,
        similarity_threshold: Option<f32>,
        limit: Option<usize>,
    ) -> Result<Vec<MemorySearchResult>> {
        let memory_query = MemoryQuery {
            query,
            filters: HashMap::new(),
            limit,
            similarity_threshold,
        };

        self.store.search(memory_query).await
    }

    pub async fn search_filtered(
        &self,
        query: String,
        filters: HashMap<String, serde_json::Value>,
        limit: Option<usize>,
    ) -> Result<Vec<MemorySearchResult>> {
        let memory_query = MemoryQuery {
            query,
            filters,
            limit,
            similarity_threshold: None,
        };

        self.store.search(memory_query).await
    }

    pub async fn delete(&self, id: &str) -> Result<bool> {
        self.store.delete(id).await
    }

    pub async fn list_recent(&self, limit: Option<usize>) -> Result<Vec<MemoryEntry>> {
        self.store.list_all(limit).await
    }

    pub async fn clear_all(&self) -> Result<()> {
        self.store.clear().await
    }

    pub async fn get_stats(&self) -> Result<MemoryStats> {
        let entries = self.store.list_all(None).await?;
        
        let total_entries = entries.len();
        let total_content_size: usize = entries.iter().map(|e| e.content.len()).sum();
        let entries_with_embeddings = entries.iter().filter(|e| e.embedding.is_some()).count();
        
        let oldest_entry = entries.iter().min_by_key(|e| e.timestamp);
        let newest_entry = entries.iter().max_by_key(|e| e.timestamp);

        Ok(MemoryStats {
            total_entries,
            total_content_size,
            entries_with_embeddings,
            oldest_entry_timestamp: oldest_entry.map(|e| e.timestamp),
            newest_entry_timestamp: newest_entry.map(|e| e.timestamp),
        })
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MemoryStats {
    pub total_entries: usize,
    pub total_content_size: usize,
    pub entries_with_embeddings: usize,
    pub oldest_entry_timestamp: Option<chrono::DateTime<chrono::Utc>>,
    pub newest_entry_timestamp: Option<chrono::DateTime<chrono::Utc>>,
}

impl MemoryEntry {
    pub fn new(content: String) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            content,
            metadata: HashMap::new(),
            timestamp: chrono::Utc::now(),
            embedding: None,
        }
    }

    pub fn with_metadata(content: String, metadata: HashMap<String, serde_json::Value>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            content,
            metadata,
            timestamp: chrono::Utc::now(),
            embedding: None,
        }
    }

    pub fn with_embedding(content: String, embedding: Vec<f32>) -> Self {
        Self {
            id: Uuid::new_v4().to_string(),
            content,
            metadata: HashMap::new(),
            timestamp: chrono::Utc::now(),
            embedding: Some(embedding),
        }
    }

    pub fn add_metadata(&mut self, key: String, value: serde_json::Value) {
        self.metadata.insert(key, value);
    }

    pub fn set_embedding(&mut self, embedding: Vec<f32>) {
        self.embedding = Some(embedding);
    }
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    if a.len() != b.len() {
        return 0.0;
    }

    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();

    if norm_a == 0.0 || norm_b == 0.0 {
        return 0.0;
    }

    dot_product / (norm_a * norm_b)
}