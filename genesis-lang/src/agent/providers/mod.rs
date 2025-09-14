use super::{AgentConfig, AgentResponse, LLMProvider, Message, FinishReason};
use crate::error::Result;
use async_trait::async_trait;
use std::collections::HashMap;
use uuid::Uuid;

pub mod openai;
pub mod mock;

pub use openai::OpenAIProvider;
pub use mock::MockProvider;