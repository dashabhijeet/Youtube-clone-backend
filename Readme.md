# 🎬 Youtube-clone backend

This is a full-featured backend for a YouTube-like video sharing platform. It includes user authentication, video upload via Cloudinary, subscription system, likes, tweets, comments, and watch history management.

---

## 📁 Project Structure

<img width="1064" height="326" alt="image" src="https://github.com/user-attachments/assets/d522b469-8af5-4a73-8fba-a0d8d9adb847" />


---

## 🚀 Features

- 🔐 User Signup/Login with JWT
- 📽 Upload Videos & Thumbnails (Cloudinary)
- 🗂 Watch History (auto-tracking & retrieval)
- ❤️ Like/Unlike videos
- 💬 Comments & Tweets
- 🔄 Subscriptions between users (channels)
- 📊 Channel Stats (views, videos, subscribers, likes)
- 🧠 Mongoose Aggregation Pipelines for stats & watch history
- 🧪 Robust error handling & async support

---

## ⚙️ Setup Instructions

### 1. Clone the Repository

```bash```
git clone https://github.com/dashabhijeet/Youtube-clone.git
- cd Youtube-clone

---
### 2. Install Dependencies

npm install

---
### 3. Create .env File

- PORT = 8000
- CORS_ORIGIN=*
- ACCESS_TOKEN_SECRET=your-token-secret
- ACCESS_TOKEN_EXPIRY=1d
- REFRESH_TOKEN_SECRET=your-token-secret
- REFRESH_TOKEN_EXPIRY=30d
- CLOUDINARY_CLOUD_NAME=your_cloud_name
- CLOUDINARY_API_KEY=your_api_key
- CLOUDINARY_API_SECRET=your_api_secret
- MONGODB_URI=mongodb+srv://<your-db-connection-string>

---
### 4. Start the Server

npm run dev

The server runs on http://localhost:8000.

---
### 📦 API Endpoint Table

| **Module**        | **Method** | **Endpoint**                                      | **Description**                                        | **Auth Required** |
|------------------|------------|---------------------------------------------------|--------------------------------------------------------|-------------------|
| 🔐 **Auth**        | `POST`     | `/api/v1/users/register`                          | Register a new user with avatar & cover                | ❌                |
|                  | `POST`     | `/api/v1/users/login`                             | Login with credentials                                 | ❌                |
|                  | `POST`     | `/api/v1/users/logout`                            | Logout and revoke tokens                               | ✅                |
|                  | `POST`     | `/api/v1/users/refresh-token`                     | Refresh access token                                   | ❌                |
|                  | `POST`     | `/api/v1/users/change-password`                   | Change current password                                | ✅                |
|                  | `GET`      | `/api/v1/users/current-user`                      | Get current logged-in user                             | ✅                |
|                  | `PATCH`    | `/api/v1/users/update-account`                    | Update account details                                 | ✅                |
|                  | `PATCH`    | `/api/v1/users/avatar`                            | Update avatar                                          | ✅                |
|                  | `PATCH`    | `/api/v1/users/cover-image`                       | Update cover image                                     | ✅                |
|                  | `GET`      | `/api/v1/users/c/:username`                       | Get user channel profile by username                   | ✅                |
|                  | `GET`      | `/api/v1/users/history`                           | Get user's watch history                               | ✅                |
|                  | `POST`     | `/api/v1/users/history/:videoId`                  | Add video to watch history                             | ✅                |

| 📹 **Videos**      | `GET`      | `/api/v1/videos/`                                 | Get all published videos                               | ✅                |
|                  | `POST`     | `/api/v1/videos/:id`                              | Upload a new video with form-data                      | ✅                |
|                  | `GET`      | `/api/v1/videos/:videoId`                         | Get video by ID                                        | ✅                |
|                  | `PATCH`    | `/api/v1/videos/:videoId`                         | Update video (form-data support)                       | ✅                |
|                  | `DELETE`   | `/api/v1/videos/:videoId`                         | Delete a video                                         | ✅                |
|                  | `PATCH`    | `/api/v1/videos/toggle/publish/:videoId`          | Toggle publish/unpublish status                        | ✅                |

| 🧑‍🤝‍🧑 **Subscriptions** | `POST`     | `/api/v1/subscriptions/c/:channelId`              | Subscribe/Unsubscribe to a channel                    | ✅                |
|                  | `GET`      | `/api/v1/subscriptions/c/:channelId`              | Get list of channels a user is subscribed to          | ✅                |
|                  | `GET`      | `/api/v1/subscriptions/u/:subscriberId`           | Get all subscribers of a channel                      | ✅                |

| ❤️ **Likes**       | `POST`     | `/api/v1/likes/toggle/v/:videoId`                 | Toggle like/unlike for a video                        | ✅                |
|                  | `POST`     | `/api/v1/likes/toggle/c/:commentId`               | Toggle like/unlike for a comment                      | ✅                |
|                  | `POST`     | `/api/v1/likes/toggle/t/:tweetId`                 | Toggle like/unlike for a tweet                        | ✅                |
|                  | `GET`      | `/api/v1/likes/videos`                            | Get all liked videos                                  | ✅                |

| 💬 **Tweets**      | `POST`     | `/api/v1/tweets/`                                 | Post a tweet                                          | ✅                |
|                  | `GET`      | `/api/v1/tweets/user/:userId`                     | Get all tweets of a user                              | ✅                |
|                  | `PATCH`    | `/api/v1/tweets/:tweetId`                         | Update a tweet                                        | ✅                |
|                  | `DELETE`   | `/api/v1/tweets/:tweetId`                         | Delete a tweet                                        | ✅                |

| 📺 **Playlists**   | `POST`     | `/api/v1/playlist/`                              | Create a new playlist                                 | ✅                |
|                  | `GET`      | `/api/v1/playlist/:playlistId`                   | Get playlist by ID                                    | ✅                |
|                  | `PATCH`    | `/api/v1/playlist/:playlistId`                   | Update playlist details                               | ✅                |
|                  | `DELETE`   | `/api/v1/playlist/:playlistId`                   | Delete playlist                                       | ✅                |
|                  | `PATCH`    | `/api/v1/playlist/add/:videoId/:playlistId`      | Add a video to playlist                               | ✅                |
|                  | `PATCH`    | `/api/v1/playlist/remove/:videoId/:playlistId`   | Remove video from playlist                            | ✅                |
|                  | `GET`      | `/api/v1/playlist/user/:userId`                  | Get playlists of a user                               | ✅                |

| 📊 **Dashboard**   | `GET`      | `/api/v1/dashboard/stats`                             | Get dashboard stats: views, videos, likes, subscribers| ✅                |
|                  | `GET`      | `/api/v1/dashboard/videos`                            | Get videos uploaded by current user                   | ✅                |

| 🔧 **Misc**        | `GET`      | `/api/v1/healthcheck/`                                  | Health check route                                    | ❌                |



### 📷 Upload Notes
Video and thumbnail uploads use Cloudinary. Use multipart/form-data for these routes:
   - videoFile: for the video
   - thumbnail: for the thumbnail
   - title, description: as plain text fields
  
---
### 📌 Tech Stack
    - Node.js + Express
    - MongoDB + Mongoose
    - Cloudinary (Media Storage)
    - JWT (Authentication)
    - Multer (File Upload Handling)
    - Mongoose Aggregation (Analytics)

---
# 🙌 Contributing
Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---
# 📄 License
 MIT

---
# 🧑‍💻 Author - 
     Abhijeet Dash
---

Let me know if you'd like a **Postman collection** to go with this or need a **frontend setup guide** too.


