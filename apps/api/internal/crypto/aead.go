// Package crypto provides AES-256-GCM authenticated encryption for secrets
// stored at rest (OAuth tokens). Each ciphertext is prefixed with a random
// 12-byte nonce so the same plaintext never produces the same ciphertext.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
)

// Sealer wraps an AES-256-GCM AEAD. It is safe to share across goroutines.
type Sealer struct {
	aead cipher.AEAD
}

// NewSealer constructs a Sealer from a 64-character hex string (32 bytes).
// Returns an error when the key is not exactly 64 hex characters or cannot be
// decoded.
func NewSealer(keyHex string) (*Sealer, error) {
	if len(keyHex) != 64 {
		return nil, fmt.Errorf("crypto: key must be 64 hex chars (32 bytes), got %d", len(keyHex))
	}
	key, err := hex.DecodeString(keyHex)
	if err != nil {
		return nil, fmt.Errorf("crypto: decode key hex: %w", err)
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("crypto: create cipher: %w", err)
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("crypto: create gcm: %w", err)
	}
	return &Sealer{aead: aead}, nil
}

// Seal encrypts plaintext and returns nonce || ciphertext. Each call generates
// a fresh random nonce, so the same plaintext produces different output on
// every invocation.
func (s *Sealer) Seal(plaintext []byte) ([]byte, error) {
	nonce := make([]byte, s.aead.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("crypto: generate nonce: %w", err)
	}
	ct := s.aead.Seal(nonce, nonce, plaintext, nil)
	return ct, nil
}

// Open decrypts a blob produced by Seal (nonce || ciphertext).
func (s *Sealer) Open(ct []byte) ([]byte, error) {
	ns := s.aead.NonceSize()
	if len(ct) < ns {
		return nil, fmt.Errorf("crypto: ciphertext too short")
	}
	nonce, data := ct[:ns], ct[ns:]
	plaintext, err := s.aead.Open(nil, nonce, data, nil)
	if err != nil {
		return nil, fmt.Errorf("crypto: decrypt: %w", err)
	}
	return plaintext, nil
}
