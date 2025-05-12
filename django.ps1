# Define the project name and root directory
$projectName = "ecommerce_project"
$djangoProjectName = "ecommerce"
$apps = @("users", "products", "cart", "orders", "payments", "referrals", "core")

# Create the project directory
New-Item -ItemType Directory -Path $projectName -Force
Set-Location $projectName

# Initialize a virtual environment (optional)
python -m venv venv
.\venv\Scripts\activate

# Install Django
pip install django

# Start the Django project
django-admin startproject $djangoProjectName

# Move into the Django project directory
Set-Location $djangoProjectName

# Create apps
foreach ($app in $apps) {
    python manage.py startapp $app
}

# Create additional directories
$directories = @(
    "static",
    "media",
    "templates",
    "templates/emails"
)

foreach ($dir in $directories) {
    New-Item -ItemType Directory -Path $dir -Force
}

# Create a requirements.txt with common Django packages
@"
django==5.0.6
django-environ
django-crispy-forms
pillow
stripe
"@ | Out-File -FilePath "..\requirements.txt" -Encoding utf8

# Print success message
Write-Host "✅ Django e-commerce project structure created successfully!" -ForegroundColor Green
Write-Host "Next steps:"
Write-Host "1. Add your apps to INSTALLED_APPS in $djangoProjectName/settings.py"
Write-Host "2. Configure databases, static files, and media settings."
Write-Host "3. Run 'python manage.py migrate' to set up the database."