import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/shared/AuthProvider";
import ToastProvider from "../components/shared/ToastProvider";
import NetworkErrorHandler from "../components/shared/NetworkErrorHandler";
import ErrorBoundary from "../components/shared/ErrorBoundary";

// Initialize global error handler
import "../lib/globalErrorHandler";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "QR Attendance System",
  description: "A modern attendance tracking system using QR codes",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary
          title="Application Error"
          message="The application encountered an unexpected error. Please refresh the page or try again."
        >
          <ToastProvider>
            <NetworkErrorHandler>
              <AuthProvider>
                {children}
              </AuthProvider>
            </NetworkErrorHandler>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
