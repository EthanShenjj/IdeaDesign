@echo off
echo Installing AI Vision Style Platform Backend...
echo.

REM Check Python version
python --version
echo.

REM Ask about virtual environment
set /p create_venv="Create virtual environment? (y/n): "
if "%create_venv%"=="y" (
    echo Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    echo Virtual environment activated
)

REM Install dependencies
echo.
echo Installing dependencies...
pip install -r requirements.txt

REM Create directories
echo.
echo Creating directories...
if not exist uploads mkdir uploads
if not exist data mkdir data

REM Copy .env file
if not exist .env (
    echo.
    echo Creating .env file...
    copy .env.example .env
    echo .env file created
    echo Please edit .env file if you want to use MySQL
)

echo.
echo Installation complete!
echo.
echo To start the server:
echo   python app.py
echo.
echo Or with virtual environment:
echo   venv\Scripts\activate.bat
echo   python app.py
pause
