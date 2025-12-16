# GradeViz - Grade Dashboard

GradeViz website: <a href="https://khgwak.github.io/GradeViz" target="_blank">https://khgwak.github.io/GradeViz</a>

![GradeViz Teaser](assets/GradeViz_teaser.JPG)

A personal dashboard to visualize and analyze academic performance. It tracks Overall/Major GPA trends on dual scales (4.3 / 4.0), analyzes grade distributions, course code distributions, and credits by semester. It also offers a comprehensive course list with interactive filtering and fully supports both English and Korean.

## Key Features

- **Summary Stats**: Tracks Total Credits, Overall GPA, Major GPA (4.3/4.0 scales), and Converted Score (100-point scale).
- **Interactive Visual Analytics**:
  - **Trends**: Graph showing GPA changes over semesters. **Click legend items to focus on Overall or Major GPA.**
  - **Distribution**: Interactive pie charts for grade and course code types. **Click slices to filter the table.**
  - **Credits**: Bar chart for credits taken per semester. **Click bars to filter by semester.**
- **Course Table**: A list view of all courses with sorting and filtering options.
- **Bilingual**: Supports both Korean and English UI.

## How to Run

Run this project on a local web server (e.g., using Python):

1. Open a terminal in the project folder.
2. Run: `python -m http.server`
3. Open `http://localhost:8000` in your browser.

## Customization
To use this dashboard for your own academic records, simply modify `courses.csv`. Replace the sample data with your own transcript, ensuring the column headers remain unchanged.

## Tech Stack

- **Core**: HTML5, CSS3, Vanilla JavaScript (ES6+)

- **Visualization**: D3.js (v7)
