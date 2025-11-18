# Docker Setup Instructions

This project includes Docker configuration to make it easy to run the application without installing Node.js or managing dependencies locally.

## Prerequisites

- Docker Desktop installed on your machine
- Docker Compose (included with Docker Desktop)

## Quick Start

### Option 1: Using Docker Compose (Recommended)

1. Clone the repository
2. Make sure you have a `.env` file in the project root with the required environment variables:
   ```
   REACT_APP_MAPBOX_API=your_mapbox_api_key
   BROWSER=none
   ```

3. Build and start the container:
   ```bash
   docker-compose up
   ```

4. Open your browser and navigate to `http://localhost:3000`

5. To stop the container, press `Ctrl+C` or run:
   ```bash
   docker-compose down
   ```

### Option 2: Using Docker Directly

1. Build the image:
   ```bash
   docker build -t keplergl-deliverable .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 --env-file .env keplergl-deliverable
   ```

3. Open your browser and navigate to `http://localhost:3000`

## Development Mode

The docker-compose.yml is configured with volume mounting, which means:
- Changes to your source code will be reflected in the running container
- Hot reload is enabled (changes will trigger automatic rebuilds)
- node_modules is excluded from the mount to prevent conflicts

## Rebuilding After Changes

If you modify package.json or need to reinstall dependencies:

```bash
docker-compose build --no-cache
docker-compose up
```

## Troubleshooting

### Port 3000 is already in use
If port 3000 is occupied, you can change it in docker-compose.yml:
```yaml
ports:
  - "3001:3000"  # Change 3001 to any available port
```

### Container won't start
- Make sure Docker Desktop is running
- Check that the `.env` file exists
- Try rebuilding: `docker-compose build --no-cache`

### Changes not reflecting
- Make sure volume mounting is working
- Try: `docker-compose restart`
