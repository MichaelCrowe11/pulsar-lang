# FinStat Pro - AI-Powered Financial Analysis Platform

A next-generation financial document analysis platform that combines React/Next.js frontend with Python backend for advanced AI-powered insights extraction from 10-K/10-Q filings, earnings reports, and financial documents.

## 🚀 Features

### Frontend (Next.js + React + TypeScript)
- **Modern UI**: Beautiful, responsive interface with Tailwind CSS
- **Real-time Updates**: Live progress tracking for document processing
- **Interactive Visualizations**: Dynamic charts and sentiment gauges
- **Document Upload**: Drag-and-drop file upload with multi-file support
- **State Management**: Zustand for efficient state handling
- **Animations**: Smooth transitions with Framer Motion

### Backend (Python + FastAPI)
- **Document Processing**: Extract text from PDF, Word, CSV, and text files
- **AI Analysis**: OpenAI GPT-4 integration for financial metrics extraction
- **Sentiment Analysis**: Analyze management commentary and forward-looking statements
- **RESTful API**: Fast, async API with FastAPI framework
- **File Management**: Secure file upload and storage system
- **Error Handling**: Comprehensive error handling and logging

## 📋 Prerequisites

- Node.js 18+ and npm
- Python 3.9+
- OpenAI API key (optional, for AI features)

## 🛠️ Installation

### Frontend Setup

```bash
# Navigate to frontend directory
cd finstat-pro

# Install dependencies
npm install

# Create environment file
echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local

# Run development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend directory
cd finstat-pro/backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
# Edit .env file and add your OpenAI API key if available

# Run backend server
python main.py
```

Backend API will be available at `http://localhost:8000`
API documentation at `http://localhost:8000/docs`

## 🔧 Configuration

### Frontend Configuration (.env.local)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Backend Configuration (.env)
```env
# AI Configuration
OPENAI_API_KEY=your-openai-api-key-here
AI_MODEL=gpt-4
AI_TEMPERATURE=0.1

# File Upload
MAX_FILE_SIZE=52428800
UPLOAD_DIR=uploads

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True
```

## 📁 Project Structure

```
finstat-pro/
├── src/                    # Frontend source code
│   ├── app/               # Next.js app directory
│   ├── components/        # React components
│   │   ├── ui/           # Reusable UI components
│   │   └── dashboard/    # Dashboard components
│   ├── lib/              # Utilities and API client
│   └── types/            # TypeScript type definitions
├── backend/               # Python backend
│   ├── services/         # Business logic services
│   ├── models/           # Pydantic models
│   ├── core/             # Core configuration
│   └── main.py           # FastAPI application
└── public/               # Static assets
```

## 🚀 Usage

1. **Start both servers** (frontend and backend)

2. **Upload Documents**
   - Click or drag files into the upload area
   - Supports PDF, TXT, DOC, DOCX, CSV formats
   - Multiple files can be uploaded at once

3. **Analyze Documents**
   - Enter company ticker symbol
   - Select reporting period
   - Click "Start Analysis"

4. **View Results**
   - Financial metrics extracted automatically
   - Sentiment analysis with confidence scores
   - AI-generated summary
   - Export results in various formats

## 🔄 API Endpoints

### Core Endpoints
- `GET /health` - Health check
- `POST /upload` - Upload documents
- `POST /analyze` - Analyze documents
- `GET /supported-formats` - Get supported file formats
- `GET /analysis/history` - Get analysis history
- `DELETE /files/{file_id}` - Delete uploaded file

## 🎨 Key Components

### Frontend Components
- `DocumentUpload` - File upload interface
- `FinancialMetrics` - Metrics display cards
- `SentimentGauge` - Sentiment visualization
- `MetricCard` - Individual metric display
- `ProgressBar` - Upload/processing progress

### Backend Services
- `DocumentProcessor` - Text extraction from various formats
- `FinancialAnalyzer` - AI-powered analysis engine
- `FileHandler` - File management and storage

## 🔒 Security Features

- File type validation
- File size limits
- Secure file storage
- API rate limiting ready
- Environment variable configuration

## 📈 Performance Optimizations

- Async/await throughout backend
- React lazy loading for code splitting
- Optimized bundle size with Next.js
- Efficient state management with Zustand
- Response caching for repeated analyses

## 🧪 Testing

```bash
# Frontend tests
cd finstat-pro
npm test

# Backend tests
cd backend
pytest
```

## 📦 Building for Production

### Frontend Build
```bash
cd finstat-pro
npm run build
npm start
```

### Backend Deployment
```bash
cd backend
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is proprietary software. All rights reserved.

## 🆘 Support

For issues, questions, or suggestions, please open an issue on GitHub.

## 🎯 Roadmap

- [ ] Real-time market data integration
- [ ] Multi-language support
- [ ] Advanced comparison tools
- [ ] Export to Excel/PowerPoint
- [ ] Mobile application
- [ ] Batch processing
- [ ] Webhook notifications
- [ ] Custom AI model training

## 💡 Tech Stack

### Frontend
- Next.js 15.5
- React 18
- TypeScript
- Tailwind CSS
- Framer Motion
- Zustand
- Axios

### Backend
- FastAPI
- Python 3.9+
- OpenAI GPT-4
- PyPDF2/pdfplumber
- Pydantic
- Uvicorn

## 🏆 Acknowledgments

Built with modern web technologies and AI to revolutionize financial document analysis.