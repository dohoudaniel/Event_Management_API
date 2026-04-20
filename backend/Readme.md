Event Management API
# EventFlow - Event Management API

This repository contains the source code for a robust and scalable Event Management API. It provides a comprehensive solution for creating, managing, and interacting with events, including features for user registration, venue management, and details about speakers and sponsors.
Key Features
A robust and scalable RESTful API for managing events, built with Django and Django REST Framework. This API provides a comprehensive solution for creating, managing, and interacting with events, including features for user registration with roles, event lifecycle management, private event invitations, and more.

    User Management: Create and manage user profiles with different roles (e.g., organizer, attendee).
## ✨ Key Features

    Event Lifecycle: Full CRUD (Create, Read, Update, Delete) operations for events, including status tracking (upcoming, active, completed).
*   **User Management**:
    *   User registration and authentication using JSON Web Tokens (JWT).
    *   Role-based access control (`Organizer`, `Attendee`).
    *   User profile management.
*   **Event Lifecycle**:
    *   Full CRUD (Create, Read, Update, Delete) operations for events.
    *   Support for public and private events.
    *   Event status tracking (upcoming, active, completed).
*   **Advanced Filtering & Search**:
    *   Full-text search across event names, descriptions, and locations.
    *   Filter events by date range, location (city/state), category, tags, and organizer.
*   **Registration & Invitation System**:
    *   Allows users to register for public events.
    *   Organizers can send email invitations for private events.
    *   Secure token-based invitation acceptance.
*   **Rich Event Details**:
    *   Manage venues, speakers, and sponsors associated with events.
    *   Categorize and tag events for better organization.
*   **Asynchronous Operations**:
    *   Uses Celery and Redis for background tasks like sending invitation emails and event reminders.
*   **API Documentation**:
    *   Automatically generated, interactive API documentation with Swagger UI and ReDoc.
*   **Health Check**:
    *   A dedicated endpoint to monitor the API's operational status.

    Registration System: Allows users to register for events, with support for tracking registration status and payment details.
## 🛠️ Tech Stack

    Venue Management: Handle information for physical venues, including capacity and address details.
*   **Backend**: Python, Django, Django REST Framework
*   **Database**: PostgreSQL (recommended), SQLite3 (for development)
*   **Authentication**: `djangorestframework-simplejwt` (JWT)
*   **Asynchronous Tasks**: Celery, Redis
*   **API Documentation**: `drf-spectacular` (OpenAPI 3)
*   **Configuration**: `python-decouple` (for environment variables)
*   **CORS**: `django-cors-headers`

    Speaker & Sponsor Information: Associate speakers and sponsors with events to provide detailed event information.
## 🚀 Getting Started

Technologies
Follow these instructions to get the project up and running on your local machine for development and testing purposes.

    Backend: [Backend Language/Framework, Python with Django/Flask]
### Prerequisites

    Database: [PostgreSQL, MySQL]
*   Python 3.8+
*   PostgreSQL or another database system
*   Redis (for Celery)
*   Git

    API Documentation: [Swagger/OpenAPI]
### 1. Clone the Repository

    Authentication: [JWT, OAuth 2.0]
```bash
git clone https://github.com/Damilola640/Event_Management_API.git
cd Event_Management_API/event_planner
```

API Endpoints
### 2. Set Up a Virtual Environment

The API is built around a RESTful architecture and provides the following key endpoints:
It's recommended to use a virtual environment to manage project dependencies.

Endpoint
	
```bash
# For Unix/macOS
python3 -m venv venv
source venv/bin/activate

Description
+# For Windows
python -m venv venv
.\venv\Scripts\activate
```

POST /api/auth/register
	
### 3. Install Dependencies

Creates a new user account.
Install all the required packages from `requirements.txt`.

POST /api/auth/login
	
```bash
pip install -r requirements.txt
```

Authenticates a user and returns a token.
### 4. Configure Environment Variables

GET /api/events
	
Create a `.env` file in the `event_planner` directory (where `manage.py` is located). Copy the contents of `.env.example` into it and fill in the values.

Retrieves a list of all events.
**.env.example:**
```ini
SECRET_KEY='your-strong-secret-key'
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

POST /api/events
	
# Use PostgreSQL in production
# DATABASE_URL=postgres://user:password@host:port/dbname
DATABASE_URL=sqlite:///db.sqlite3

Creates a new event.
# Celery and Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

GET /api/events/{id}
	
# Email settings (using MailHog/console for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# EMAIL_HOST=localhost
# EMAIL_PORT=1025
# EMAIL_HOST_USER=
# EMAIL_HOST_PASSWORD=
DEFAULT_FROM_EMAIL=noreply@eventflow.com
```

