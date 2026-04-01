import Link from 'next/link';

export default function HomePage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="text-center">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">
                    IoT Device Control
                </h1>
                <p className="text-lg text-gray-600 mb-8">
                    Control your ESP32-connected relays from anywhere
                </p>
                <div className="flex gap-4 justify-center">
                    <Link
                        href="/login"
                        className="btn btn-primary px-8 py-3 text-lg"
                    >
                        Sign In
                    </Link>
                    <Link
                        href="/register"
                        className="btn btn-secondary px-8 py-3 text-lg"
                    >
                        Create Account
                    </Link>
                </div>
            </div>
        </div>
    );
}
