use super::{MemoryEntry, MemoryQuery, MemorySearchResult, MemoryStore};
use crate::error::Result;
use async_trait::async_trait;
use dashmap::DashMap;
use std::sync::Arc;

pub struct BasicMemoryStore {
    entries: Arc<DashMap<String, MemoryEntry>>,
}

impl BasicMemoryStore {
    pub fn new() -> Self {
        Self {
            entries: Arc::new(DashMap::new()),
        }
    }
}

impl Default for BasicMemoryStore {
    fn default() -> Self {
        Self::new()
    }
}

#[async_trait]
impl MemoryStore for BasicMemoryStore {
    async fn store(&self, entry: MemoryEntry) -> Result<String> {
        let id = entry.id.clone();
        self.entries.insert(id.clone(), entry);
        Ok(id)
    }

    async fn retrieve(&self, id: &str) -> Result<Option<MemoryEntry>> {
        Ok(self.entries.get(id).map(|entry| entry.clone()))
    }

    async fn search(&self, query: MemoryQuery) -> Result<Vec<MemorySearchResult>> {
        let mut results = Vec::new();
        let query_lower = query.query.to_lowercase();

        for entry_ref in self.entries.iter() {
            let entry = entry_ref.value();
            let content_lower = entry.content.to_lowercase();

            // Simple text matching
            let text_score = if content_lower.contains(&query_lower) {
                // Calculate a simple relevance score based on frequency and position
                let word_count = content_lower.matches(&query_lower).count() as f32;
                let position_bonus = if content_lower.starts_with(&query_lower) { 0.5 } else { 0.0 };
                (word_count / content_lower.len() as f32) * 100.0 + position_bonus
            } else {
                0.0
            };

            // Embedding similarity if both query and entry have embeddings
            let embedding_score = if let (Some(_query_embedding), Some(entry_embedding)) = 
                (None::<Vec<f32>>, &entry.embedding) {
                // In a real implementation, we would generate query embedding and compare
                // For now, just use text score
                text_score
            } else {
                text_score
            };

            let final_score = embedding_score.max(text_score);

            // Apply similarity threshold
            if let Some(threshold) = query.similarity_threshold {
                if final_score < threshold {
                    continue;
                }
            }

            // Apply metadata filters
            let mut matches_filters = true;
            for (filter_key, filter_value) in &query.filters {
                if let Some(entry_value) = entry.metadata.get(filter_key) {
                    if entry_value != filter_value {
                        matches_filters = false;
                        break;
                    }
                } else {
                    matches_filters = false;
                    break;
                }
            }

            if matches_filters && final_score > 0.0 {
                results.push(MemorySearchResult {
                    entry: entry.clone(),
                    score: final_score,
                });
            }
        }

        // Sort by score descending
        results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));

        // Apply limit
        if let Some(limit) = query.limit {
            results.truncate(limit);
        }

        Ok(results)
    }

    async fn delete(&self, id: &str) -> Result<bool> {
        Ok(self.entries.remove(id).is_some())
    }

    async fn list_all(&self, limit: Option<usize>) -> Result<Vec<MemoryEntry>> {
        let mut entries: Vec<MemoryEntry> = self.entries
            .iter()
            .map(|entry_ref| entry_ref.value().clone())
            .collect();

        // Sort by timestamp descending (most recent first)
        entries.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        if let Some(limit) = limit {
            entries.truncate(limit);
        }

        Ok(entries)
    }

    async fn clear(&self) -> Result<()> {
        self.entries.clear();
        Ok(())
    }
}