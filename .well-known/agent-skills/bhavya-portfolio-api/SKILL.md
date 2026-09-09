# Skill: Bhavya Portfolio API Interaction

Exposes endpoints to retrieve Bhavya Jangid's projects, read blog entries, and submit inquiries.

## Endpoints

### 1. Projects Retrieval
- **Path**: `/api/projects`
- **Method**: `GET`
- **Response**: Array of project objects including tags, categories, descriptions, and demo links.

### 2. Engineering Logs (Blogs)
- **Path**: `/api/blogs`
- **Method**: `GET`
- **Response**: Array of blog articles with publish dates, tags, summaries, and paths.

### 3. Contact Form Submission
- **Path**: `/api/contact`
- **Method**: `POST`
- **Request Body**:
  - `name`: string (max 100 characters)
  - `email`: string (max 100 characters)
  - `message`: string (max 5000 characters)
- **Response**: Confirmation payload.
