# build.ps1
# This script bundles the application into a single executable

# Activate virtual environment
. .\venv\Scripts\Activate.ps1

# Run PyInstaller
# --name: Name of the generated .exe
# --onefile: Bundle into a single executable file
# --add-data: Include the built React frontend in the 'dist' folder inside the executable
# --hidden-import: Sometimes FastAPI/Uvicorn needs these explicitly
pyinstaller --name "HealthAssistant" `
            --onefile `
            --add-data "..\frontend\dist;dist" `
            --hidden-import="uvicorn.logging" `
            --hidden-import="uvicorn.protocols.http.h11_impl" `
            --hidden-import="uvicorn.protocols.http.httptools_impl" `
            --hidden-import="uvicorn.protocols.websockets.websockets_impl" `
            --hidden-import="uvicorn.lifespan.on" `
            --clean `
            main.py

Write-Host "Build complete! Check the 'dist' folder in the backend directory for HealthAssistant.exe"
