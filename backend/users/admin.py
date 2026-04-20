# This file configures the Django Admin interface for custom User model.
# It uses a custom UserAdmin to handle the unique fields of this model,
# such as the 'role' field, and provides a clean, logical display.
#
from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    # The 'list_display' tuple determines which fields are shown
    # in the main user list view in the admin.
    list_display = (
        "email",
        "username",
        "role",  # New field for the user's role
        "is_staff",
        "is_active",
        "date_joined",
    )
    
    # The 'list_filter' tuple provides a way to filter users by these fields.
    list_filter = ("role", "is_staff", "is_active", "is_superuser")
    
    # The 'search_fields' tuple allows searching for users by these fields.
    search_fields = ("email", "username")
    
    # The 'ordering' tuple sorts the list of users by default.
    ordering = ("-date_joined",)

    # 'fieldsets' controls the layout and fields for the change user form.
    # We've added the 'Role Information' fieldset for our custom role.
    fieldsets = (
        (None, {"fields": ("email", "username", "password")}),
        ("Role Information", {"fields": ("role",)}),  # Our custom field
        ("Permissions", {"fields": ("is_staff", "is_active", "is_superuser", "groups", "user_permissions")}),
        ("Important Dates", {"fields": ("last_login", "date_joined")}),
    )

    # 'add_fieldsets' controls the layout for the add user form.
    # The 'role' field has been included here as well.
    add_fieldsets = (
        (None, {
            "classes": ("wide",),
            "fields": (
                "email",
                "username",
                "password",
                "role",
                "is_staff",
                "is_active",
            ),
        }),
    )

    # This method is crucial to prevent the 'email' from being a link
    # to itself, which would cause an error. Instead, it links to the user page.
    def get_form(self, request, obj=None, **kwargs):
        form = super().get_form(request, obj, **kwargs)
        is_superuser = request.user.is_superuser
        disabled_fields = set()  # type: set[str]

        if not is_superuser:
            disabled_fields.add("is_superuser")

        for f in disabled_fields:
            if f in form.base_fields:
                form.base_fields[f].disabled = True
        
        return form