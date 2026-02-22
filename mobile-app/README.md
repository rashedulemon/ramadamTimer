# 📱 Bangladesh Ramadan 2026 Mobile App

This is a native Android/iOS version of the Ramadan Timer, built with **Expo (React Native)**. It features a premium design, live countdowns, and a robust notification system for Sehri alarms and Iftar reminders.

## 🚀 How to Run on Your Phone (No PC Setup Required!)

### 1. Install Expo Go
Download the **Expo Go** app on your physical phone:
- [Google Play Store (Android)](https://play.google.com/store/apps/details?id=host.exp.exponent)
- [Apple App Store (iOS)](https://apps.apple.com/us/app/expo-go/id982107779)

### 2. Start the Development Server
In your computer's terminal, navigate to this folder and run:
```bash
cd mobile-app
npm install
npx expo start
```
*Note: If you don't have Node.js installed on your PC, you will need it for this step.*

### 3. Scan the QR Code
- A QR code will appear in your terminal.
- **Android**: Open the **Expo Go** app and tap "Scan QR Code".
- **iOS**: Open your **Camera app** and scan the QR code.

The app will load instantly on your phone!

## ✨ Key Features

- **📍 Nationwide Data**: Includes all 64 districts of Bangladesh.
- **⏰ Smart Alarms**: 
  - **Sehri**: Automatically schedules a wake-up alarm 20 minutes before Sehri ends.
  - **Iftar**: Automatically schedules a reminder 5 minutes before Iftar.
- **🌙 Two Themes**: Beautiful dark and light modes that match the web version.
- **💾 Offline Support**: Once the schedule is loaded, the app (and the alarms) will work even without an internet connection.

## 📂 Project Structure
- `App.js`: Main application UI and core logic.
- `logic/notifications.js`: Logic for scheduling Android/iOS system alarms.
- `data/schedule_data.json`: The complete 1447H / 2026 Ramadan database.
- `constants/Colors.js`: The "Green & Gold" design system tokens.
