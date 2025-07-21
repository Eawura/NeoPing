import { Slot } from "expo-router";
import { BookmarkProvider } from "../components/BookmarkContext";
import { NewsProvider } from "../components/NewsContext";
import { PostProvider } from "../components/PostContext";
import { AppProvider } from "../components/ThemeContext";
import { AuthProvider } from "../context/AuthContext"; // ✅ Add this

export default function RootLayout() {
  return (
    <NewsProvider>
      <AppProvider>
        <BookmarkProvider>
          <PostProvider>
            <AuthProvider>
              {" "}
              {/* ✅ Add this wrapper */}
              <Slot />
            </AuthProvider>
          </PostProvider>
        </BookmarkProvider>
      </AppProvider>
    </NewsProvider>
  );
}
