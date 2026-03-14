# Epstein Files Downloader

A modular, multi-threaded file downloader designed to automate the download of Epstein files from various sources, initially targeting the DOJ website. This tool is built with extensibility in mind, allowing integration with AI agents for validation, monitoring, and workflow management.

## Features

- Multi-threaded downloading for improved performance
- Configurable via environment variables or configuration files
- Secure handling of user-provided cookies for authentication
- AI agent integration for connection validation and monitoring
- Logging and resuming capabilities to prevent duplicate downloads
- Docker containerization for easy deployment
- Designed for npm publishing as a reusable package

## Project Structure

```
epstein-downloader/
├── src/
│   ├── downloader/          # Core downloader logic
│   ├── agents/              # AI agent implementations
│   ├── config/              # Configuration management
│   ├── utils/               # Utility functions
│   └── index.ts             # Entry point
├── config/
│   ├── config.json.example  # Example configuration
│   └── .env.example         # Example environment variables
├── tests/                   # Test files
├── Dockerfile               # Docker container definition
├── package.json             # npm package definition
├── tsconfig.json            # TypeScript configuration
└── README.md                # This file
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Docker (optional, for containerization)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd epstein-downloader
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure the application:
   - Copy `config/config.json.example` to `config/config.json` and adjust settings
   - Copy `.env.example` to `.env` and add your DOJ website cookies

### Usage

```bash
npm start
```

Or using Docker:

```bash
docker build -t epstein-downloader .
docker run -v $(pwd)/downloads:/app/downloads --env-file .env epstein-downloader
```

## Configuration

The downloader can be configured via:
- Environment variables (in `.env` file)
- JSON configuration file (in `config/config.json`)

See `config/config.json.example` and `.env.example` for reference.

## AI Agent Integration

This project includes hooks for AI agent integration to:
- Validate connection to the DOJ website
- Check cookie validity and freshness
- Monitor download progress and resume capabilities
- Validate remote server connections and disk space

AI agent workflows and prompts are documented in the `agents/` directory.

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details.