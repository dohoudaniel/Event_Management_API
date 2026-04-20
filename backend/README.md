# EventFlow - Event Management API

A robust and scalable RESTful API for managing events, built with Django and Django REST Framework. EventFlow provides a comprehensive solution for creating, managing, and interacting with events, including features for user registration with roles, event lifecycle management, private event invitations, and more.

## ✨ Key Features

- **User Management**: User registration and authentication using JSON Web Tokens (JWT) with role-based access control (Organizer, Attendee)
- **Event Lifecycle**: Full CRUD operations for events with status tracking (upcoming, active, completed)
- **Public & Private Events**: Support for both public event registration and private events via secure token-based invitations
- **Advanced Filtering & Search**: Full-text search across event names, descriptions, and locations with filtering by date range, location, category, tags, and organizer
- **Registration & Invitation System**: Event registration for public events and organizer-controlled invitations for private events
- **Rich Event Details**: Manage venues, speakers, sponsors, categories, and tags associated with events
- **Asynchronous Operations**: Celery and Redis integration for background tasks like sending invitation emails and event reminders
- **API Documentation**: Automatically generated, interactive API documentation with Swagger UI and ReDoc
- **Health Monitoring**: Dedicated endpoint to monitor the API's operational status

## 🛠️ Tech Stack

- **Backend**: Python 3.8+, Django 5.2, Django REST Framework
- **Database**: PostgreSQL (recommended), SQLite3 (for development)
- **Authentication**: `djangorestframework-simplejwt` (JWT)
- **Asynchronous Tasks**: Celery, Redis
- **API Documentation**: `drf-spectacular` (OpenAPI 3)
- **Configuration**: `python-decouple` (for environment variables)
- **CORS**: `django-cors-headers`

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- Python 3.8 or higher
- PostgreSQL or SQLite3 (SQLite3 comes with Python)
- Redis (for Celery background tasks)
- Git
- pip (Python package manager)

## 🚀 Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Damilola640/Event_Management_API.git
cd Event_Management_API/backend
```

### 2. Create a Virtual Environment

It's recommended to use a virtual environment to manage project dependencies.

```bash
# For Unix/macOS
python3 -m venv venv
source venv/bin/activate

# For Windows
python -m venv venv
.\venv\Scripts\activate
```

### 3. Install Dependencies

Install all required packages from `requirements.txt`.

```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables

Create a `.env` file in the backend directory (where `manage.py` is located) and configure your environment variables.

**Example `.env` file:**

```ini
# Security
SECRET_KEY='your-strong-secret-key-here'
DEBUG=True
ALLOWED_HOSTS=127.0.0.1,localhost

# Database
# For SQLite (development)
DATABASE_URL=sqlite:///db.sqlite3

# For PostgreSQL (production)
# DATABASE_URL=postgres://user:password@localhost:5432/eventflow

# Celery and Redis
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0

# Email Configuration (using Console Backend for development)
EMAIL_BACKEND=django.core.mail.backends.console.EmailBackend
# For production, configure your email service:
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_HOST_USER=your-email@gmail.com
# EMAIL_HOST_PASSWORD=your-app-password
DEFAULT_FROM_EMAIL=noreply@eventflow.com

# Base URL for invitation links
BASE_URL=http://localhost:3000
```

### 5. Run Database Migrations

Apply database migrations to create the database schema.

```bash
python manage.py migrate
```

### 6. Create a Superuser

Create an admin user to access the Django admin panel.

```bash
python manage.py createsuperuser
```

Follow the prompts to set username, email, and password.

### 7. Run the Development Server

Start the Django development server.

```bash
python manage.py runserver
```

The API will be available at `http://127.0.0.1:8000/`.

### 8. Run the Celery Worker (In a Separate Terminal)

To process background tasks like sending emails, run a Celery worker in a separate terminal.

```bash
# Make sure your virtual environment is activated
celery -A EventFlow worker -l info
```

## 📖 API Documentation

Once the server is running, access the interactive API documentation:

- **Swagger UI**: http://127.0.0.1:8000/api/docs/
- **ReDoc**: http://127.0.0.1:8000/api/redoc/

## 🗺️ API Endpoints

All endpoints are prefixed with `/api/`.