Retrieves details for a specific event.
### 5. Run Database Migrations

PUT /api/events/{id}
	
Apply the database migrations to create the database schema.

Updates an existing event.
```bash
python manage.py migrate
```

DELETE /api/events/{id}
	
### 6. Create a Superuser

Deletes an event.
Create an admin user to access the Django admin panel.

POST /api/events/{id}/register
	
```bash
python manage.py createsuperuser
```

Registers the authenticated user for an event.
### 7. Run the Development Server

GET /api/users/{id}/registrations
	
Start the Django development server.

Retrieves all registrations for a user.
```bash
python manage.py runserver
```

GET /api/venues
	
The API will be available at `http://127.0.0.1:8000/`.

Retrieves a list of venues.
### 8. Run the Celery Worker

GET /api/speakers
	
To process background tasks like sending emails, you need to run a Celery worker in a separate terminal.

Retrieves a list of speakers.
```bash
# Make sure your virtual environment is activated
celery -A EventFlow worker -l info
```

GET /api/sponsors
	
## 📖 API Documentation

Retrieves a list of sponsors.
Getting Started
Once the server is running, you can access the interactive API documentation:

    Clone the repository:
    git clone [git@github.com:Damilola640/Event_Management_API.git]
*   **Swagger UI**: `http://127.0.0.1:8000/api/docs/`
*   **ReDoc**: `http://127.0.0.1:8000/api/redoc/`

    Install dependencies:
    cd [event_planner]
    [pip install -r requirements.txt]
## 🗺️ API Endpoints

    Set up the database:
All endpoints are prefixed with `/api/`.

        Create a database and configure your connection strings in the .env file.
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| **Health Check** |
| `GET` | `/core/health/` | Checks the API's operational status. | No |
| **Authentication & Users** |
| `POST` | `/users/register/` | Create a new user account. | No |
| `POST` | `/users/token/` | Authenticate and get JWT access/refresh tokens. | No |
| `POST` | `/users/token/refresh/` | Refresh an access token. | No |
| `GET` | `/users/profile/` | Get the current user's profile. | Yes |
| `PUT/PATCH` | `/users/profile/` | Update the current user's profile. | Yes |
| `GET` | `/users/` | List all users. | Admin Only |
| `GET` | `/users/<id>/` | Retrieve a specific user's details. | Admin Only |
| **Events** |
| `POST` | `/events/` | Create a new event. | Organizer Only |
| `GET` | `/events/` | List all accessible events (with filtering). | No |
| `GET` | `/events/<slug>/` | Retrieve a specific event. | Varies |
| `PUT/PATCH` | `/events/<slug>/` | Update an event. | Organizer Only |
| `DELETE` | `/events/<slug>/` | Delete an event. | Organizer Only |
| **Event Registration & Invitations** |
| `POST` | `/events/<slug>/register/` | Register for an event. | Yes |
| `POST` | `/events/<slug>/invite/` | Send an invitation to a private event. | Organizer Only |
| `GET` | `/invitations/<token>/accept/` | Accept an event invitation. | No |
| **Venues, Speakers, Sponsors, etc.** |
| `GET/POST` | `/events/venues/` | List or create venues. | Read: No, Write: Yes |
| `GET/PUT/DELETE` | `/events/venues/<id>/` | Retrieve, update, or delete a venue. | Read: No, Write: Yes |
| `GET/POST` | `/events/speakers/` | List or create speakers. | Read: No, Write: Yes |
| `GET/POST` | `/events/sponsors/` | List or create sponsors. | Read: No, Write: Yes |
| `GET/POST` | `/events/categories/` | List or create categories. | Read: No, Write: Yes |
| `GET/POST` | `/events/tags/` | List or create tags. | Read: No, Write: Yes |
| **Notifications** |
| `GET` | `/notifications/` | List notifications for the current user. | Yes |
| `POST` | `/notifications/<id>/mark-as-read/` | Mark a notification as read. | Yes |

        Run migrations: [python manage.py makemigrations, python manage.py migrate]
## 🤝 Contributing

    Run the server:
    [python manage.py runserver]
Contributions are welcome! Please feel free to submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

Contributing
1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

We welcome contributions! Please read our CONTRIBUTING.md file for more information on how to get involved.
## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.