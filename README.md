# Doctor Appointment System

Full-stack React.js + Node.js application with User, Doctor, and Admin roles.

## Features

- JWT authentication with role-based access
- Doctor registration with certificate upload and admin approval
- Admin settings for commission and branding logo
- Doctor availability slots
- Appointment booking with double-booking protection
- Fee calculation: doctor fee + admin commission
- 24-hour cancel/reschedule restriction
- Reschedule request with next available slot suggestion
- Prescriptions and appointment completion
- Booking and reminder notifications
- Dashboards for all roles

## Setup

1. Install MongoDB locally or use MongoDB Atlas.
2. Copy `.env.example` to `backend/.env`.
3. Install dependencies:

```bash
npm run install:all
```

4. Seed the default admin:

```bash
npm run seed --prefix backend
```

5. Start backend and frontend in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

## Default Admin

- Email: `admin@docapp.com`
- Password: `Admin@123`

## Demo Checklist

1. Register a doctor with certificate.
2. Login as admin and approve the doctor.
3. Login as doctor and create availability slots.
4. Register/login as user and book an appointment.
5. Verify commission in payable fee.
6. Doctor adds prescription and completes appointment.
7. User views prescription and notifications.