### Health Check

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/core/health/` | Checks the API's operational status | No |

### Authentication & Users

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/users/register/` | Create a new user account | No |
| `POST` | `/users/token/` | Authenticate and get JWT access/refresh tokens | No |
| `POST` | `/users/token/refresh/` | Refresh an access token | No |
| `GET` | `/users/profile/` | Get the current user's profile | Yes |
| `PUT/PATCH` | `/users/profile/` | Update the current user's profile | Yes |
| `GET` | `/users/` | List all users | Admin Only |
| `GET` | `/users/<id>/` | Retrieve a specific user's details | Admin Only |

### Events

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/events/` | Create a new event | Organizer Only |
| `GET` | `/events/` | List all accessible events (with filtering) | No |
| `GET` | `/events/<slug>/` | Retrieve a specific event | Varies |
| `PUT/PATCH` | `/events/<slug>/` | Update an event | Organizer Only |
| `DELETE` | `/events/<slug>/` | Delete an event | Organizer Only |

### Event Registration & Invitations

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/events/<slug>/register/` | Register for an event | Yes |
| `POST` | `/events/<slug>/invite/` | Send an invitation to a private event | Organizer Only |
| `GET` | `/invitations/<token>/accept/` | Accept an event invitation | No |

### Venues, Speakers, Sponsors, Categories & Tags

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET/POST` | `/events/venues/` | List or create venues | Read: No, Write: Yes |
| `GET/PUT/DELETE` | `/events/venues/<id>/` | Retrieve, update, or delete a venue | Read: No, Write: Yes |
| `GET/POST` | `/events/speakers/` | List or create speakers | Read: No, Write: Yes |
| `GET/PUT/DELETE` | `/events/speakers/<id>/` | Retrieve, update, or delete a speaker | Read: No, Write: Yes |
| `GET/POST` | `/events/sponsors/` | List or create sponsors | Read: No, Write: Yes |
| `GET/PUT/DELETE` | `/events/sponsors/<id>/` | Retrieve, update, or delete a sponsor | Read: No, Write: Yes |
| `GET/POST` | `/events/categories/` | List or create categories | Read: No, Write: Yes |
| `GET/POST` | `/events/tags/` | List or create tags | Read: No, Write: Yes |

### Notifications

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET` | `/notifications/` | List notifications for the current user | Yes |
| `POST` | `/notifications/<id>/mark-as-read/` | Mark a notification as read | Yes |

## 📁 Project Structure

```
backend/
├── EventFlow/              # Django project configuration
│   ├── settings.py         # Project settings and configuration
│   ├── urls.py             # Main URL routing
│   ├── wsgi.py             # WSGI application entry point
│   ├── asgi.py             # ASGI application entry point
│   └── celery.py           # Celery configuration
├── core/                   # Core application
│   ├── models.py           # Base models and mixins
│   ├── views.py            # Health check and utility views
│   ├── urls.py             # Core app URL routing
│   └── migrations/         # Database migrations
├── events/                 # Events application
│   ├── models.py           # Event, Venue, Speaker, Sponsor models
│   ├── views.py            # Event viewsets and API logic
│   ├── serializers.py      # DRF serializers for models
│   ├── tasks.py            # Celery async tasks
│   ├── urls.py             # Events app URL routing
│   └── migrations/         # Database migrations
├── users/                  # Users application
│   ├── models.py           # Custom user model
│   ├── views.py            # User viewsets and authentication logic
│   ├── serializers.py      # DRF serializers for users
│   ├── urls.py             # Users app URL routing
│   └── migrations/         # Database migrations
├── manage.py               # Django management script
├── requirements.txt        # Python dependencies
└── README.md               # This file
```

## 🤝 Contributing

Contributions are welcome! Please follow these steps to contribute:

1. **Fork the Project**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Event_Management_API.git
   cd Event_Management_API/backend
   ```

2. **Create a Feature Branch**
   ```bash
   git checkout -b feature/YourAmazingFeature
   ```

3. **Make Your Changes**
   - Write clean, well-commented code
   - Follow the existing code style
   - Add tests for new functionality

4. **Commit Your Changes**
   ```bash
   git commit -m 'Add some YourAmazingFeature'
   ```

5. **Push to the Branch**
   ```bash
   git push origin feature/YourAmazingFeature
   ```

6. **Open a Pull Request**
   - Provide a clear description of your changes
   - Link any related issues

For detailed contribution guidelines, see `CONTRIBUTING.md` (if available).

## 📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.

## 📧 Support

For support, questions, or issues, please open an issue on the GitHub repository or contact the development team.

---

**Happy coding! 🚀**