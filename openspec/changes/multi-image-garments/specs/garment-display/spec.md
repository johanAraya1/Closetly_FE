# Garment Display Specification

## Purpose

How garment images are presented to the user in detail, closet, and fullscreen views — including the new carousel and paging dots.

## Requirements

### Requirement: Detail Carousel with Paging Dots

The garment detail screen MUST render a horizontal FlatList with `pagingEnabled`. A paging dot indicator SHALL appear below the carousel, reflecting the total image count and the active page.

#### Scenario: 2 images in carousel
- GIVEN a garment with 2 images in `imageUrls`
- WHEN the detail screen renders
- THEN a horizontal carousel with 2 pages is shown
- AND the dot indicator shows 2 dots with the first dot active

#### Scenario: Single image — single page
- GIVEN a garment with 1 image
- WHEN the detail screen renders
- THEN the carousel shows 1 page (single dot, no swipe)

#### Scenario: Legacy garment — no `imageUrls` array
- GIVEN a garment with only `imageUrl` (no `imageUrls`)
- WHEN the detail screen renders
- THEN the carousel shows 1 page using the `imageUrl` value
- AND a single paging dot is visible

### Requirement: Closet Cards Show First Image

GarmentCard / closet list views MUST render only `imageUrls[0]` (or its `imageUrl` alias). These views SHALL NOT be modified — no additional indicators, no carousel.

#### Scenario: Closet card with 2-image garment
- GIVEN a garment with 2 images
- WHEN the closet list renders
- THEN only the first image is displayed
- AND no visual indicator of additional images appears

### Requirement: Fullscreen from Carousel

Tapping the carousel image SHALL open the fullscreen viewer. The viewer SHALL display the image at the carousel's current page index.

#### Scenario: Fullscreen from second carousel page
- GIVEN the carousel is on page 2 (index 1)
- WHEN the user taps the image
- THEN the fullscreen viewer opens showing the second image
