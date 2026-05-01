------

# Project Structure

## Project Idea

**TaskShare** is a social productivity web application.
It helps users manage their tasks, track completed work, and share achievements with other users.
The app combines personal productivity with social interaction.
Users can create tasks, complete them, archive them, post finished tasks to a public feed, and interact through comments.
The app may also include **optional Google Calendar integration** for due dates and reminders.

------

# 1. Main Pages

## 1. Home / Landing Page

This is the first page of the website.
It introduces the app, explains its purpose, and shows the main actions such as **Log In** and **Sign Up**.
It may also show a preview of recent public posts.

## 2. Login Page

This page allows existing users to log in to their account.
Users enter their email or username and password.
After a successful login, they are redirected to their dashboard.

## 3. Signup Page

This page allows new users to create an account.
It includes fields such as username, email, password, and password confirmation.
After registration, the user can log in and start using the app.

## 4. Dashboard Page

This is the main page for logged-in users.
It shows their tasks and lets them create, edit, complete, delete, and organise tasks.
This page is the centre of the user’s daily productivity.

## 5. Archive Page

This page shows completed or archived tasks.
It helps users keep a record of past work.
Users may also choose to share a completed task from this page.

## 6. Feed / Social Page

This page shows public posts shared by all users.
It is the main social area of the app.
Users can browse other people’s completed tasks and interact with them.

## 7. Own Profile Page

This page shows the logged-in user’s profile.
It includes basic user information and a summary of their activity, such as number of completed tasks or shared posts.

## 8. Other User Profile Page

This page allows users to view another person’s profile.
It shows that user’s public posts and basic public activity.
This supports transparency and community interaction.

------

# 2. Core Features

## 1. User Authentication

Users can sign up, log in, and log out securely.

## 2. Task Management

Users can create, edit, delete, and complete tasks.

## 3. Archive System

Completed tasks can be moved to an archive so users can keep their dashboard clean.

## 4. Task Sharing

Users can share completed tasks as public posts on the feed.

## 5. Social Feed

Users can view posts from other users in a global feed.

## 6. Comments

Users can comment on shared posts to support interaction and discussion.

## 7. User Profiles

Each user has a profile page.
Users can also visit other users’ profile pages.

## 8. Google Calendar Integration (Optional / Extended Feature)

Users may connect tasks with Google Calendar.
For example, they may add a due date or create a calendar event for a task.

------

# 3. MVP Priority

## Priority 1 — Must Have

These are the most important features.
The project should work even if only these are completed.

- Signup
- Login
- Logout
- Create task
- Edit task
- Delete task
- Mark task as completed
- Archive completed task
- Save user data in database
- Dashboard page

## Priority 2 — Should Have

These features are very important because they support the **social** part of the app and help meet the course requirements.

- Share completed task as a public post
- Feed page to view other users’ posts
- Own profile page
- Other user profile page

## Priority 3 — Nice to Have

These features improve the app, but they are not the first priority.

- Comments on posts
- Search or filtering
- Profile statistics
- Better post design
- Google Calendar integration
- Reminder system

------

# 4. Suggested Main User Flow

1. A user signs up or logs in.
2. The user creates tasks in the dashboard.
3. The user completes a task.
4. The completed task is moved to archive.
5. The user can choose to share it as a public post.
6. Other users can see the post in the feed.
7. Other users can visit the profile page or leave comments.
8. Optionally, the user can sync a task with Google Calendar.

------

# 5. Short Version for Team Discussion

**Main pages:**
Home, Login, Signup, Dashboard, Archive, Feed, Own Profile, Other User Profile

**Core features:**
Authentication, task management, archive, task sharing, social feed, comments, profiles, optional Google Calendar integration

**MVP priority:**
First finish authentication + dashboard + task CRUD + archive
Then add sharing + feed + profiles
Finally add comments + search + Google Calendar

------

