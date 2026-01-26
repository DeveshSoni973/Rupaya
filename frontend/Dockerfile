FROM oven/bun:alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock ./

# Install dependencies
RUN bun install

# Copy the rest of the source code
COPY . .

# Expose port
EXPOSE 3000

# Use shell form instead of exec form
CMD bun --bun next dev --hostname 0.0.0.0 --port 3000
