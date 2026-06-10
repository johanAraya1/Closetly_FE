# Garment Storage Specification

## Purpose

How garment images are stored, uploaded, and deleted — covering the multi-image array, backward compatibility, sequential upload ordering, and lifecycle rules.

## Requirements

### Requirement: Garment Image URLs as Array

The garment entity MUST store image URLs as `imageUrls: string[]`. The first element SHALL represent the primary / front view. Legacy garments without `imageUrls` MUST be normalized on read: `imageUrls ?? [imageUrl]`.

### Requirement: Create Garment — Up to 2 Images

The create endpoint MUST accept up to 2 files. Processing is sequential:

1. Upload first file
2. Run AI analysis (classify, detect color) — **first image only**
3. Run background removal — **first image only**
4. Upload second file (if present) — **no AI, no background removal**
5. Persist garment with both URLs in `imageUrls`

#### Scenario: Create with 2 images
- GIVEN a create request with 2 files
- WHEN processed
- THEN AI + bg removal run only on file 1
- AND file 2 is uploaded without AI or bg removal
- AND `imageUrls` contains both URLs

#### Scenario: Create with 1 image
- GIVEN a create request with 1 file
- WHEN processed
- THEN AI + bg removal run on the single file
- AND `imageUrls` contains one URL

#### Scenario: Create with 0 images — rejected
- GIVEN a create request with 0 files
- THEN the system MUST reject with a validation error

### Requirement: Delete Garment Removes All Images

Deleting a garment MUST remove every URL in `imageUrls` from storage before removing the record.

#### Scenario: Delete garment with multiple images
- GIVEN a garment with 2 images in `imageUrls`
- WHEN deleted
- THEN both storage files are removed
- AND the garment record is deleted

#### Scenario: Delete legacy garment (single `imageUrl`)
- GIVEN a garment with no `imageUrls`, only `imageUrl`
- WHEN deleted
- THEN the single stored file is removed
- AND the garment record is deleted

### Requirement: Upload Ordering

The second file upload MUST be sequential — it SHALL NOT begin until AI and background removal on the first file complete.
