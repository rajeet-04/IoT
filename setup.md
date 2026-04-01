# IoT Device Control Platform - Setup Guide

This guide will walk you through setting up the entire IoT platform, from the cloud database to the physical ESP32 hardware.

---

## 1. MongoDB Atlas Setup (Cloud Database)

The backend uses MongoDB as its primary data store.

1.  **Create an Account**: Sign up at [mongodb.com/atlas](https://www.mongodb.com/cloud/atlas/register).
2.  **Create a New Project**: Give it a name like `IoT-Device-Platform`.
3.  **Build a Cluster**:
    - Choose the **M0** (Free) tier.
    - Select a provider (e.g., AWS) and region (e.g., `us-east-1`).
4.  **Database Access**:
    - Create a **Database User** (e.g., `iot-admin`).
    - Choose **Password** authentication and generate a strong password. **Save this!**
5.  **Network Access**:
    - Click **Add IP Address**.
    - For initial setup and Render compatibility (Free Tier), select **Allow Access from Anywhere** (`0.0.0.0/0`).
6.  **Get Connection String**:
    - Click **Connect** -> **Drivers** -> **Node.js**.
    - Copy the connection string. It should look like:
      `mongodb+srv://<username>:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
    - **Note:** Replace `<password>` with your actual password (and remove the `< >`).

---

## 2. Backend Deployment (Render)

Render will host your Express server and Next.js dashboard.

### A. Deploy Backend
1.  Log in to [Render](https://render.com) and click **New +** -> **Blueprint**.
2.  Connect your GitHub repository.
3.  Render will find the `render.yaml` file automatically.
4.  Apply the blueprint. For the environment variables (`MONGODB_URI`, `JWT_SECRET`, etc.), provide your Atlas URI.
5.  **Important**: Ensure `FRONTEND_URL` in Render points to your Vercel URL.

### B. Deploy Frontend
1.  Click **New +** -> **Web Service**.
2.  Select your repository again.
3.  Set the following:
    - **Root Directory**: `frontend`
    - **Build Command**: `pnpm install && pnpm build`
    - **Start Command**: `pnpm start`
4.  **Environment Variable**:
    - Add `NEXT_PUBLIC_API_URL` pointing to your deployed Render backend (e.g., `https://iot-backend-abc.onrender.com`).

---

## 4. ESP32 Firmware Flashing

### A. Prerequisites
1.  Install [VS Code](https://code.visualstudio.com/).
2.  Install the **PlatformIO IDE** extension within VS Code.

### B. Configuration (`firmware/platformio.ini`)
The firmware uses environment variables for security. You can set these in your terminal before flashing or temporarily edit `platformio.ini`:

```ini
build_flags = 
    -DWIFI_SSID='"YOUR_WIFI_NAME"'
    -DWIFI_PASSWORD='"YOUR_WIFI_PASSWORD"'
    -DBACKEND_URL='"your-backend-domain.onrender.com"'
    -DDEVICE_TOKEN='"your-device-token"'
```

### C. Flashing to Hardware
1.  Connect your ESP32 to your computer via USB.
2.  In the PlatformIO sidebar, go to **Project Tasks** -> **esp32dev** -> **General** -> **Upload**.
3.  Once finished, click **Monitor** to see the system logs.

---

## 5. Final Integration: Linking Everything

Follow these steps once your Backend is live:

1.  **Register a User**: Go to your Frontend URL and create a new account.
2.  **Add a Device**:
    - Navigate to the **Devices** section.
    - Click **Register New Device**.
    - Give it a name (e.g., "Living Room Relay").
3.  **Get the Token**:
    - Copy the **Registration Token** provided in the popup. **This is shown only once!**
4.  **Final Flash**:
    - Update your `platformio.ini` with the **Token** and your **Render Backend URL** (e.g., `iot-backend-xxx.onrender.com`).
    - Flash the code to the ESP32 again.
5.  **Verify**:
    - Open the Serial Monitor. You should see `WiFi Connected!` followed by `Connected to backend!`.
    - In your Frontend dashboard, the device status should now be **Online**.

---

## Troubleshooting

-   **Atlas Connection Error**: Ensure the IP whitelist is set to `0.0.0.0/0`.
-   **ESP32 "Connecting..."**: Hold the **BOOT** button on the board while the upload starts.
-   **WebSocket Disconnected**: Double-check the `BACKEND_URL` in your build flags. Do NOT include `https://` or `/ws` in that field.
