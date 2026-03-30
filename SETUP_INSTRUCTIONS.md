# 🚀 Setup Instructions - KS Dental Clinic

Follow these steps to set up your application with PHP + MySQL backend.

## Prerequisites

Before you begin, ensure you have:
- ✅ **Node.js** (v18+) - Check: `node --version`
- ✅ **PHP** (v7.4+) - Check: `php --version` 
- ✅ **MySQL** (v5.7+) - Check: `mysql --version`

**Don't have PHP?** See [INSTALL_PHP.md](INSTALL_PHP.md) for installation instructions.

---

## Step 1: Install PHP (if needed)

If `php --version` doesn't work, you need to install PHP first.

### Quick Install with Chocolatey
```powershell
# Install Chocolatey first (if you don't have it)
# Then:
choco install php -y
```

### Manual Install
See [INSTALL_PHP.md](INSTALL_PHP.md) for detailed instructions.

### Verify
```powershell
php --version
```

---

## Step 2: Install MySQL

---

## Step 2: Install MySQL

### Download MySQL
1. Go to https://dev.mysql.com/downloads/installer/
2. Download **MySQL Installer for Windows**
3. Run the installer

### Installation Options
- Choose **Developer Default** or **Server Only**
- Set a **root password** (REMEMBER THIS!)
- Keep default port (3306)
- Install as Windows Service (recommended)

### Verify Installation
Open PowerShell and run:
```powershell
mysql --version
```
You should see the MySQL version number.

---

## Step 3: Create Database

### Option A: Automated Setup (Recommended)

1. Open PowerShell in the project folder
2. Run the setup script:
   ```powershell
   .\setup.bat
   ```
3. Enter your MySQL root password when prompted
4. The script will:
   - Create the `titanium_db` database
   - Import the schema
   - Create `.env` files

### Option B: Manual Setup

1. Open PowerShell
2. Login to MySQL:
   ```powershell
   mysql -u root -p
   ```
3. Enter your password
4. Create the database:
   ```sql
   CREATE DATABASE titanium_db;
   exit;
   ```
5. Import the schema:
   ```powershell
   cd php-backend
   mysql -u root -p titanium_db < database/schema.sql
   ```

---

## Step 4: Configure Environment Files

### Backend Configuration

1. Navigate to `php-backend` folder
2. Copy `.env.example` to `.env`:
   ```powershell
   cp .env.example .env
   ```
3. Edit `php-backend/.env` with your MySQL password:
   ```env
   DB_HOST=localhost
   DB_NAME=titanium_db
   DB_USER=root
   DB_PASSWORD=your_mysql_password_here
   ```

### Frontend Configuration

1. In the root folder, copy `.env.local.example` to `.env.local`:
   ```powershell
   cp .env.local.example .env.local
   ```
2. The file should contain:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8000/api
   ```

---

## Step 5: Start the Servers

### Option A: Start Both Together (Recommended)

Double-click `start-all.bat` or run in PowerShell:
```powershell
.\start-all.bat
```

This opens two terminal windows:
- **PHP Backend** on http://localhost:8000
- **Next.js Frontend** on http://localhost:3000

### Option B: Start Separately

**Terminal 1 - Backend:**
```powershell
.\start-backend.bat
```

**Terminal 2 - Frontend:**
```powershell
.\start-frontend.bat
```

---

## Step 6: Access the Application

1. Open your browser
2. Go to **http://localhost:3000**
3. You should see the login page

### First Time Setup

Since this is a fresh database, you need to create an account:

1. Click **Sign Up** (or navigate to signup page)
2. Create an admin account with:
   - Email: your.email@example.com
   - Password: (choose a strong password)
3. After signup, you'll be logged in automatically

---

## ✅ Verify Everything Works

### Test Backend API
Open http://localhost:8000 in your browser
You should see:
```json
{
  "message": "Titanium Dental Clinic API",
  "version": "1.0.0",
  "endpoints": {...}
}
```

### Test Database Connection
1. Login to your application
2. Try creating a test patient
3. Try creating a prescription
4. If it works, everything is set up correctly!

---

## 🛠️ Troubleshooting

### "PHP command not found"
**Problem:** PHP is not installed or not in PATH

**Solution:**
See [INSTALL_PHP.md](INSTALL_PHP.md) for installation instructions.
- Quick: `choco install php`
- Manual: Download from https://windows.php.net/download/

### "MySQL command not found"
**Problem:** MySQL is not in your PATH

**Solution:**
1. Find MySQL installation (usually `C:\Program Files\MySQL\MySQL Server 8.0\bin`)
2. Add to Windows PATH:
   - Search "Environment Variables" in Windows
   - Edit System PATH
   - Add MySQL bin folder
   - Restart PowerShell

### "Access denied for user 'root'"
**Problem:** Wrong MySQL password

**Solution:**
- Edit `php-backend/.env`
- Correct the `DB_PASSWORD` value
- Restart PHP server

### "Database 'titanium_db' doesn't exist"
**Problem:** Database not created

**Solution:**
```powershell
mysql -u root -p
CREATE DATABASE titanium_db;
exit;
```

### Port 8000 already in use
**Problem:** Another application is using port 8000

**Solution:**
1. Kill the process or use different port:
   ```powershell
   cd php-backend
   php -S localhost:8080 -t .
   ```
2. Update `.env.local`:
   ```env
   NEXT_PUBLIC_API_URL=http://localhost:8080/api
   ```

### Port 3000 already in use
**Problem:** Another Next.js app is running

**Solution:**
1. Stop other Next.js apps
2. Or use different port:
   ```powershell
   npm run dev -- -p 3001
   ```

### CORS errors in browser
**Problem:** Backend not allowing frontend requests

**Solution:**
1. Check `php-backend/config/cors.php`
2. Verify it has: `Access-Control-Allow-Origin: http://localhost:3000`
3. Make sure both servers are running

### "Session not found" or "Not authenticated"
**Problem:** Sessions not working

**Solution:**
1. Clear browser cookies
2. Make sure you're accessing via localhost (not 127.0.0.1)
3. Restart PHP server
4. Try logging in again

---

## 📋 Quick Reference

### Start Commands
```powershell
# Start both servers
.\start-all.bat

# Start backend only
.\start-backend.bat

# Start frontend only
.\start-frontend.bat
```

### Stop Servers
- Press `Ctrl + C` in terminal window
- Or close the terminal windows
- Or run: `taskkill /F /IM php.exe` and `taskkill /F /IM node.exe`

### Database Commands
```powershell
# Login to MySQL
mysql -u root -p

# Show databases
SHOW DATABASES;

# Use titanium database
USE titanium_db;

# Show tables
SHOW TABLES;

# View users
SELECT * FROM users;

# View patients
SELECT * FROM patients;
```

---

## 🎯 What to Do Next

1. **Create your first user** (signup)
2. **Add some patients** (Admin → Patients)
3. **Add medicines** (Admin → Medicines/Inventory)
4. **Create prescriptions** (Admin → Prescriptions)
5. **Generate bills** (within prescription view)

---

## 📞 Need Help?

If you're still having issues:
1. Check the browser console (F12) for errors
2. Check PHP terminal for error messages
3. Verify `.env` files are configured correctly
4. Make sure MySQL service is running
5. Restart both servers

---

**You're all set! 🎉**

The application should now be running with PHP backend and MySQL database.
