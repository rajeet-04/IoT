import LoginForm from '@/components/auth/login-form';

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Sign in to your account
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Control your IoT devices from anywhere
                        </p>
                    </div>

                    <LoginForm />
                </div>
            </div>
        </div>
    );
}
