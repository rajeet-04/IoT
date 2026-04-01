import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
    title: 'IoT Device Control',
    description: 'Control your ESP32-connected relays from anywhere',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="antialiased">
                {children}
            </body>
        </html>
    );
}
