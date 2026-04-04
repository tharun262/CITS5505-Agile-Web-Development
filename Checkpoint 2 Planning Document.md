# Checkpoint 2 Planning Document

## Project Title
**KeepLite**  
*A Google Keep-inspired note-taking web application*

---

## 1. Project Overview

KeepLite is a web application inspired by Google Keep. It allows users to create, organise, and manage different types of notes in a clean and intuitive interface. Users can create text notes and checklist notes, assign colours, pin important notes, archive old notes, and organise notes using labels.

In addition to personal note management, KeepLite will also include a public sharing feature. Users will be able to mark selected notes as public, allowing other users to browse and view shared notes. This helps the application satisfy the course requirement that users must be able to view data from other users.

The goal of the application is to provide a simple, visually engaging, and effective productivity tool for users who want to manage ideas, reminders, and task lists in one place.

---

## 2. Target Users

The main target users of KeepLite are students and general users who want a lightweight note-taking system for daily organisation. The application is especially suitable for users who want a clean interface for quickly recording ideas, tasks, reminders, and short study notes.

---

## 3. Core Value of the Application

KeepLite aims to provide value to users in the following ways:

- It helps users quickly capture ideas and tasks.
- It provides a visually clear way to organise notes.
- It supports both personal productivity and lightweight content sharing.
- It offers a simple and intuitive interface inspired by a familiar real-world application.

---

## 4. How the Application Meets the Course Requirements

### Client-server architecture
The application will use a browser-based frontend and a Flask backend. The client will send requests to the server, and the server will process data and generate responses.

### Login and logout
Users will be able to register for an account, log in securely, and log out when finished.

### Persistent user data
User accounts, note content, labels, colours, pinned status, archive status, and sharing settings will be stored in a SQLite database so that data is preserved between sessions.

### View data from other users
Users will be able to browse notes that other users have chosen to make public. This ensures the application includes a way for users to view data from other users.

---

## 5. Proposed Core Features

The proposed features of KeepLite include:

- User registration
- User login and logout
- Create text notes
- Create checklist notes
- Edit notes
- Delete notes
- Pin notes
- Archive notes
- Add colours to notes
- Add labels to notes
- Search notes
- View notes by label
- Mark notes as public or private
- Browse public notes from other users

---

## 6. User Stories

1. **As a new user, I want to create an account, so that I can save and manage my own notes.**

2. **As a registered user, I want to log in, so that I can access my existing notes.**

3. **As a user, I want to log out, so that my account remains secure on shared devices.**

4. **As a user, I want to create a text note, so that I can quickly record ideas or reminders.**

5. **As a user, I want to create a checklist note, so that I can manage tasks more easily.**

6. **As a user, I want to edit a note, so that I can update or correct its content.**

7. **As a user, I want to delete a note, so that I can remove content I no longer need.**

8. **As a user, I want to pin important notes, so that they stay visible at the top of my notes page.**

9. **As a user, I want to archive notes, so that I can hide old notes without deleting them.**

10. **As a user, I want to assign colours to notes, so that I can organise them visually.**

11. **As a user, I want to add labels to notes, so that I can group related notes together.**

12. **As a user, I want to search my notes, so that I can quickly find specific content.**

13. **As a user, I want to mark a note as public, so that other users can view it.**

14. **As a user, I want to browse public notes from other users, so that I can discover useful or interesting content.**

15. **As a user, I want to view notes under a selected label, so that I can focus on one category at a time.**

---

## 7. Main Pages of the Website

### 1. Landing Page
This page introduces the application, explains its purpose, and provides links to sign up or log in.

### 2. Sign Up Page
This page allows new users to create an account.

### 3. Login Page
This page allows existing users to sign in.

### 4. Notes Dashboard
This is the main page for logged-in users. It displays the user’s notes in a card-based layout, including pinned notes and regular notes.

### 5. Create / Edit Note Interface
Users will be able to add or edit notes through a note form, modal, or dedicated page.

### 6. Archive Page
This page displays notes that the user has archived.

### 7. Label View Page
This page displays notes filtered by a selected label.

### 8. Public Notes Page
This page allows users to browse notes shared publicly by other users.

### 9. Search Results Page
This page displays notes that match the user’s search input.

---

## 8. Frontend UI and Design Plan

The interface of KeepLite is inspired by Google Keep. The design goals are:

- **Minimalist:** a clean interface without unnecessary clutter
- **Intuitive:** easy for first-time users to understand
- **Engaging:** visually appealing with note cards, colours, and simple layout
- **Responsive:** usable on both desktop and smaller screens

The expected UI structure includes:

- a top navigation/search bar
- a sidebar for navigation options
- a card-based note layout
- colour-coded notes
- separate sections for pinned notes and regular notes

The overall visual style will focus on simplicity, spacing, and clarity.

---

## 9. CSS Framework Choice

We plan to use **Bootstrap** as our CSS framework.

### Proposed reason
We chose Bootstrap because its robust Grid system and flexbox utilities are perfectly suited for building the responsive, card-based masonry layout required for a Google Keep-style dashboard. Furthermore, Bootstrap's pre-built JavaScript components,will allow us to easily implement the "Create/Edit Note" pop-ups and the mobile-responsive navigation menu without writing complex custom CSS/JS from scratch.

---

## 10. Early Frontend Work for Checkpoint 2

For Checkpoint 2, we plan to prepare static HTML/CSS prototypes for several important pages. These pages do not need to be fully interactive yet, but they should help demonstrate how the final application will look and function.

The pages we aim to prototype include:

- Landing page
- Login page
- Notes dashboard
- Public notes page

These prototypes will be committed to GitHub before the checkpoint meeting.

---

## 11. Team Organisation

Our team will organise work in the following way:

- We will meet regularly as a group to discuss progress and next steps.
- We will communicate using **Teams**.
- We will use GitHub Issues to track tasks and responsibilities.
- We will use pull requests when merging work into the main branch.
- During this stage, team members will mainly focus on planning, UI design, and static frontend pages.

---

## 12. Current Scope for Checkpoint 2

At this stage, our main focus is on:

- deciding the final application concept
- identifying key features
- writing user stories
- planning the page structure
- creating initial frontend UI prototypes

We understand that the backend implementation should not begin until the relevant Flask content has been covered in class.

---

## 13. Summary

KeepLite is a Google Keep-inspired web application that focuses on note-taking, organisation, and lightweight sharing. It is designed to be visually clear, easy to use, and suitable for the technical and functional requirements of the project. Our Checkpoint 2 work will focus on planning the application carefully and building an initial frontend prototype to demonstrate the proposed design and user flow.