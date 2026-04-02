# Stage 1: Build
FROM golang:1.24-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

# Copy go mod and sum files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
# We build cmd/server/main.go which is the main entry point
RUN CGO_ENABLED=0 GOOS=linux go build -o backend cmd/server/main.go

# Stage 2: Final image
FROM alpine:latest

# Install runtime dependencies (ca-certificates for HTTPS/TLS)
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/backend .

# Expose the application port
EXPOSE 3001

# Command to run the application
# Railway provides a dynamic PORT env variable, 
# ensuring your application listens on it is key.
CMD ["./backend"]
