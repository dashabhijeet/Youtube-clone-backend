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

| **Module**        | **Method** | **Endpoint**                                     | **Description**                             | **Auth Required** |
|------------------|------------|--------------------------------------------------|---------------------------------------------|-------------------|
| 🔐 **Auth**        | `POST`     | `/api/v1/auth/register`                          | Register a new user                         | ❌                |
|                  | `POST`     | `/api/v1/auth/login`                             | Login and receive tokens                    | ❌                |
|                  | `GET`      | `/api/v1/auth/logout`                            | Logout and clear tokens                     | ✅                |
| 📹 **Videos**      | `POST`     | `/api/v1/videos/:id`                             | Upload video & thumbnail via form-data      | ✅                |
|                  | `GET`      | `/api/v1/videos/`                                | Get all published videos                    | ❌                |
|                  | `PATCH`    | `/api/v1/videos/:videoId`                        | Update a specific video                     | ✅                |
|                  | `DELETE`   | `/api/v1/videos/:videoId`                        | Delete a video                              | ✅                |
|                  | `PATCH`    | `/api/v1/videos/toggle/publish/:videoId`         | Toggle publish/unpublish a video            | ✅                |
| ❤️ **Likes**       | `PATCH`    | `/api/v1/likes/toggle/:videoId`                  | Like or Unlike a video                      | ✅                |
| 💬 **Comments**    | `POST`     | `/api/v1/comments/:videoId`                      | Add a comment on a video                    | ✅                |
|                  | `PATCH`    | `/api/v1/comments/:commentId`                    | Edit a comment                              | ✅                |
| 🧵 **Tweets**      | `POST`     | `/api/v1/tweets/`                                | Post a new tweet                            | ✅                |
|                  | `GET`      | `/api/v1/tweets/user/:userId`                    | Get all tweets of a user                    | ✅                |
| 🧑‍🤝‍🧑 **Subscriptions** | `PATCH`    | `/api/v1/subscriptions/toggle/:channelId`        | Subscribe or Unsubscribe from a channel     | ✅                |
|                  | `GET`      | `/api/v1/subscriptions/channel/:channelId`       | List all subscribers of a channel           | ✅                |
|                  | `GET`      | `/api/v1/subscriptions/user/:subscriberId`       | List all channels a user is subscribed to   | ✅                |
| 🕒 **Watch History** | `GET`      | `/api/v1/users/history`                          | Get current user’s watch history            | ✅                |
|                  | `PATCH`    | `/api/v1/users/history`                          | Add a video to user’s watch history         | ✅                |
| 📊 **Channel Stats** | `GET`      | `/api/v1/users/channel/stats`                   | Get total stats for the logged-in channel   | ✅                |


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


