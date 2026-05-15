# Multi-stage build for the Runstamp API. Final image is distroless static
# (~15 MB) so the VPS doesn't need glibc / a shell to run it.
FROM golang:1.24-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download
COPY . .
ARG VERSION=dev
RUN CGO_ENABLED=0 GOOS=linux go build \
    -trimpath \
    -ldflags "-s -w -X main.version=${VERSION}" \
    -o /out/runstamp-api ./cmd/server

FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=build /out/runstamp-api /usr/local/bin/runstamp-api
COPY --from=build /src/migrations migrations
# Firebase service-account credentials must NOT be baked into the image.
# In production, supply the JSON file via one of:
#   - A Docker secret:      --secret id=firebase,src=/host/path/key.json
#   - A bind-mounted volume: -v /host/path/key.json:/run/secrets/firebase.json:ro
# Then set FIREBASE_CREDENTIALS_PATH=/run/secrets/firebase.json in the
# container environment.  Never COPY real credential files into this image.
EXPOSE 8080
ENTRYPOINT ["/usr/local/bin/runstamp-api"]
