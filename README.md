🚧 RoadRakshak



\### AI-Powered Road Damage Detection \& Citizen Reporting System



RoadRakshak is an intelligent road-condition monitoring and reporting platform that uses computer vision to detect road defects, estimate their severity, assign repair priorities, and organize citizen reports for municipal action.



\---



\## 🎯 Overview



RoadRakshak bridges the gap between citizens and municipal road-maintenance teams.



Users can upload a photograph of a damaged road, optionally provide GPS coordinates and a landmark, and run an AI-based inspection. The system detects road defects using a custom-trained YOLO model and generates severity and priority information.



The platform is designed to transform raw road photographs into structured, actionable road-maintenance reports.



\---



\## ✨ Key Features



\- 📸 Road damage image upload

\- 🤖 Custom YOLO-based road defect detection

\- 🎯 Bounding-box visualization of detected defects

\- 📊 AI confidence scores

\- 📐 Automated severity scoring

\- 🚨 Priority classification for municipal response

\- 📍 GPS coordinate capture

\- 🗺️ Location-based incident organization

\- 👥 Citizen road-hazard reporting

\- 🔎 Individual incident dossier pages

\- 🛠️ Repair and assignment workflow

\- 📋 Centralized road incident dashboard

\- 🔐 User authentication

\- 📱 Responsive web interface



\---



\## 🧠 AI Road Damage Detection



RoadRakshak uses a custom-trained \*\*YOLO11s\*\* object-detection model for road-defect identification.



Current defect classes include:



| Class | Defect |

|------|--------|

| D00 | Longitudinal Crack |

| D20 | Alligator Crack |

| D40 | Pothole |



The AI pipeline provides:



1\. Image preprocessing

2\. Object detection

3\. Bounding-box generation

4\. Confidence estimation

5\. Defect classification

6\. Severity calculation

7\. Priority assignment



\---



\## 📐 Severity Scoring



RoadRakshak calculates a severity score on a \*\*0–10 scale\*\*.



The scoring system considers multiple factors:



\- \*\*Damage Class — 30%\*\*

\- \*\*Bounding Box Surface Area — 30%\*\*

\- \*\*Model Confidence — 20%\*\*

\- \*\*Defect Density — 20%\*\*



The resulting score is used to classify the incident and determine an appropriate municipal response priority.



\---



\## 🚨 Priority System



Detected incidents are assigned response priorities based on their severity.



| Priority | Response |

|---------|----------|

| P1 | Critical / Immediate |

| P2 | High Priority |

| P3 | Medium Priority |



This helps municipal teams focus first on road defects that present the greatest risk to road users.



\---



\## 🏗️ System Architecture



```text

Citizen

&#x20;  │

&#x20;  ▼

RoadRakshak Web Interface

&#x20;  │

&#x20;  ├── Authentication

&#x20;  ├── Image Upload

&#x20;  ├── GPS Location

&#x20;  └── Incident Dashboard

&#x20;          │

&#x20;          ▼

&#x20;     Flask Backend

&#x20;          │

&#x20;    ┌─────┴─────┐

&#x20;    ▼           ▼

YOLO11s AI    SQLite DB

Detection

&#x20;    │

&#x20;    ▼

Severity Engine

&#x20;    │

&#x20;    ▼

Priority Assignment

&#x20;    │

&#x20;    ▼

Municipal Incident Queue

