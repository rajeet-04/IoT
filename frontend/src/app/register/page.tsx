import RegisterForm from '@/components/auth/register-form';

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-xl shadow-lg p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-gray-900">
                            Create your account
                        </h1>
                        <p className="text-gray-600 mt-2">
                            Start controlling your IoT devices today
                        </p>
                    </div>

                    <RegisterForm />
                </div>
            </div>
        </div>
    );
}
