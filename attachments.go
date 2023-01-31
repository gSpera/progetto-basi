package main

import (
	"errors"
	"fmt"
	"io"
	"io/fs"
	"os"
	"path"
	"regexp"
)

type AttachmentStore interface {
	List(orderID int) ([]Attachment, error)
	Put(orderID int, filename string, fl io.Reader) error
	Get(orderID int, filename string) (io.Reader, error)
}

var _ AttachmentStore = FileSystemAttachmentStore{}

type Attachment struct {
	Name string
}

type FileSystemAttachmentStore struct {
	filesystem string
}

func (f FileSystemAttachmentStore) List(orderID int) ([]Attachment, error) {
	files, err := os.ReadDir(path.Join(f.filesystem, fmt.Sprint(orderID)))
	attachments := make([]Attachment, 0, len(files))

	if errors.Is(err, fs.ErrNotExist) { // Attachments sub dir doen't exist, no attachments
		return []Attachment{}, nil
	}

	for _, f := range files {
		attachments = append(attachments, Attachment{
			Name: f.Name(),
		})
	}
	return attachments, err
}

var sanitizeFilenameRegex = regexp.MustCompile(`[^\w\s.]`)

// Maybe find a better way
func sanitizeFilename(filename string) string {
	return sanitizeFilenameRegex.ReplaceAllLiteralString(filename, "_")
}

func (f FileSystemAttachmentStore) Put(orderID int, filename string, input io.Reader) error {
	safepath := path.Join(f.filesystem, fmt.Sprint(orderID), sanitizeFilename(filename))
	os.MkdirAll(path.Join(f.filesystem, fmt.Sprint(orderID)), 0744)

	fl, err := os.OpenFile(safepath, os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return fmt.Errorf("cannot create attachment file: %w", err)
	}

	_, err = io.Copy(fl, input)
	if err != nil {
		os.Remove(safepath)
		return fmt.Errorf("cannot write attachment file: %w", err)
	}

	return nil
}

func (f FileSystemAttachmentStore) Get(orderID int, filename string) (io.Reader, error) {
	safepath := path.Join(f.filesystem, fmt.Sprint(orderID), sanitizeFilename(filename))
	fl, err := os.Open(safepath)
	if err != nil {
		return nil, fmt.Errorf("cannot open attachment file: %w", err)
	}

	return fl, nil
}
