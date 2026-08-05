# 🖥️ EC2 Deployment & Server Configuration Reference Guide

This document contains server details, configuration files, and step-by-step commands to pull, merge, migrate, and restart the backend application on the production EC2 instance.

---

## 📋 Server Information

| Attribute | Details |
| :--- | :--- |
| **Instance ID** | `i-086e278e2e042d6be` |
| **Name** | `Institutemanage` |
| **Public IPv4 Address** | `3.110.78.177` |
| **Public DNS** | `ec2-3-110-78-177.ap-south-1.compute.amazonaws.com` |
| **Private IP** | `172.31.26.160` |
| **SSH User** | `ec2-user` (Amazon Linux 2023) |
| **Key Pair File** | `institutemanage.pem` (stored in `backend-vidyanekethan/institutemanage.pem`) |
| **App Path on Server** | `/app/backend-vidyanekethan` |
| **PM2 Process Name** | `vidyanekethan` |
| **Express Server Port** | `5001` (internal Node backend) / `5002` (external/proxy port) |

---

## 🛠️ Step-by-Step Deployment Workflow

Always follow these steps to commit locally, push to the fork, merge on EC2 safely, migrate database changes, and restart backend processes.

### Step 1: Commit and Push Local Changes
Run these commands locally inside your `backend-vidyanekethan` folder to commit your updates and push them to the fork repository on GitHub:

```bash
# 1. Stage updated files
git add src/server.js src/controllers/invoicesController.js

# 2. Commit the changes
git commit -m "feat: register student attendance and rank history routes, update invoices serial number"

# 3. Push to your feature branch on the fork repository
git push fork feature/standard-batch-branch-integration
```

---

### Step 2: SSH Connect and Fetch Changes on EC2
Connect to the server and fetch the latest commits from the fork:

```bash
# Connect to the EC2 server (run from folder containing the pem key)
ssh -i backend-vidyanekethan/institutemanage.pem ec2-user@3.110.78.177

# Go to the application directory on the server
cd /app/backend-vidyanekethan

# Fetch latest branches from the fork
git fetch fork
```

---

### Step 3: Safe Merge (Preserve Production `.env`)
Since Git history tracks `.env` templates, you must temporarily back up and hide the production `.env` file on the server before merging to prevent Git from deleting or overwriting it:

```bash
# 1. Back up and rename production environment configuration
cp .env .env.bak
mv .env .env.temp

# 2. Fast-forward merge the fetched branch into main
git merge fork/feature/standard-batch-branch-integration --no-edit

# 3. Restore production environment configuration
mv .env.temp .env
rm -f .env.bak

# 4. Set Git to ignore changes in .env so it remains clean
git update-index --assume-unchanged .env
```

---

### Step 4: Run Database Migrations
If there are schema changes or new columns, run the migration scripts:

```bash
# Run the receipt fields column schema updates
node src/db/migrate_receipt_fields.js
```

---

### Step 5: Restart the App and Verify Logs
Restart the server process using PM2 to load the updated Javascript files:

```bash
# Restart the backend process
pm2 restart vidyanekethan

# Verify that the server is online and database connected successfully
pm2 logs vidyanekethan --lines 20 --raw --nostream
```

---

## 📜 Handy Diagnostics Commands

* **Check running PM2 apps:** `pm2 list`
* **Check app status detail:** `pm2 show vidyanekethan`
* **Tail active error logs:** `pm2 logs vidyanekethan`
* **Verify MySQL Database Tables:**
  ```bash
  mysql -u root -pNishant -D vidyaniketan -e "SHOW TABLES;"
  ```

---

## Recent Updates (Standard Batch & Branch Integration V2)

### Backend API Updates
- **Course Batches**: Added a dynamic `course_batches` table and `GET /api/course-batches` endpoint to manage Junior/Senior categories.
- **Aadhaar Uniqueness**: Added duplicate record detection on `POST /api/students` and `PUT /api/students/:id`. A new route `GET /api/students/duplicates` fetches all students with identical Aadhaar numbers.
- **Database Migration**: Required running `node src/db/migrate.js` to seed initial dynamic batches and create new tables.

### Frontend Updates
- **Duplicate Students Dashboard**: Improved type definitions and removed implicit `any` typescript errors to fix production builds.
- **Student Content UI**: Fixed React state typing issues (`SetStateAction<Student[]>`) to properly align the UI components with the backend API response structures.
- **Git Push Protection bypass**: Addressed issue with GitHub secret scanning blocking direct token commits.

*Note: For a fully detailed step-by-step breakdown of this integration session, refer to `development_session_summary.md`.*
