
/**
 * FIREBASE INTEGRATION SERVICE
 * 
 * To activate:
 * 1. Go to console.firebase.google.com
 * 2. Create a project
 * 3. Add a "Web App"
 * 4. Paste your config here
 */

export const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// This is a mock/placeholder service that we will fill 
// once you have your Firebase project set up.
export const firebaseService = {
  async uploadImage(base64: string): Promise<string> {
    console.log("Cloud: Uploading image to Storage...");
    // Simulate network delay
    await new Promise(r => setTimeout(r, 1000));
    return "https://placeholder.com/receipt-image.jpg";
  },

  async saveReceipt(data: any): Promise<void> {
    console.log("Cloud: Saving analysis to Firestore...");
    await new Promise(r => setTimeout(r, 500));
  },

  async fetchHistory(): Promise<any[]> {
    return [];
  }
};
