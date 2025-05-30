# Opinia

[Render Client](https://opinia-f4lk.onrender.com) |
[Render Server](https://opinia-1z72.onrender.com) |
[GitHub Repo](https://github.com/TobySpooner/Opinia)

## Team Members

- [Connor McDonald](https://github.com/OCSYT)
- [Dylan Bullock](https://github.com/DylanBk)
- [Jaden Ebbage-Renwick](https://github.com/jser7)
- [Reuben Dubois](https://github.com/RoobnAccessCreative)
- [Toby Spooner](https://github.com/TobySpooner)

## Project Description

A social media that allows users to express their opinions on various topics, posts can be liked if people agree and the comments encourage users to interact and engage in debates about topics.

## Problem Domain

Social Media

## User Stories

- As a user, I want to view other people's posts and be abl to scroll through them.
- As a user, I want to be able to create an account and sign in to it.
- As a user, I want to be able to create posts.
- As a user, I want to be able to interact with posts (liking and commenting).
- As a user, I want to be able to make changes to my account including changing details like my username or even deleting it.
- As a user, I want to be able to request a copy of my data.

## Tech Stack

### Database

- Supabase
- PostgreSQL

### Server

- CORS
- Bcrypt
- dotenv
- Express
- Express Session
- Nodemon
- PostgreSQL

### Client

- Vite

## How To Use

- Press the windows key and search "CMD"
- Start the command line application
- Go to path/to/Opinia and enter the following commands:
  - `cd server`
  - `npm install`
  - `npm run dev`
  - There should be a message in the terminal indicating that the server is running.
- Start another instance of the terminal and locate path/to/Opinia again
- Enter the following commands:
  - `cd client`
  - `npm install`
  - `npm run dev`
  - The website should open in a new tab in your browser
  - If this does not happen, try going to [http://localhost:3000](http://localhost:3000) in your browser
- Both the server and client should be running now and you can use the website

## Lighthouse Report

### Overview

- Performance — 94
- Accessibility — 100
- Best Practices — 96
- SEO — 83

### Metrics

- First Contentful Paint — 1.1s
- Largest Contentful Paint — 1.1s
- Total Blocking Time — 0ms
- Cumulative Layout Shift — 0.003
- Speed Index — 1.4s

## Reflections

### Project Requirements

Design and Planning:

- Wireframes and HiFi diagrams were successfully made

Front-End:

- The HTML & CSS works, although there are a few issues with consistency across the pages and some assets not loading.

Interactivity:

- Users can create accounts and login to them.
- Users can manage their accounts and also delete them.
- Users can create posts, create tags, like posts, comment on posts, and can gain karma.

Back-End Development:

- The server is built with Express, handles HTTP requests, and communicates with the PostgreSQL server on Supabase.

Database Integration:

- The database was designed well and PostgreSQL is used to manage it.

Collaboration:

- We all worked as a team to create the project, we used to a Trello board to track tasks, Discord for general communication, and Git to manage the code.

### Technical Requirements

- The application has both a client and server.
- The application is almost fully responsive and works across different browsers.
- The server employs Express.js.
- Supabase is combined with PostgreSQL to manage data.
- Async/Await is used with the Fetch API.
- The project demonstrates a solid understanding of database design, relationships, and SQL queries.

### Deliverables

- A live version of the webapp is not available.
- A GitHub repo containing the source code + a README.md
- The project planning is documented throughout dedicated channels in the Discord server with links to external resources like Google Docs, Trello, Figma, etc.
- Evidence of database interaction is available in the server side code through SQL snippets used with the PostgreSQL library.

## References

### Libraries & packages

- [Bcrypt](https://github.com/kelektiv/node.bcrypt.js#readme)
- [CORS](https://github.com/expressjs/cors#readme)
- [dotenv](https://github.com/motdotla/dotenv#readme)
- [Express](https://expressjs.com)
- [Nodemon](https://nodemon.io)
- [PostgreSQL](https://www.postgresql.org)
- [Supabase](https://supabase.com)
- [Vite](https://vite.dev)

### Assets

#### Fonts

- [Inter](https://fonts.google.com/specimen/Inter?query=inter)
- [Barlow Semi Condensed](https://fonts.google.com/specimen/Barlow+Semi+Condensed)

#### Icons

- [comment.svg](https://fonts.google.com/icons?icon.query=comment&selected=Material+Symbols+Outlined:chat:FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=%23000)
- [like.svg](https://fonts.google.com/icons?icon.query=heart&selected=Material+Symbols+Outlined:favorite:FILL@0;wght@400;GRAD@0;opsz@24&icon.size=24&icon.color=%23000)
- menu.svg — Self Produced
- Opinia.svg — Self Produced

#### Images

- hero-img.png — Self Produced
- hero-img-wide.png — Self Produced
